import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { AquariumEntry, AquariumFishEntry, WaterType, AquariumStyle } from '../types';
import { useAuth } from './useAuth';

const localKey = (uid: string) => `@aquamanager_aquariums_${uid}`;

interface AquariumsContextType {
  aquariums: AquariumEntry[];
  loading: boolean;
  selectedId: string | null;
  selectedAquarium: AquariumEntry | null;
  selectAquarium:      (id: string) => void;
  addAquarium:         (data: Omit<AquariumEntry, 'id' | 'created_at' | 'fish'>) => Promise<AquariumEntry>;
  updateAquarium:      (id: string, data: Partial<AquariumEntry>) => Promise<void>;
  deleteAquarium:      (id: string) => Promise<void>;
  clearAllAquariums:   () => Promise<void>;
  setFishQty:          (aquariumId: string, fishId: string, qty: number) => Promise<void>;
  removeFish:          (aquariumId: string, fishId: string) => Promise<void>;
}

const AquariumsContext = createContext<AquariumsContextType | undefined>(undefined);

// ── Supabase row → AquariumEntry ──────────────────────────────────────────────
function rowToEntry(row: any): AquariumEntry {
  return {
    id:             row.id,
    name:           row.name,
    volume_liters:  row.volume_liters,
    length_cm:      row.length_cm,
    width_cm:       row.width_cm,
    height_cm:      row.height_cm,
    water_type:     row.water_type,
    aquarium_style: row.aquarium_style,
    description:    row.description,
    displacement:   row.displacement ?? undefined,
    created_at:     row.created_at,
    fish: (row.aquarium_fish ?? []).map((af: any) => ({
      fishId: af.fish_id,
      qty:    af.quantity,
    })),
  };
}

