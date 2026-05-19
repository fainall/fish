import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { useAuth } from './useAuth';
import { Fish, BreedingStatus } from '../types';

export type LogType = 'water_change' | 'feeding' | 'parameter' | 'behavior' | 'note';

export interface BreedingLog {
  id: string; type: LogType; label: string; value?: string; timestamp: string;
}

export interface BreedingCheckItem {
  id: string; label: string; description: string;
  category: 'water' | 'tank' | 'feeding' | 'behavior' | 'care';
  completed: boolean; completed_at?: string;
}

export interface BreedingGoal {
  id: string; fish: Fish; status: BreedingStatus;
  started_at: string; notes: string;
  checklist: BreedingCheckItem[]; logs: BreedingLog[];
  last_temp?: number; last_ph?: number; last_gh?: number;
}

interface BreedingContextType {
  goals: BreedingGoal[];
  loading: boolean;
  addGoal:    (goal: BreedingGoal) => Promise<void>;
  updateGoal: (id: string, updates: Partial<BreedingGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

const BreedingContext = createContext<BreedingContextType | undefined>(undefined);
const localKey = (uid: string) => `@aquamanager_breeding_${uid}`;

// ── Supabase rows → BreedingGoal ──────────────────────────────────────────────
function rowToGoal(row: any, fishObj: Fish): BreedingGoal {
  return {
    id: row.id, fish: fishObj, status: row.status,
    started_at: row.started_at, notes: row.notes ?? '',
    checklist: (row.breeding_checklist ?? []).map((c: any): BreedingCheckItem => ({
      id: c.id, label: c.label, description: c.description,
      category: c.category, completed: c.completed, completed_at: c.completed_at,
    })),
    logs: (row.breeding_logs ?? []).map((l: any): BreedingLog => ({
      id: l.id, type: l.type, label: l.label, value: l.value, timestamp: l.timestamp,
    })),
    last_temp: row.last_temp, last_ph: row.last_ph, last_gh: row.last_gh,
  };
}

export function BreedingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [goals, setGoals]   = useState<BreedingGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setGoals([]); setLoading(false); return; }
    setLoading(true);

    const load = async () => {
      if (!IS_DEMO_MODE) {
        try {
          const { data, error } = await supabase
            .from('breeding_goals')
            .select('*, breeding_checklist(*), breeding_logs(*)')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false });
          if (!error && data) {
            // fish object comes from local DB (fish_id = local ID)
            // map it in the same way as AsyncStorage version
            const raw = await AsyncStorage.getItem(localKey(user.id));
            const cached: BreedingGoal[] = raw ? JSON.parse(raw) : [];
            const fishMap = Object.fromEntries(cached.map(g => [g.id, g.fish]));
            // Safe fallback: minimal Fish object that won't crash UI reads
            const safeFish = (fishId: string): Fish => ({
              id: fishId, common_name: 'Especie desconocida', scientific_name: '',
              family: '', origin: '', adult_size_cm: 0,
              temp_min: 22, temp_max: 28, ph_min: 6.5, ph_max: 7.5,
              gh_min: 5, gh_max: 15, water_level: 'middle', aggression: 2,
              min_tank_liters: 0, diet: '', description: '',
              is_schooling: false, water_type: 'freshwater', tags: [],
            } as any);
            const list = data.map(row => rowToGoal(row, fishMap[row.id] ?? safeFish(row.fish_id)));
            setGoals(list); setLoading(false); return;
          }
        } catch (e) { console.warn('[Breeding] Supabase op failed:', e); }
      }
      try {
        const raw = await AsyncStorage.getItem(localKey(user.id));
        setGoals(raw ? JSON.parse(raw) : []);
      } catch (e) { console.warn('[Breeding] Local load failed:', e); setGoals([]); }
      setLoading(false);
    };

    load();
  }, [user?.id]);

  const persistLocal = useCallback(async (list: BreedingGoal[]) => {
    setGoals(list);
    if (user) {
      try { await AsyncStorage.setItem(localKey(user.id), JSON.stringify(list)); } catch (e) { console.warn('[Breeding] Op failed:', e); }
    }
  }, [user]);

  // ── Add ───────────────────────────────────────────────────────────────────
  const addGoal = useCallback(async (goal: BreedingGoal) => {
    if (!IS_DEMO_MODE && user) {
      try {
        // Insert goal
        const { data: gRow, error: gErr } = await supabase.from('breeding_goals').insert({
          id: goal.id, user_id: user.id, fish_id: goal.fish.id,
          status: goal.status, started_at: goal.started_at, notes: goal.notes,
          last_temp: goal.last_temp, last_ph: goal.last_ph, last_gh: goal.last_gh,
        }).select().single();
        if (!gErr && gRow) {
          // Insert checklist items
          if (goal.checklist.length) {
            await supabase.from('breeding_checklist').insert(
              goal.checklist.map(c => ({ ...c, breeding_goal_id: gRow.id }))
            );
          }
        }
      } catch (e) { console.warn('[Breeding] Supabase addGoal insert failed:', e); }
    }
    await persistLocal([goal, ...goals]);
  }, [goals, persistLocal, user]);

  // ── Update ────────────────────────────────────────────────────────────────
  const updateGoal = useCallback(async (id: string, updates: Partial<BreedingGoal>) => {
    if (!IS_DEMO_MODE) {
      try {
        const { checklist, logs, fish: _fish, ...dbUpdates } = updates as any;
        if (Object.keys(dbUpdates).length) {
          await supabase.from('breeding_goals').update(dbUpdates).eq('id', id);
        }
        if (checklist) {
          await supabase.from('breeding_checklist').delete().eq('breeding_goal_id', id);
          if (checklist.length) {
            await supabase.from('breeding_checklist').insert(
              checklist.map((c: any) => ({ ...c, breeding_goal_id: id }))
            );
          }
        }
        if (logs) {
          await supabase.from('breeding_logs').delete().eq('breeding_goal_id', id);
          if (logs.length) {
            await supabase.from('breeding_logs').insert(
              logs.map((l: any) => ({ ...l, breeding_goal_id: id }))
            );
          }
        }
      } catch (e) { console.warn('[Breeding] Op failed:', e); }
    }
    await persistLocal(goals.map(g => g.id === id ? { ...g, ...updates } : g));
  }, [goals, persistLocal, user]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteGoal = useCallback(async (id: string) => {
    if (!IS_DEMO_MODE) {
      try { await supabase.from('breeding_goals').delete().eq('id', id); } catch (e) { console.warn('[Breeding] Op failed:', e); }
    }
    await persistLocal(goals.filter(g => g.id !== id));
  }, [goals, persistLocal, user]);

  return (
    <BreedingContext.Provider value={{ goals, loading, addGoal, updateGoal, deleteGoal }}>
      {children}
    </BreedingContext.Provider>
  );
}

export function useBreeding(): BreedingContextType {
  const ctx = useContext(BreedingContext);
  if (!ctx) throw new Error('useBreeding must be within BreedingProvider');
  return ctx;
}
