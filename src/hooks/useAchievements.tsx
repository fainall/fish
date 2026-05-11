import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import {
  Achievement, AchievementId, AchievementUnlock,
  AquariumEntry, ParameterRecord, AquariumTask, Fish,
} from '../types';
import { useAuth } from './useAuth';
import { useAquariums } from './useAquariums';
import { useParameterRecords } from './useParameterRecords';
import { useTasks } from './useTasks';
import { useFishDatabase } from './useFishDatabase';
import { getStyleInfo } from '../data/aquariumStyles';

const localKey = (uid: string) => `@aquamanager_achievements_${uid}`;

// ── Catálogo estático ─────────────────────────────────────────────────────────
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_parameter',   title: 'Primera medición',       description: 'Registraste los parámetros por primera vez.',                icon: 'water',          rarity: 'bronze',   hint: 'Registra los parámetros en la sección Agua.' },
  { id: 'first_fish',        title: 'Primer habitante',       description: 'Añadiste tu primer pez a un acuario.',                      icon: 'fish',           rarity: 'bronze',   hint: 'Añade un pez en la sección Acuario.' },
  { id: 'water_change_done', title: 'Cambio de agua',         description: 'Completaste tu primer cambio de agua registrado.',           icon: 'refresh-circle', rarity: 'bronze',   hint: 'Crea y completa una tarea "Cambio de agua".' },
  { id: 'first_breeding',    title: 'Primera puesta exitosa', description: 'Lograste una reproducción exitosa.',                         icon: 'egg',            rarity: 'silver',   hint: 'Marca una puesta como "Exitosa".' },
  { id: 'perfect_10',        title: 'Agua perfecta',          description: '10 registros consecutivos con todos los parámetros en rango.',icon: 'checkmark-circle',rarity: 'gold',   hint: 'Mantén parámetros en rango durante 10 mediciones.' },
  { id: 'schooling_complete',title: 'Cardumen completo',      description: 'Tienes el mínimo de peces para un cardumen saludable.',      icon: 'people',         rarity: 'silver',   hint: 'Añade suficientes peces de cardumen.' },
  { id: 'biotope_authentic', title: 'Biotopo auténtico',      description: 'Todos los peces del acuario son del mismo hábitat.',         icon: 'leaf',           rarity: 'gold',     hint: 'Todas las especies del mismo hábitat geográfico.' },
  { id: 'multi_aquarist',    title: 'Multi-acuarista',        description: 'Gestionas 2 o más acuarios.',                               icon: 'layers',         rarity: 'silver',   hint: 'Crea al menos 2 acuarios.' },
  { id: 'analyst',           title: 'Analista del agua',      description: 'Llevas 20 o más mediciones de parámetros.',                  icon: 'bar-chart',      rarity: 'silver',   hint: 'Registra 20 o más mediciones.' },
  { id: 'master',            title: 'Maestro acuarista',      description: 'Has desbloqueado todos los demás logros.',                   icon: 'trophy',         rarity: 'platinum', hint: 'Desbloquea todos los logros.' },
];

export const ALL_IDS       = ACHIEVEMENTS.map(a => a.id);
const NON_MASTER_IDS       = ALL_IDS.filter(id => id !== 'master');

