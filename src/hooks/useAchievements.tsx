import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef, useMemo,
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
import { useBreeding, BreedingGoal } from './useBreeding';
import { useWishlist } from './useWishlist';
import { getStyleInfo } from '../data/aquariumStyles';

const localKey = (uid: string) => `@aquamanager_achievements_${uid}`;

// ── Catálogo estático ─────────────────────────────────────────────────────────
export const ACHIEVEMENTS: Achievement[] = [
  // ── Bronce (Primeros pasos) ──────────────────────────────────────────────
  { id: 'first_parameter',   title: 'Primera medición',       description: 'Registraste los parámetros por primera vez.',                 icon: 'water',          rarity: 'bronze', hint: 'Registra los parámetros en la sección Agua.' },
  { id: 'first_fish',        title: 'Primer habitante',       description: 'Añadiste tu primer pez a un acuario.',                       icon: 'fish',           rarity: 'bronze', hint: 'Añade un pez en la sección Acuario.' },
  { id: 'water_change_done', title: 'Cambio de agua',         description: 'Completaste tu primer cambio de agua registrado.',            icon: 'refresh-circle', rarity: 'bronze', hint: 'Crea y completa una tarea "Cambio de agua".' },
  { id: 'first_task',        title: 'Organizado',             description: 'Completaste tu primera tarea de mantenimiento.',              icon: 'checkbox',       rarity: 'bronze', hint: 'Completa cualquier tarea en la sección Tareas.' },
  { id: 'first_wishlist',    title: 'Lista de deseos',        description: 'Añadiste tu primer pez a la wishlist.',                       icon: 'heart',          rarity: 'bronze', hint: 'Guarda un pez en tu lista de deseos.' },

  // ── Plata (Intermedio) ───────────────────────────────────────────────────
  { id: 'first_breeding',    title: 'Primera puesta exitosa', description: 'Lograste una reproducción exitosa.',                          icon: 'egg',            rarity: 'silver', hint: 'Marca una puesta como "Exitosa".' },
  { id: 'schooling_complete',title: 'Cardumen completo',      description: 'Tienes el mínimo de peces para un cardumen saludable.',       icon: 'people',         rarity: 'silver', hint: 'Añade suficientes peces de cardumen.' },
  { id: 'multi_aquarist',    title: 'Multi-acuarista',        description: 'Gestionas 2 o más acuarios.',                                icon: 'layers',         rarity: 'silver', hint: 'Crea al menos 2 acuarios.' },
  { id: 'analyst',           title: 'Analista del agua',      description: 'Llevas 20 o más mediciones de parámetros.',                   icon: 'bar-chart',      rarity: 'silver', hint: 'Registra 20 o más mediciones.' },
  { id: 'collector_5',       title: 'Pequeño coleccionista',  description: 'Tienes 5 o más especies diferentes en tus acuarios.',         icon: 'albums',         rarity: 'silver', hint: 'Añade 5 especies distintas.' },
  { id: 'task_streak_7',     title: 'Constancia semanal',     description: 'Completaste 7 tareas de mantenimiento.',                      icon: 'calendar',       rarity: 'silver', hint: 'Completa al menos 7 tareas.' },
  { id: 'community_first',   title: 'Voz de la comunidad',   description: 'Publicaste tu primer post en la comunidad.',                   icon: 'chatbubbles',    rarity: 'silver', hint: 'Comparte algo en la sección Comunidad.' },
  { id: 'species_diverse',   title: 'Biodiversidad',          description: 'Tu acuario tiene peces de 3+ niveles de agua distintos.',     icon: 'git-branch',     rarity: 'silver', hint: 'Combina peces de fondo, medio y superficie.' },

  // ── Oro (Avanzado) ──────────────────────────────────────────────────────
  { id: 'perfect_10',        title: 'Agua perfecta',          description: '10 registros consecutivos con todos los parámetros en rango.',icon: 'checkmark-circle',rarity: 'gold',  hint: 'Mantén parámetros en rango durante 10 mediciones.' },
  { id: 'biotope_authentic', title: 'Biotopo auténtico',      description: 'Todos los peces del acuario son del mismo hábitat.',          icon: 'leaf',           rarity: 'gold',  hint: 'Todas las especies del mismo hábitat geográfico.' },
  { id: 'collector_10',      title: 'Gran coleccionista',     description: 'Tienes 10 o más especies diferentes en tus acuarios.',        icon: 'grid',           rarity: 'gold',  hint: 'Añade 10 especies distintas.' },
  { id: 'analyst_50',        title: 'Científico del agua',    description: 'Llevas 50 o más mediciones de parámetros.',                   icon: 'flask',          rarity: 'gold',  hint: 'Registra 50 o más mediciones.' },
  { id: 'breeder_3',         title: 'Criador experto',        description: 'Lograste 3 reproducciones exitosas.',                         icon: 'sparkles',       rarity: 'gold',  hint: 'Completa 3 reproducciones exitosas.' },
  { id: 'green_thumb',       title: 'Pulgar verde',           description: 'Completaste 20 tareas de mantenimiento.',                     icon: 'rose',           rarity: 'gold',  hint: 'Completa 20 tareas de mantenimiento.' },
  { id: 'tank_decorator',    title: 'Decorador experto',      description: 'Registraste los elementos de desplazamiento de tu tanque.',   icon: 'color-palette',  rarity: 'gold',  hint: 'Configura sustrato, rocas o madera en tu acuario.' },

  // ── Platino (Élite) ─────────────────────────────────────────────────────
  { id: 'dedicated_90',      title: 'Dedicación absoluta',    description: 'Llevas más de 90 días como acuarista registrado.',            icon: 'diamond',        rarity: 'platinum', hint: 'Usa la app por más de 90 días.' },
  { id: 'master',            title: 'Maestro acuarista',      description: 'Has desbloqueado todos los demás logros.',                    icon: 'trophy',         rarity: 'platinum', hint: 'Desbloquea todos los logros.' },
];

