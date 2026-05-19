/**
 * useFishHistory (#19) — Audit log of fish added/removed from each aquarium.
 * Useful to track when fish died, were sold, or rehomed.
 *
 * Required Supabase table:
 *   CREATE TABLE public.fish_history (
 *     id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *     aquarium_id  uuid NOT NULL,
 *     fish_id      text NOT NULL,
 *     fish_name    text NOT NULL,
 *     action       text NOT NULL CHECK (action IN ('added','removed')),
 *     reason       text,
 *     qty          int DEFAULT 1,
 *     created_at   timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE fish_history ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "users own fish_history" ON fish_history FOR ALL TO authenticated
 *     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { useAuth } from './useAuth';

export type FishHistoryAction = 'added' | 'removed';
export type RemovalReason = 'death' | 'sale' | 'gift' | 'rehome' | 'other';

export interface FishHistoryEntry {
  id:          string;
  aquarium_id: string;
  fish_id:     string;
  fish_name:   string;
  action:      FishHistoryAction;
  reason?:     RemovalReason | null;
  qty:         number;
  created_at:  string;
}

interface Ctx {
  history: FishHistoryEntry[];
  loading: boolean;
  log:     (entry: Omit<FishHistoryEntry, 'id' | 'created_at'>) => Promise<void>;
  forAquarium: (aquariumId: string) => FishHistoryEntry[];
  remove:  (entryId: string) => Promise<void>;
}

export const REMOVAL_REASON_LABELS: Record<RemovalReason, string> = {
  death:   '💀 Muerte',
  sale:    '💰 Venta',
  gift:    '🎁 Regalo',
  rehome:  '🏠 Reubicación',
  other:   '❓ Otro motivo',
};

const FishHistoryCtx = createContext<Ctx | undefined>(undefined);
const localKey = (uid: string) => `@aquamanager_fish_history_${uid}`;

export function FishHistoryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<FishHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setHistory([]); setLoading(false); return; }
    setLoading(true);
    (async () => {
      if (!IS_DEMO_MODE) {
        try {
          const { data, error } = await supabase
            .from('fish_history').select('*')
            .eq('user_id', user.id).order('created_at', { ascending: false });
          if (!error && data) {
            setHistory(data); setLoading(false); return;
          }
        } catch (e) { console.warn('[FishHistory] Supabase load failed:', e); }
      }
      try {
        const raw = await AsyncStorage.getItem(localKey(user.id));
        setHistory(raw ? JSON.parse(raw) : []);
      } catch (e) { console.warn('[FishHistory] Local load failed:', e); setHistory([]); }
      setLoading(false);
    })();
  }, [user?.id]);

  const persistLocal = useCallback(async (next: FishHistoryEntry[]) => {
    setHistory(next);
    if (user) {
      try { await AsyncStorage.setItem(localKey(user.id), JSON.stringify(next)); } catch (e) { console.warn('[FishHistory] Local persist failed:', e); }
    }
  }, [user]);

  const log = useCallback(async (entry: Omit<FishHistoryEntry, 'id' | 'created_at'>) => {
    if (!user) return;
    const newEntry: FishHistoryEntry = {
      ...entry,
      id: `h_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    if (!IS_DEMO_MODE) {
      try {
        const { data, error } = await supabase
          .from('fish_history').insert({
            user_id: user.id, aquarium_id: entry.aquarium_id,
            fish_id: entry.fish_id, fish_name: entry.fish_name,
            action: entry.action, reason: entry.reason, qty: entry.qty,
          }).select().single();
        if (!error && data) { setHistory(prev => [data, ...prev]); return; }
      } catch (e) { console.warn('[FishHistory] Supabase insert failed:', e); }
    }
    await persistLocal([newEntry, ...history]);
  }, [user, history, persistLocal]);

  const remove = useCallback(async (entryId: string) => {
    if (!user) return;
    if (!IS_DEMO_MODE) {
      try { await supabase.from('fish_history').delete().eq('id', entryId); } catch (e) { console.warn('[FishHistory] Supabase delete failed:', e); }
    }
    await persistLocal(history.filter(h => h.id !== entryId));
  }, [user, history, persistLocal]);

  const forAquarium = useCallback((aqId: string) => history.filter(h => h.aquarium_id === aqId), [history]);

  return (
    <FishHistoryCtx.Provider value={{ history, loading, log, forAquarium, remove }}>
      {children}
    </FishHistoryCtx.Provider>
  );
}

export function useFishHistory(): Ctx {
  const ctx = useContext(FishHistoryCtx);
  if (!ctx) throw new Error('useFishHistory must be used within FishHistoryProvider');
  return ctx;
}
