import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FISH_DATABASE } from '../data/fishDatabase';
import { FISH_EXPERT } from '../data/fishExpertData';
import { Fish } from '../types';
import { supabase, IS_DEMO_MODE } from '../services/supabase';

const STORAGE_KEY = '@aquamanager_fish_overrides';

export type EditableFish = Fish & { id: string };

interface FishDBContextType {
  fish:          EditableFish[];
  loading:       boolean;
  updateFish:    (id: string, data: Partial<EditableFish>) => Promise<void>;
  addFish:       (data: Omit<EditableFish, 'id'>) => Promise<void>;
  deleteFish:    (id: string) => Promise<void>;
  resetToDefault:() => Promise<void>;
}

const FishDBContext = createContext<FishDBContextType | undefined>(undefined);

// ── Local fallback ────────────────────────────────────────────────────────────
// Merges expert data (alt_names, lifespan, breeding info, compatibility, etc.)
// into each base fish entry. See src/data/fishExpertData.ts.
function buildBase(): EditableFish[] {
  return FISH_DATABASE.map((f, i) => ({
    ...f,
    ...(FISH_EXPERT[f.scientific_name] ?? {}),
    id:         `local-${i}`,
    approved:   true,
    created_by: 'system',
  }));
}

// ── Supabase ↔ Fish mappers ───────────────────────────────────────────────────
function rowToFish(row: any): EditableFish {
  return {
    id:              row.id,
    common_name:     row.common_name,
    scientific_name: row.scientific_name,
    family:          row.family,
    origin:          row.origin,
    adult_size_cm:   row.adult_size_cm,
    temp_min:        row.temp_min,
    temp_max:        row.temp_max,
    ph_min:          row.ph_min,
    ph_max:          row.ph_max,
    gh_min:          row.gh_min,
    gh_max:          row.gh_max,
    water_level:     row.water_level,
    aggression:      row.aggression,
    min_tank_liters: row.min_tank_liters,
    diet:            row.diet,
    description:     row.description,
    is_schooling:    row.is_schooling,
    schooling_min:   row.schooling_min ?? undefined,
    water_type:      row.water_type,
    tags:            row.tags ?? [],
    image_url:       row.image_url ?? undefined,
    approved:        row.approved,
    created_by:      row.created_by,
  };
}

function fishToRow(f: Omit<EditableFish, 'id'>) {
  return {
    common_name:     f.common_name,
    scientific_name: f.scientific_name,
    family:          f.family,
    origin:          f.origin,
    adult_size_cm:   f.adult_size_cm,
    temp_min:        f.temp_min,
    temp_max:        f.temp_max,
    ph_min:          f.ph_min,
    ph_max:          f.ph_max,
    gh_min:          f.gh_min,
    gh_max:          f.gh_max,
    water_level:     f.water_level,
    aggression:      f.aggression,
    min_tank_liters: f.min_tank_liters,
    diet:            f.diet,
    description:     f.description,
    is_schooling:    f.is_schooling,
    schooling_min:   f.schooling_min ?? null,
    water_type:      f.water_type,
    tags:            f.tags ?? [],
    image_url:       f.image_url ?? null,
    approved:        f.approved ?? false,
    created_by:      f.created_by ?? null,
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function FishDatabaseProvider({ children }: { children: React.ReactNode }) {
  const [fish, setFish]       = useState<EditableFish[]>(buildBase());
  const [loading, setLoading] = useState(true);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      if (!IS_DEMO_MODE) {
        try {
          const { data, error } = await supabase
            .from('fish')
            .select('*')
            .eq('approved', true)
            .order('common_name');
          if (!error && data && data.length > 0) {
            setFish(data.map(rowToFish));
            setLoading(false);
            return;
          }
        } catch { /* fallback */ }
      }

      // AsyncStorage overrides on top of local base
      const base = buildBase();
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // New format: { overrides, custom } | legacy: just the overrides record
          const overrides: Record<string, Partial<EditableFish>> = parsed.overrides ?? parsed;
          const custom: EditableFish[] = parsed.custom ?? [];
          const merged = base.map(f => overrides[f.id] ? { ...f, ...overrides[f.id] } : f);
          setFish([...merged, ...custom]);
        } else {
          setFish(base);
        }
      } catch {
        setFish(base);
      }
      setLoading(false);
    };

    load();
  }, []);

  // ── Local override persistence ─────────────────────────────────────────────
  async function saveOverrides(updated: EditableFish[]) {
    const base = buildBase();
    const baseIds = new Set(base.map(b => b.id));
    const overrides: Record<string, Partial<EditableFish>> = {};
    const custom: EditableFish[] = [];
    updated.forEach(f => {
      if (!baseIds.has(f.id)) { custom.push(f); return; }
      const orig = base.find(b => b.id === f.id)!;
      const diff: Partial<EditableFish> = {};
      (Object.keys(f) as (keyof EditableFish)[]).forEach(k => {
        if (JSON.stringify(f[k]) !== JSON.stringify(orig[k])) (diff as any)[k] = f[k];
      });
      if (Object.keys(diff).length > 0) overrides[f.id] = diff;
    });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ overrides, custom }));
  }

  // ── updateFish ─────────────────────────────────────────────────────────────
  const updateFish = async (id: string, data: Partial<EditableFish>) => {
    const updated = fish.map(f => f.id === id ? { ...f, ...data } : f);
    setFish(updated);

    if (!IS_DEMO_MODE) {
      try {
        await supabase.from('fish').update(data).eq('id', id);
        return; // Supabase is source of truth; skip AsyncStorage
      } catch { /* fallback */ }
    }
    await saveOverrides(updated);
  };

  // ── addFish ────────────────────────────────────────────────────────────────
  const addFish = async (data: Omit<EditableFish, 'id'>) => {
    if (!IS_DEMO_MODE) {
      try {
        const { data: row, error } = await supabase
          .from('fish')
          .insert(fishToRow(data))
          .select()
          .single();
        if (!error && row) {
          setFish(prev => [...prev, rowToFish(row)]);
          return;
        }
      } catch { /* fallback */ }
    }

    const newFish: EditableFish = { ...data, id: `custom-${Date.now()}` };
    const updated = [...fish, newFish];
    setFish(updated);
    await saveOverrides(updated);
  };

  // ── deleteFish ─────────────────────────────────────────────────────────────
  const deleteFish = async (id: string) => {
    if (!IS_DEMO_MODE) {
      try {
        await supabase.from('fish').delete().eq('id', id);
        setFish(prev => prev.filter(f => f.id !== id));
        return;
      } catch { /* fallback */ }
    }

    const updated = fish.filter(f => f.id !== id);
    setFish(updated);
    await saveOverrides(updated);
  };

  // ── resetToDefault ─────────────────────────────────────────────────────────
  const resetToDefault = async () => {
    if (!IS_DEMO_MODE) {
      try {
        const { data, error } = await supabase
          .from('fish').select('*').eq('approved', true).order('common_name');
        if (!error && data && data.length > 0) {
          setFish(data.map(rowToFish));
          return;
        }
      } catch { /* fallback */ }
    }
    await AsyncStorage.removeItem(STORAGE_KEY);
    setFish(buildBase());
  };

  return (
    <FishDBContext.Provider value={{ fish, loading, updateFish, addFish, deleteFish, resetToDefault }}>
      {children}
    </FishDBContext.Provider>
  );
}

export function useFishDatabase(): FishDBContextType {
  const ctx = useContext(FishDBContext);
  if (!ctx) throw new Error('useFishDatabase must be used within FishDatabaseProvider');
  return ctx;
}