export const ALL_IDS       = ACHIEVEMENTS.map(a => a.id);
const NON_MASTER_IDS       = ALL_IDS.filter(id => id !== 'master');

export const RARITY_COLORS: Record<string, string> = {
  bronze: '#cd7f32', silver: '#a8a9ad', gold: '#ffd700', platinum: '#00e5ff',
};

// ── Sistema de niveles de acuarista ─────────────────────────────────────────
export interface AquaristLevel {
  id: string;
  label: string;
  icon: string;
  color: string;
  minAchievements: number;
}

export const AQUARIST_LEVELS: AquaristLevel[] = [
  { id: 'novice',       label: 'Novato',           icon: '🐚', color: '#8d6e63',  minAchievements: 0  },
  { id: 'beginner',     label: 'Principiante',     icon: '🐠', color: '#42a5f5',  minAchievements: 5  },
  { id: 'intermediate', label: 'Intermedio',        icon: '🐟', color: '#66bb6a',  minAchievements: 10 },
  { id: 'advanced',     label: 'Avanzado',          icon: '🦈', color: '#ab47bc',  minAchievements: 15 },
  { id: 'expert',       label: 'Experto',           icon: '🐙', color: '#ff7043',  minAchievements: 19 },
  { id: 'master',       label: 'Maestro Acuarista', icon: '🏆', color: '#ffd700',  minAchievements: NON_MASTER_IDS.length + 1 }, // all including master
];

export function getAquaristLevel(unlockedCount: number): AquaristLevel {
  let level = AQUARIST_LEVELS[0];
  for (const l of AQUARIST_LEVELS) {
    if (unlockedCount >= l.minAchievements) level = l;
  }
  return level;
}

export function getNextLevel(unlockedCount: number): AquaristLevel | null {
  for (const l of AQUARIST_LEVELS) {
    if (unlockedCount < l.minAchievements) return l;
  }
  return null;
}

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

function countUniqueSpecies(aquariums: AquariumEntry[]): number {
  const ids = new Set<string>();
  for (const aq of aquariums) for (const f of aq.fish) ids.add(f.fishId);
  return ids.size;
}

function countCompletedTasks(tasks: AquariumTask[]): number {
  return tasks.filter(t => t.completed).length;
}

function hasWaterLevelDiversity(aquariums: AquariumEntry[], fishDb: Fish[]): boolean {
  return aquariums.some(aq => {
    const levels = new Set<string>();
    for (const e of aq.fish) {
      const f = fishDb.find(fd => fd.id === e.fishId);
      if (f?.water_level) levels.add(f.water_level === 'all' ? 'middle' : f.water_level);
    }
    return levels.size >= 3;
  });
}

function hasDisplacement(aquariums: AquariumEntry[]): boolean {
  return aquariums.some(aq => {
    const d = aq.displacement;
    if (!d) return false;
    return (d.substrate_kg ?? 0) > 0 || (d.rocks_kg ?? 0) > 0 || (d.wood_kg ?? 0) > 0
      || (d.plants_kg ?? 0) > 0 || (d.equipment_liters ?? 0) > 0;
  });
}

function daysSinceFirstAquarium(aquariums: AquariumEntry[]): number {
  if (aquariums.length === 0) return 0;
  const oldest = aquariums.reduce((min, aq) =>
    new Date(aq.created_at) < new Date(min.created_at) ? aq : min
  );
  return Math.floor((Date.now() - new Date(oldest.created_at).getTime()) / (1000 * 60 * 60 * 24));
}

