import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { withTimeout } from '../utils/withTimeout';
import { ExperienceLevel } from '../constants/tips';
import { WaterType, AquariumStyle } from '../types';
import { useAuth } from './useAuth';

// Max wait for the profile network fetch before falling back to local cache.
const PROFILE_NET_TIMEOUT_MS = 6000;

export interface AquariumProfile {
  length_cm: number; width_cm: number; height_cm: number;
  volume_liters: number; water_type: WaterType; aquarium_style?: AquariumStyle;
}

export interface UserProfile {
  experience: ExperienceLevel;
  knows_cycling: boolean | null;
  has_aquarium: boolean;
  aquarium: AquariumProfile | null;
  goals: string[];
  water_types: WaterType[];
  onboarding_completed: boolean;
  completed_at: string | null;
  display_name?: string;
  avatar_uri?: string;
}

const DEFAULT_PROFILE: UserProfile = {
  experience: 'beginner', knows_cycling: null, has_aquarium: false,
  aquarium: null, goals: [], water_types: ['freshwater'],
  onboarding_completed: false, completed_at: null,
};

interface UserProfileContextType {
  profile: UserProfile;
  loading: boolean;
  updateProfile:    (updates: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: (finalProfile: Partial<UserProfile>) => Promise<void>;
  resetOnboarding:  () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

const localKey = (uid: string) => `@aquamanager_profile_${uid}`;

// ── Mapeo DB → UserProfile ────────────────────────────────────────────────────
function rowToProfile(row: any): UserProfile {
  return {
    experience:           row.experience          ?? 'beginner',
    knows_cycling:        row.knows_cycling        ?? null,
    has_aquarium:         row.has_aquarium         ?? false,
    goals:                row.goals                ?? [],
    water_types:          row.water_types          ?? ['freshwater'],
    onboarding_completed: row.onboarding_completed ?? false,
    completed_at:         row.completed_at         ?? null,
    display_name:         row.display_name,
    avatar_uri:           undefined,
    aquarium: row.onboard_volume_liters ? {
      volume_liters: row.onboard_volume_liters,
      water_type:    row.onboard_water_type,
      aquarium_style: row.onboard_style,
      length_cm:     row.onboard_length_cm ?? 0,
      width_cm:      row.onboard_width_cm  ?? 0,
      height_cm:     row.onboard_height_cm ?? 0,
    } : null,
  };
}

// ── Mapeo UserProfile → DB row ────────────────────────────────────────────────
function profileToRow(p: UserProfile, uid: string) {
  return {
    id:                   uid,
    experience:           p.experience,
    knows_cycling:        p.knows_cycling,
    has_aquarium:         p.has_aquarium,
    goals:                p.goals,
    water_types:          p.water_types,
    onboarding_completed: p.onboarding_completed,
    completed_at:         p.completed_at,
    display_name:         p.display_name,
    onboard_volume_liters: p.aquarium?.volume_liters,
    onboard_water_type:    p.aquarium?.water_type,
    onboard_style:         p.aquarium?.aquarium_style,
    onboard_length_cm:     p.aquarium?.length_cm,
    onboard_width_cm:      p.aquarium?.width_cm,
    onboard_height_cm:     p.aquarium?.height_cm,
    updated_at:            new Date().toISOString(),
  };
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfile(DEFAULT_PROFILE); setLoading(false); return; }
    let mounted = true;
    setLoading(true);

    // Safety net: never let the splash hang on a stalled profile fetch.
    const safety = setTimeout(() => { if (mounted) setLoading(false); }, PROFILE_NET_TIMEOUT_MS + 2000);

    const load = async () => {
      // ── 1. Intentar cargar desde Supabase (fuente de verdad) ──────────
      if (!IS_DEMO_MODE) {
        try {
          const { data, error } = await withTimeout(
            (async () => supabase.from('user_profiles').select('*').eq('id', user.id).single())(),
            PROFILE_NET_TIMEOUT_MS,
            { data: null, error: null } as any,
          );

          if (!error && data) {
            const remote = rowToProfile(data);

            // Si Supabase ya tiene perfil con onboarding completado → usarlo
            // Esto cubre: login en dispositivo nuevo
            if (remote.onboarding_completed) {
              setProfile(remote);
              // Sincronizar a AsyncStorage como caché local
              try { await AsyncStorage.setItem(localKey(user.id), JSON.stringify(remote)); } catch (e) { console.warn('[UserProfile] Local cache failed:', e); }
              setLoading(false);
              return;
            }

            // Supabase tiene perfil pero sin onboarding → revisar si hay datos locales más completos
            const localRaw = await AsyncStorage.getItem(localKey(user.id));
            if (localRaw) {
              const local: UserProfile = JSON.parse(localRaw);
              if (local.onboarding_completed) {
                // Local tiene onboarding completado pero Supabase no → mostrar local YA
                // y sincronizar hacia arriba en segundo plano (sin bloquear el arranque).
                setProfile(local);
                setLoading(false);
                syncToSupabase(local, user.id).catch(() => {});
                return;
              }
            }

            // Ambos sin onboarding → usar lo que tenga Supabase
            setProfile(remote);
            setLoading(false);
            return;
          }

          // No hay fila en Supabase → crear una vacía (sin bloquear el arranque)
          if (error?.code === 'PGRST116') { // "no rows returned"
            supabase.from('user_profiles').insert({ id: user.id }).select().single()
              .then(() => {}, (e) => console.warn('[UserProfile] Supabase insert row failed:', e));
          }
        } catch (e) { console.warn('[UserProfile] Supabase load failed:', e); }
      }

      // ── 2. Fallback: AsyncStorage ──────────────────────────────────────
      try {
        const raw = await AsyncStorage.getItem(localKey(user.id));
        if (raw) {
          const local: UserProfile = JSON.parse(raw);
          setProfile(local);

          // Si hay datos locales y Supabase está disponible, intentar sincronizar
          if (!IS_DEMO_MODE && local.onboarding_completed) {
            syncToSupabase(local, user.id).catch(() => {});
          }
        } else {
          setProfile(DEFAULT_PROFILE);
        }
      } catch (e) { console.warn('[UserProfile] Local fallback load failed:', e); setProfile(DEFAULT_PROFILE); }
      if (mounted) setLoading(false);
    };

    load().finally(() => clearTimeout(safety));

    return () => { mounted = false; clearTimeout(safety); };
  }, [user?.id]);

  // ── Sync helper: empujar perfil local a Supabase ──────────────────────────
  async function syncToSupabase(p: UserProfile, uid: string) {
    try {
      await supabase
        .from('user_profiles')
        .upsert(profileToRow(p, uid), { onConflict: 'id' });
    } catch (e) { console.warn('[UserProfile] Supabase sync failed:', e); }
  }

  // ── Guardar: Supabase primero, AsyncStorage como caché ────────────────────
  const saveProfile = async (next: UserProfile) => {
    setProfile(next);
    if (!user) return;

    // Siempre guardar en AsyncStorage como caché inmediata
    try { await AsyncStorage.setItem(localKey(user.id), JSON.stringify(next)); } catch (e) { console.warn('[UserProfile] Local save failed:', e); }

    // Sincronizar a Supabase
    if (!IS_DEMO_MODE) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .upsert(profileToRow(next, user.id), { onConflict: 'id' });
        if (error) {
          console.warn('[UserProfile] Supabase sync error:', error.message);
        }
      } catch (e) {
        console.warn('[UserProfile] Supabase sync failed:', e);
      }
    }
  };

  const updateProfile    = async (updates: Partial<UserProfile>) => saveProfile({ ...profile, ...updates });
  const completeOnboarding = async (final: Partial<UserProfile>) =>
    saveProfile({ ...profile, ...final, onboarding_completed: true, completed_at: new Date().toISOString() });
  const resetOnboarding  = async () => saveProfile(DEFAULT_PROFILE);

  return (
    <UserProfileContext.Provider value={{ profile, loading, updateProfile, completeOnboarding, resetOnboarding }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextType {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}

export function calculateVolume(l: number, w: number, h: number) {
  return Math.round((l * w * h) / 1000);
}
