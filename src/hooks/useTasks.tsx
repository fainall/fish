import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { AquariumTask, TaskType, RecurrenceType } from '../types';
import { useAuth } from './useAuth';

const localKey = (uid: string) => `@aquamanager_tasks_${uid}`;

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch { /* expo-notifications not available — ignore */ }

interface TasksContextType {
  tasks: AquariumTask[];
  tasksFor:      (aquariumId: string) => AquariumTask[];
  pendingTasks:  AquariumTask[];
  overdueCount:  number;
  addTask:       (task: Omit<AquariumTask, 'id' | 'completed' | 'completed_at'>) => Promise<void>;
  toggleComplete:(id: string) => Promise<void>;
  deleteTask:    (id: string) => Promise<void>;
  updateTask:    (id: string, data: Partial<AquariumTask>) => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

// ── Notification helpers ──────────────────────────────────────────────────────
async function scheduleNotif(task: AquariumTask): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: s } = await Notifications.requestPermissionsAsync();
      if (s !== 'granted') return undefined;
    }
    const due = new Date(task.due_date);
    if (due <= new Date()) return undefined;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `🐠 Aquaria: ${task.title}`,
        body:  task.description ?? 'Tienes una tarea pendiente.',
        data:  { taskId: task.id },
      },
      trigger: { date: due } as any,
    });
  } catch { return undefined; }
}

async function cancelNotif(id?: string) {
  if (id) try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* ignore */ }
}

function nextDue(current: string, rec: RecurrenceType): string | null {
  const d = new Date(current);
  switch (rec) {
    case 'daily':    d.setDate(d.getDate() + 1);    break;
    case 'weekly':   d.setDate(d.getDate() + 7);    break;
    case 'biweekly': d.setDate(d.getDate() + 14);   break;
    case 'monthly':  d.setMonth(d.getMonth() + 1);  break;
    default: return null;
  }
  return d.toISOString();
}