interface CheckDeps {
  aquariums: AquariumEntry[];
  records: ParameterRecord[];
  tasks: AquariumTask[];
  fishDb: Fish[];
  breedingGoals: BreedingGoal[];
  wishlistCount: number;
}

function checks(deps: CheckDeps): Record<AchievementId, boolean> {
  const { aquariums, records, tasks, fishDb, breedingGoals, wishlistCount } = deps;

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

  const completedTasks = countCompletedTasks(tasks);
  const uniqueSpecies  = countUniqueSpecies(aquariums);
  const successBreeds  = breedingGoals.filter(g => g.status === 'success').length;

  return {
    // Bronze
    first_parameter:    records.length >= 1,
    first_fish:         aquariums.some(a => a.fish.length > 0),
    water_change_done:  tasks.some(t => t.type === 'water_change' && t.completed),
    first_task:         completedTasks >= 1,
    first_wishlist:     wishlistCount >= 1,

    // Silver
    first_breeding:     successBreeds >= 1,
    schooling_complete: aquariums.some(a => a.fish.some(e => {
      const f = fishDb.find(fd => fd.id === e.fishId);
      return f?.is_schooling && e.qty >= (f.schooling_min ?? 6);
    })),
    multi_aquarist:     aquariums.length >= 2,
    analyst:            records.length >= 20,
    collector_5:        uniqueSpecies >= 5,
    task_streak_7:      completedTasks >= 7,
    community_first:    false, // unlocked imperatively from CommunityScreen
    species_diverse:    hasWaterLevelDiversity(aquariums, fishDb),

    // Gold
    perfect_10:         perfect10,
    biotope_authentic:  aquariums.some(a => {
      const species = a.fish.map(e => fishDb.find(f => f.id === e.fishId)).filter(Boolean) as Fish[];
      return species.length >= 2 && new Set(species.map(f => extractRegion(f.origin))).size === 1;
    }),
    collector_10:       uniqueSpecies >= 10,
    analyst_50:         records.length >= 50,
    breeder_3:          successBreeds >= 3,
    green_thumb:        completedTasks >= 20,
    tank_decorator:     hasDisplacement(aquariums),

    // Platinum
    dedicated_90:       daysSinceFirstAquarium(aquariums) >= 90,
    master:             false, // computed separately
  };
}

// ── Progress computation ─────────────────────────────────────────────────────
export interface AchievementProgress { current: number; target: number; }