export const RARITY_COLORS: Record<string, string> = {
  bronze: '#cd7f32', silver: '#a8a9ad', gold: '#ffd700', platinum: '#00e5ff',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractRegion(origin: string): string {
  const o = origin.toLowerCase();
  if (o.includes('amazon') || o.includes('brasil') || o.includes('perú') || o.includes('orinoco')) return 'amazonia';
  if (o.includes('congo') || o.includes('malawi') || o.includes('tanganyika') || o.includes('africa')) return 'africa';
  if (o.includes('tailand') || o.includes('malaysia') || o.includes('indonesia') || o.includes('asia')) return 'asia';
  if (o.includes('europa') || o.includes('europe')) return 'europa';
  if (o.includes('carib') || o.includes('florida')) return 'caribe';
  return o.split(',')[0].trim();
}

function checks(
  aquariums: AquariumEntry[], records: ParameterRecord[],
  tasks: AquariumTask[], fishDb: Fish[],
): Record<AchievementId, boolean> {
  const perfect10 = aquariums.some(aq => {
    const recs = records.filter(r => r.aquarium_id === aq.id)
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (recs.length < 10) return false;
    const si = getStyleInfo(aq.aquarium_style);
    const p  = si?.params;
    const ranges: Record<string, [number, number]> = {
      temperature: [p?.temp_min ?? 22, p?.temp_max ?? 28],
      ph:          [p?.ph_min  ?? 6.0, p?.ph_max  ?? 7.8],
      ammonia:     [0, 0.25], nitrite: [0, 0.5], nitrate: [0, 40],
    };
    return recs.slice(-10).every(r =>
      Object.entries(ranges).every(([k, [mn, mx]]) => {
        const v = (r as any)[k];
        return v === undefined || (v >= mn && v <= mx);
      })
    );
  });

  return {
    first_parameter:   records.length >= 1,
    first_fish:        aquariums.some(a => a.fish.length > 0),
    water_change_done: tasks.some(t => t.type === 'water_change' && t.completed),
    first_breeding:    false,
    perfect_10:        perfect10,
    schooling_complete: aquariums.some(a => a.fish.some(e => {
      const f = fishDb.find(f => f.id === e.fishId);
      return f?.is_schooling && e.qty >= (f.schooling_min ?? 6);
    })),
    biotope_authentic: aquariums.some(a => {
      const species = a.fish.map(e => fishDb.find(f => f.id === e.fishId)).filter(Boolean) as Fish[];
      return species.length >= 2 && new Set(species.map(f => extractRegion(f.origin))).size === 1;
    }),
    multi_aquarist: aquariums.length >= 2,
    analyst:        records.length >= 20,
    master:         false,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────
interface AchievementsContextType {
  unlocked:    AchievementUnlock[];
  unlockedIds: Set<AchievementId>;
  newBadge:    Achievement | null;
  dismissBadge:() => void;
  unlock:      (id: AchievementId) => Promise<void>;
}

const AchievementsContext = createContext<AchievementsContextType | undefined>(undefined);

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { user }      = useAuth();
  const { aquariums } = useAquariums();
  const { records }   = useParameterRecords();
  const { tasks }     = useTasks();
  const { fish: fishDb } = useFishDatabase();

  const [unlocked, setUnlocked] = useState<AchievementUnlock[]>([]);
  const [newBadge, setNewBadge] = useState<Achievement | null>(null);
  const initialized = useRef(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setUnlocked([]); initialized.current = false; return; }

    const load = async () => {
      if (!IS_DEMO_MODE) {
        try {
          const { data, error } = await supabase
            .from('user_achievements').select('*').eq('user_id', user.id);
          if (!error && data) {
            setUnlocked(data.map(r => ({ id: r.achievement_id as AchievementId, unlockedAt: r.unlocked_at })));
            initialized.current = true;
            return;
          }
        } catch { /* fallback */ }
      }
      try {
        const raw = await AsyncStorage.getItem(localKey(user.id));
        if (raw) setUnlocked(JSON.parse(raw));
      } catch { /* ignore */ }
      initialized.current = true;
    };

    load();
  }, [user?.id]);

  // ── Persist ───────────────────────────────────────────────────────────────
  const persistUnlock = useCallback(async (id: AchievementId) => {
    const now = new Date().toISOString();
    if (!IS_DEMO_MODE && user) {
      try {
        await supabase.from('user_achievements').insert({
          user_id: user.id, achievement_id: id, unlocked_at: now,
        });
      } catch { /* ignore */ }
    }
    return { id, unlockedAt: now } as AchievementUnlock;
  }, [user]);

  // ── Manual unlock ─────────────────────────────────────────────────────────
  const unlock = useCallback(async (id: AchievementId) => {
    if (unlocked.find(u => u.id === id)) return;
    const now = new Date().toISOString();
    const next = [...unlocked, { id, unlockedAt: now }];
    setUnlocked(next);
    persistUnlock(id);
    if (user) {
      try { await AsyncStorage.setItem(localKey(user.id), JSON.stringify(next)); } catch {}
    }
    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (achievement) setNewBadge(achievement);
  }, [unlocked, persistUnlock, user]);

  // ── Reactive check ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized.current || !user) return;
    const result = checks(aquariums, records, tasks, fishDb);

    const currentIds = new Set(unlocked.map(u => u.id));
    const toAdd: AchievementUnlock[] = [];
    const now = new Date().toISOString();

    for (const [id, passed] of Object.entries(result) as [AchievementId, boolean][]) {
      if (passed && !currentIds.has(id)) toAdd.push({ id, unlockedAt: now });
    }

    const afterAdd = new Set([...currentIds, ...toAdd.map(u => u.id)]);
    if (NON_MASTER_IDS.every(id => afterAdd.has(id)) && !afterAdd.has('master')) {
      toAdd.push({ id: 'master', unlockedAt: now });
    }

    if (toAdd.length === 0) return;

    const next = [...unlocked, ...toAdd];
    setUnlocked(next);
    // Side effects OUTSIDE the updater (StrictMode safe)
    toAdd.forEach(u => persistUnlock(u.id));
    AsyncStorage.setItem(localKey(user.id), JSON.stringify(next)).catch(() => {});

    const toastTarget = toAdd.find(u => u.id === 'master') ?? toAdd[0];
    const achievement = ACHIEVEMENTS.find(a => a.id === toastTarget.id);
    if (achievement) setNewBadge(achievement);
  }, [aquariums, records, tasks, fishDb, user, unlocked, persistUnlock]);

  return (
    <AchievementsContext.Provider value={{
      unlocked, unlockedIds: new Set(unlocked.map(u => u.id)),
      newBadge, dismissBadge: () => setNewBadge(null), unlock,
    }}>
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements(): AchievementsContextType {
  const ctx = useContext(AchievementsContext);
  if (!ctx) throw new Error('useAchievements must be within AchievementsProvider');
  return ctx;
}