// ── Supabase row → AquariumTask ────────────────────────────────────────────────
function rowToTask(r: any): AquariumTask {
  return {
    id: r.id, aquarium_id: r.aquarium_id, type: r.type, title: r.title,
    description: r.description, due_date: r.due_date, recurrence: r.recurrence,
    completed: r.completed, completed_at: r.completed_at,
  };
}

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<AquariumTask[]>([]);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setTasks([]); return; }

    const load = async () => {
      if (!IS_DEMO_MODE) {
        try {
          const { data, error } = await supabase
            .from('aquarium_tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });
          if (!error && data) { setTasks(data.map(rowToTask)); return; }
        } catch { /* fallback */ }
      }
      try {
        const raw = await AsyncStorage.getItem(localKey(user.id));
        if (raw) setTasks(JSON.parse(raw));
      } catch { /* ignore */ }
    };

    load();
  }, [user?.id]);

  const persistLocal = async (list: AquariumTask[]) => {
    setTasks(list);
    if (user) {
      try { await AsyncStorage.setItem(localKey(user.id), JSON.stringify(list)); } catch { /* ignore */ }
    }
  };

  // ── Add ───────────────────────────────────────────────────────────────────
  const addTask = useCallback(async (task: Omit<AquariumTask, 'id' | 'completed' | 'completed_at'>) => {
    const partial: AquariumTask = { ...task, id: `task-${Date.now()}`, completed: false };
    const notifId = await scheduleNotif(partial);
    if (notifId) partial.notification_id = notifId;

    if (!IS_DEMO_MODE && user) {
      try {
        const { data, error } = await supabase
          .from('aquarium_tasks')
          .insert({ ...task, user_id: user.id, completed: false, notification_id: notifId ?? null })
          .select()
          .single();
        if (!error && data) {
          const inserted = rowToTask(data);
          // Ensure notification_id is preserved even if column doesn't exist server-side
          if (notifId && !inserted.notification_id) inserted.notification_id = notifId;
          setTasks(prev => [...prev, inserted]);
          return;
        }
      } catch { /* fallback */ }
    }
    await persistLocal([...tasks, partial]);
  }, [tasks, user]);

  // ── Toggle complete ───────────────────────────────────────────────────────
  const toggleComplete = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (!task.completed && task.recurrence !== 'none') {
      const updatedCurrent: AquariumTask = {
        ...task, completed: true, completed_at: new Date().toISOString(),
      };
      await cancelNotif(task.notification_id);

      let nextList = tasks.map(t => t.id === id ? updatedCurrent : t);
      const nextDate = nextDue(task.due_date, task.recurrence);
      if (nextDate) {
        const nextTask: AquariumTask = {
          ...task, id: `task-${Date.now()}`, due_date: nextDate,
          completed: false, completed_at: undefined, notification_id: undefined,
        };
        const notifId = await scheduleNotif(nextTask);
        if (notifId) nextTask.notification_id = notifId;
        nextList = [...nextList, nextTask];

        if (!IS_DEMO_MODE && user) {
          try {
            await supabase.from('aquarium_tasks')
              .update({ completed: true, completed_at: updatedCurrent.completed_at })
              .eq('id', id);
            await supabase.from('aquarium_tasks')
              .insert({ ...nextTask, user_id: user.id });
          } catch { /* ignore */ }
        }
      }
      await persistLocal(nextList);
    } else {
      const now = new Date().toISOString();
      const updated = tasks.map(t => t.id !== id ? t : {
        ...t, completed: !t.completed,
        completed_at: !t.completed ? now : undefined,
      });
      if (!task.completed) await cancelNotif(task.notification_id);

      if (!IS_DEMO_MODE) {
        try {
          const t = updated.find(t => t.id === id)!;
          await supabase.from('aquarium_tasks')
            .update({ completed: t.completed, completed_at: t.completed_at })
            .eq('id', id);
        } catch { /* ignore */ }
      }
      await persistLocal(updated);
    }
  }, [tasks, user]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    await cancelNotif(task?.notification_id);
    if (!IS_DEMO_MODE) {
      try { await supabase.from('aquarium_tasks').delete().eq('id', id); } catch { /* ignore */ }
    }
    await persistLocal(tasks.filter(t => t.id !== id));
  }, [tasks, user]);

  // ── Update ────────────────────────────────────────────────────────────────
  const updateTask = useCallback(async (id: string, data: Partial<AquariumTask>) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await cancelNotif(task.notification_id);
    const updated = { ...task, ...data };
    const notifId = await scheduleNotif(updated);
    if (notifId) updated.notification_id = notifId;

    if (!IS_DEMO_MODE) {
      try { await supabase.from('aquarium_tasks').update(data).eq('id', id); } catch { /* ignore */ }
    }
    await persistLocal(tasks.map(t => t.id === id ? updated : t));
  }, [tasks, user]);

  const tasksFor = useCallback((aquariumId: string) =>
    tasks.filter(t => t.aquarium_id === aquariumId)
         .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [tasks]);

  const pendingTasks = useMemo(
    () => tasks.filter(t => !t.completed)
               .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [tasks]);
  const overdueCount = useMemo(() => {
    const now = Date.now();
    return pendingTasks.filter(t => new Date(t.due_date).getTime() < now).length;
  }, [pendingTasks]);

  return (
    <TasksContext.Provider value={{
      tasks, tasksFor, pendingTasks, overdueCount,
      addTask, toggleComplete, deleteTask, updateTask,
    }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks(): TasksContextType {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be within TasksProvider');
  return ctx;
}

export const TASK_TYPE_INFO: Record<TaskType, { icon: string; label: string; color: string }> = {
  water_change:    { icon: 'water',          label: 'Cambio de agua',   color: '#29b6f6' },
  feeding:         { icon: 'fish',           label: 'Alimentación',     color: '#66bb6a' },
  filter_clean:    { icon: 'settings',       label: 'Filtro',           color: '#ffa726' },
  fertilizer:      { icon: 'leaf',           label: 'Fertilizante',     color: '#26a69a' },
  medication:      { icon: 'medkit',         label: 'Medicación',       color: '#ef5350' },
  parameter_check: { icon: 'thermometer',    label: 'Medir parámetros', color: '#ab47bc' },
  custom:          { icon: 'create-outline', label: 'Personalizada',    color: '#78909c' },
};

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'Sin repetición', daily: 'Diaria',
  weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual',
};
