import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { useAuth } from './useAuth';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface FertReminder {
  dayIndex: number;   // 0=Mon 1=Wed 2=Fri 3=Sun
  dayLabel: string;
  weekday:  number;   // Expo: 1=Sun 2=Mon … 7=Sat
  hour:     number;
  minute:   number;
  enabled:  boolean;
  notifIds: string[];
}

const DAY_META: Pick<FertReminder, 'dayIndex' | 'dayLabel' | 'weekday'>[] = [
  { dayIndex: 0, dayLabel: 'Lunes',     weekday: 2 },
  { dayIndex: 1, dayLabel: 'Miércoles', weekday: 4 },
  { dayIndex: 2, dayLabel: 'Viernes',   weekday: 6 },
  { dayIndex: 3, dayLabel: 'Domingo',   weekday: 1 },
];

const DEFAULT_REMINDERS: FertReminder[] = DAY_META.map(d => ({
  ...d, hour: 9, minute: 0, enabled: false, notifIds: [],
}));

const localKey  = (uid: string) => `@aquamanager_fert_reminders_${uid}`;
const GUEST_KEY = '@aquamanager_fert_reminders_guest';

// ── Notification helpers ──────────────────────────────────────────────────────
async function requestPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const { status: next } = await Notifications.requestPermissionsAsync();
    return next === 'granted';
  } catch (e) { console.warn('[FertReminders] Permission check failed:', e); return false; }
}

async function cancelIds(ids: string[]) {
  for (const id of ids) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch (e) { console.warn('[FertReminders] Op failed:', e); }
  }
}

async function scheduleWeekly(reminder: FertReminder, label: string): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  if (!(await requestPermission())) return [];

  // Single recurring weekly notification (no longer limited to 12 weeks)
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌿 Hora de fertilizar',
        body:  `Recuerda abonar tu acuario hoy (${label})`,
        data:  { type: 'fert_reminder', dayIndex: reminder.dayIndex },
      },
      trigger: {
        weekday: reminder.weekday,
        hour:    reminder.hour,
        minute:  reminder.minute,
        repeats: true,
      } as any,
    });
    return [id];
  } catch (e) { console.warn('[FertReminders] Schedule failed:', e); return []; }
}

// ── Supabase mappers ──────────────────────────────────────────────────────────
function rowToReminder(row: any): FertReminder {
  return {
    dayIndex: row.day_index, dayLabel: row.day_label, weekday: row.weekday,
    hour: row.hour, minute: row.minute, enabled: row.enabled,
    notifIds: row.notif_ids ?? [],
  };
}

function reminderToRow(r: FertReminder, uid: string) {
  return {
    user_id:    uid,
    day_index:  r.dayIndex,
    day_label:  r.dayLabel,
    weekday:    r.weekday,
    hour:       r.hour,
    minute:     r.minute,
    enabled:    r.enabled,
    notif_ids:  r.notifIds,
    updated_at: new Date().toISOString(),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFertReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<FertReminder[]>(DEFAULT_REMINDERS);

  const getLocalKey = useCallback(
    () => user?.id ? localKey(user.id) : GUEST_KEY,
    [user?.id],
  );

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!IS_DEMO_MODE && user) {
        try {
          const { data, error } = await supabase
            .from('fert_reminders').select('*').eq('user_id', user.id);
          if (!error && data && data.length > 0) {
            setReminders(DEFAULT_REMINDERS.map(def => {
              const found = (data as any[]).find(r => r.day_index === def.dayIndex);
              return found ? rowToReminder(found) : def;
            }));
            return;
          }
        } catch (e) { console.warn('[FertReminders] Supabase load failed:', e); }
      }
      // AsyncStorage fallback
      try {
        const raw = await AsyncStorage.getItem(getLocalKey());
        if (!raw) return;
        const saved: FertReminder[] = JSON.parse(raw);
        setReminders(DEFAULT_REMINDERS.map(def => {
          const found = saved.find(s => s.dayIndex === def.dayIndex);
          return found ? { ...def, ...found } : def;
        }));
      } catch (e) { console.warn('[FertReminders] Op failed:', e); }
    };
    load();
  }, [user?.id, getLocalKey]);

  // ── Persist ───────────────────────────────────────────────────────────────
  const persist = useCallback(async (list: FertReminder[]) => {
    setReminders(list);
    // Siempre cache local
    try { await AsyncStorage.setItem(getLocalKey(), JSON.stringify(list)); } catch (e) { console.warn('[FertReminders] Op failed:', e); }
    // Supabase
    if (!IS_DEMO_MODE && user) {
      try {
        await supabase.from('fert_reminders').upsert(
          list.map(r => reminderToRow(r, user.id)),
          { onConflict: 'user_id,day_index' },
        );
      } catch (e) { console.warn('[FertReminders] Op failed:', e); }
    }
  }, [getLocalKey, user]);

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggleReminder = useCallback(async (dayIndex: number) => {
    setReminders(prev => {
      const current = prev.find(r => r.dayIndex === dayIndex);
      if (!current) return prev;
      const turningOn = !current.enabled;
      const updated = prev.map(r =>
        r.dayIndex === dayIndex ? { ...r, enabled: turningOn, notifIds: turningOn ? r.notifIds : [] } : r
      );
      if (turningOn) {
        const label = DAY_META.find(d => d.dayIndex === dayIndex)?.dayLabel ?? '';
        scheduleWeekly(current, label).then(ids => {
          persist(updated.map(r => r.dayIndex === dayIndex ? { ...r, notifIds: ids } : r));
        });
        return updated;
      } else {
        cancelIds(current.notifIds);
        persist(updated);
        return updated;
      }
    });
  }, [persist]);

  // ── Set time ──────────────────────────────────────────────────────────────
  const setTime = useCallback(async (dayIndex: number, hour: number, minute: number) => {
    setReminders(prev => {
      const current = prev.find(r => r.dayIndex === dayIndex);
      if (!current) return prev;
      const updated = prev.map(r => r.dayIndex === dayIndex ? { ...r, hour, minute } : r);
      if (current.enabled) {
        cancelIds(current.notifIds);
        const label = DAY_META.find(d => d.dayIndex === dayIndex)?.dayLabel ?? '';
        scheduleWeekly({ ...current, hour, minute }, label).then(ids => {
          persist(updated.map(r => r.dayIndex === dayIndex ? { ...r, notifIds: ids } : r));
        });
      } else {
        persist(updated);
      }
      return updated;
    });
  }, [persist]);

  return { reminders, toggleReminder, setTime, pushAvailable: Platform.OS !== 'web' };
}