export function AquariumsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [aquariums, setAquariums] = useState<AquariumEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  // ── Sync local aquariums up to Supabase (one-time recovery) ─────────────
  const syncLocalToSupabase = async (list: AquariumEntry[], userId: string) => {
    for (const aq of list) {
      try {
        const { fish, ...data } = aq;
        await supabase.from('aquariums')
          .upsert({ ...data, user_id: userId }, { onConflict: 'id' });
        // Sync fish
        for (const f of fish) {
          await supabase.from('aquarium_fish')
            .upsert(
              { aquarium_id: aq.id, fish_id: f.fishId, quantity: f.qty },
              { onConflict: 'aquarium_id,fish_id' },
            );
        }
      } catch (e) { console.warn('[Aquariums] Supabase sync failed:', e); }
    }
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setAquariums([]); setSelectedId(null); setLoading(false); return; }

    const load = async () => {
      if (!IS_DEMO_MODE) {
        try {
          const { data, error } = await supabase
            .from('aquariums')
            .select('*, aquarium_fish(fish_id, quantity)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (!error && data) {
            if (data.length > 0) {
              // Supabase has data — use it and sync to local cache
              const list = data.map(rowToEntry);
              setAquariums(list);
              setSelectedId(list[0]?.id ?? null);
              await AsyncStorage.setItem(localKey(user.id), JSON.stringify(list));
              setLoading(false);
              return;
            }
            // Supabase returned empty — fall through to AsyncStorage
            // (new aquarium may have been saved locally before Supabase was reachable)
          }
        } catch (e) { console.warn('[Aquariums] Supabase load failed:', e); }
      }
      // AsyncStorage fallback (demo mode OR Supabase empty/error)
      try {
        const raw = await AsyncStorage.getItem(localKey(user.id));
        if (raw) {
          const list: AquariumEntry[] = JSON.parse(raw);
          setAquariums(list);
          setSelectedId(list[0]?.id ?? null);

          // Si hay datos locales y Supabase está vacío, intentar sincronizar hacia arriba
          if (!IS_DEMO_MODE && list.length > 0) {
            syncLocalToSupabase(list, user.id).catch(() => {});
          }
        }
      } catch (e) { console.warn('[Aquariums] Local load failed:', e); }
      setLoading(false);
    };

    load();
  }, [user?.id]);

  // ── Persist local (fallback) ───────────────────────────────────────────────
  const persistLocal = async (list: AquariumEntry[]) => {
    setAquariums(list);
    if (user) {
      try { await AsyncStorage.setItem(localKey(user.id), JSON.stringify(list)); } catch (e) { console.warn('[Aquariums] Storage op failed:', e); }
    }
  };

  // ── Add ───────────────────────────────────────────────────────────────────
  const addAquarium = useCallback(async (
    data: Omit<AquariumEntry, 'id' | 'created_at' | 'fish'>,
  ): Promise<AquariumEntry> => {
    if (!IS_DEMO_MODE && user) {
      try {
        const { data: row, error } = await supabase
          .from('aquariums')
          .insert({ ...data, user_id: user.id })
          .select('*, aquarium_fish(fish_id, quantity)')
          .single();
        if (!error && row) {
          const entry = rowToEntry(row);
          setAquariums(prev => [...prev, entry]);
          setSelectedId(entry.id);
          return entry;
        }
      } catch (e) { console.warn('[Aquariums] Supabase op failed:', e); }
    }
    // Local fallback
    const entry: AquariumEntry = {
      ...data, fish: [], id: `aq-${Date.now()}`, created_at: new Date().toISOString(),
    };
    const next = [...aquariums, entry];
    await persistLocal(next);
    setSelectedId(entry.id);
    return entry;
  }, [aquariums, user]);

  // ── Update ────────────────────────────────────────────────────────────────
  const updateAquarium = useCallback(async (id: string, data: Partial<AquariumEntry>) => {
    if (!IS_DEMO_MODE) {
      try {
        const { fish: _fish, ...dbData } = data as any;
        await supabase.from('aquariums').update(dbData).eq('id', id);
      } catch (e) { console.warn('[Aquariums] Supabase op failed:', e); }
    }
    await persistLocal(aquariums.map(a => a.id === id ? { ...a, ...data } : a));
  }, [aquariums, user]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteAquarium = useCallback(async (id: string) => {
    if (!IS_DEMO_MODE) {
      try { await supabase.from('aquariums').delete().eq('id', id); } catch (e) { console.warn('[Aquariums] Supabase op failed:', e); }
    }
    const next = aquariums.filter(a => a.id !== id);
    await persistLocal(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  }, [aquariums, selectedId, user]);

  // ── Clear all aquariums (used on onboarding reset) ───────────────────────
  const clearAllAquariums = useCallback(async () => {
    if (!IS_DEMO_MODE && user) {
      try {
        await supabase.from('aquariums').delete().eq('user_id', user.id);
      } catch (e) { console.warn('[Aquariums] Supabase op failed:', e); }
    }
    setAquariums([]);
    setSelectedId(null);
    if (user) {
      try { await AsyncStorage.removeItem(localKey(user.id)); } catch (e) { console.warn('[Aquariums] Storage op failed:', e); }
    }
  }, [user]);

  // ── Set fish qty (upsert) ─────────────────────────────────────────────────
  const setFishQty = useCallback(async (aquariumId: string, fishId: string, qty: number) => {
    if (!IS_DEMO_MODE) {
      try {
        await supabase.from('aquarium_fish').upsert(
          { aquarium_id: aquariumId, fish_id: fishId, quantity: qty },
          { onConflict: 'aquarium_id,fish_id' },
        );
      } catch (e) { console.warn('[Aquariums] Supabase op failed:', e); }
    }
    await persistLocal(aquariums.map(a => {
      if (a.id !== aquariumId) return a;
      const exists = a.fish.find(f => f.fishId === fishId);
      const fish = exists
        ? a.fish.map(f => f.fishId === fishId ? { ...f, qty } : f)
        : [...a.fish, { fishId, qty }];
      return { ...a, fish };
    }));
  }, [aquariums, user]);

  // ── Remove fish ───────────────────────────────────────────────────────────
  const removeFish = useCallback(async (aquariumId: string, fishId: string) => {
    if (!IS_DEMO_MODE) {
      try {
        await supabase.from('aquarium_fish')
          .delete()
          .eq('aquarium_id', aquariumId)
          .eq('fish_id', fishId);
      } catch (e) { console.warn('[Aquariums] Supabase op failed:', e); }
    }
    await persistLocal(aquariums.map(a =>
      a.id !== aquariumId ? a : { ...a, fish: a.fish.filter(f => f.fishId !== fishId) }
    ));
  }, [aquariums, user]);

  const selectedAquarium = aquariums.find(a => a.id === selectedId) ?? null;

  return (
    <AquariumsContext.Provider value={{
      aquariums, loading, selectedId, selectedAquarium,
      selectAquarium: setSelectedId,
      addAquarium, updateAquarium, deleteAquarium, clearAllAquariums, setFishQty, removeFish,
    }}>
      {children}
    </AquariumsContext.Provider>
  );
}

export function useAquariums(): AquariumsContextType {
  const ctx = useContext(AquariumsContext);
  if (!ctx) throw new Error('useAquariums must be within AquariumsProvider');
  return ctx;
}