function computeProgress(deps: CheckDeps, unlockedIds: Set<AchievementId>): Record<AchievementId, AchievementProgress> {
  const { aquariums, records, tasks, fishDb, breedingGoals, wishlistCount } = deps;

  // perfect_10: best consecutive in-range streak out of 10
  let bestStreak = 0;
  for (const aq of aquariums) {
    const recs = records.filter(r => r.aquarium_id === aq.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const si = getStyleInfo(aq.aquarium_style);
    const p = si?.params;
    const ranges: Record<string, [number, number]> = {
      temperature: [p?.temp_min ?? 22, p?.temp_max ?? 28],
      ph: [p?.ph_min ?? 6.0, p?.ph_max ?? 7.8],
      ammonia: [0, 0.25], nitrite: [0, 0.5], nitrate: [0, 40],
    };
    let streak = 0;
    for (const r of recs.slice(-10)) {
      const ok = Object.entries(ranges).every(([k, [mn, mx]]) => {
        const v = (r as any)[k];
        return v === undefined || (v >= mn && v <= mx);
      });
      streak = ok ? streak + 1 : 0;
      if (streak > bestStreak) bestStreak = streak;
    }
  }

  const completedTasks = countCompletedTasks(tasks);
  const uniqueSpecies  = countUniqueSpecies(aquariums);
  const successBreeds  = breedingGoals.filter(g => g.status === 'success').length;
  const days           = daysSinceFirstAquarium(aquariums);
  const nonMasterUnlocked = NON_MASTER_IDS.filter(id => unlockedIds.has(id)).length;

  return {
    // Bronze
    first_parameter:    { current: Math.min(records.length, 1), target: 1 },
    first_fish:         { current: aquariums.some(a => a.fish.length > 0) ? 1 : 0, target: 1 },
    water_change_done:  { current: tasks.filter(t => t.type === 'water_change' && t.completed).length > 0 ? 1 : 0, target: 1 },
    first_task:         { current: Math.min(completedTasks, 1), target: 1 },
    first_wishlist:     { current: Math.min(wishlistCount, 1), target: 1 },

    // Silver
    first_breeding:     { current: Math.min(successBreeds, 1), target: 1 },
    schooling_complete: { current: aquariums.some(a => a.fish.some(e => { const f = fishDb.find(f2 => f2.id === e.fishId); return f?.is_schooling && e.qty >= (f.schooling_min ?? 6); })) ? 1 : 0, target: 1 },
    multi_aquarist:     { current: Math.min(aquariums.length, 2), target: 2 },
    analyst:            { current: Math.min(records.length, 20), target: 20 },
    collector_5:        { current: Math.min(uniqueSpecies, 5), target: 5 },
    task_streak_7:      { current: Math.min(completedTasks, 7), target: 7 },
    community_first:    { current: unlockedIds.has('community_first') ? 1 : 0, target: 1 },
    species_diverse:    { current: hasWaterLevelDiversity(aquariums, fishDb) ? 1 : 0, target: 1 },

    // Gold
    perfect_10:         { current: Math.min(bestStreak, 10), target: 10 },
    biotope_authentic:  { current: aquariums.some(a => { const sp = a.fish.map(e => fishDb.find(f => f.id === e.fishId)).filter(Boolean) as Fish[]; return sp.length >= 2 && new Set(sp.map(f => extractRegion(f.origin))).size === 1; }) ? 1 : 0, target: 1 },
    collector_10:       { current: Math.min(uniqueSpecies, 10), target: 10 },
    analyst_50:         { current: Math.min(records.length, 50), target: 50 },
    breeder_3:          { current: Math.min(successBreeds, 3), target: 3 },
    green_thumb:        { current: Math.min(completedTasks, 20), target: 20 },
    tank_decorator:     { current: hasDisplacement(aquariums) ? 1 : 0, target: 1 },

    // Platinum
    dedicated_90:       { current: Math.min(days, 90), target: 90 },
    master:             { current: nonMasterUnlocked, target: NON_MASTER_IDS.length },
  };
}

// ── Context ───────────────────────────────────────────────────────────────────
interface AchievementsContextType {
  unlocked:    AchievementUnlock[];
  unlockedIds: Set<AchievementId>;
  progress:    Record<AchievementId, AchievementProgress>;
  newBadge:    Achievement | null;
  dismissBadge:() => void;
  unlock:      (id: AchievementId) => Promise<void>;
  level:       AquaristLevel;
  nextLevel:   AquaristLevel | null;
}

const AchievementsContext = createContext<AchievementsContextType | undefined>(undefined);

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { user }      = useAuth();
  const { aquariums } = useAquariums();
  const { records }   = useParameterRecords();
  const { tasks }     = useTasks();
  const { fish: fishDb } = useFishDatabase();
  const { goals: breedingGoals } = useBreeding();
  const { items: wishlistItems } = useWishlist();

  const [unlocked, setUnlocked] = useState<AchievementUnlock[]>([]);
  const [newBadge, setNewBadge] = useState<Achievement | null>(null);
  const initialized = useRef(false);

  const wishlistCount = wishlistItems.length;

  const checkDeps: CheckDeps = useMemo(() => ({
    aquariums, records, tasks, fishDb, breedingGoals, wishlistCount,
  }), [aquariums, records, tasks, fishDb, breedingGoals, wishlistCount]);

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
        } catch (e) { console.warn('[Achievements] Supabase load failed:', e); }
      }
      try {
        const raw = await AsyncStorage.getItem(localKey(user.id));
        if (raw) setUnlocked(JSON.parse(raw));
      } catch (e) { console.warn('[Achievements] Local load failed:', e); }
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
      } catch (e) { console.warn('[Achievements] Supabase persist failed:', e); }
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
      try { await AsyncStorage.setItem(localKey(user.id), JSON.stringify(next)); } catch (e) { console.warn('[Achievements] Local save failed:', e); }
    }
    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (achievement) setNewBadge(achievement);
  }, [unlocked, persistUnlock, user]);

  // ── Reactive check ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized.current || !user) return;
    const result = checks(checkDeps);

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
    toAdd.forEach(u => persistUnlock(u.id));
    AsyncStorage.setItem(localKey(user.id), JSON.stringify(next)).catch(() => {});

    const toastTarget = toAdd.find(u => u.id === 'master') ?? toAdd[0];
    const achievement = ACHIEVEMENTS.find(a => a.id === toastTarget.id);
    if (achievement) setNewBadge(achievement);
  }, [checkDeps, user, unlocked, persistUnlock]);

  const unlockedIds = useMemo(() => new Set(unlocked.map(u => u.id)), [unlocked]);
  const progress = useMemo(
    () => computeProgress(checkDeps, unlockedIds),
    [checkDeps, unlockedIds],
  );

  const level     = useMemo(() => getAquaristLevel(unlocked.length), [unlocked.length]);
  const nextLevel = useMemo(() => getNextLevel(unlocked.length), [unlocked.length]);

  return (
    <AchievementsContext.Provider value={{
      unlocked, unlockedIds, progress,
      newBadge, dismissBadge: () => setNewBadge(null), unlock,
      level, nextLevel,
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
