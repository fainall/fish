/**
 * useAdminAnalytics — Agrega eventos de uso para el panel de Métricas (admin).
 *
 * Lee analytics_events (RLS permite a admin ver todo) de los últimos 30 días
 * y los agrega en cliente: zona caliente (pantallas más visitadas), usuarios
 * activos y vistas por día. Para escala futura conviene una vista/RPC en SQL.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase, IS_DEMO_MODE } from '../services/supabase';

// Nombres de ruta → etiqueta legible para el admin
const SCREEN_LABELS: Record<string, string> = {
  HomeMain: 'Inicio', Tasks: 'Tareas',
  AquariumMain: 'Acuario', Parameters: 'Parámetros', Health: 'Salud',
  Calculator: 'Calculadora', Breeding: 'Reproducción',
  ExploreMain: 'Explorar', Wishlist: 'Lista de deseos',
  ProfileMain: 'Perfil', Gallery: 'Galería', Community: 'Comunidad',
  Chat: 'Chat soporte', Legal: 'Legal', Support: 'Reportar error',
  Onboarding: 'Onboarding',
};

export interface ScreenStat { screen: string; label: string; count: number; pct: number; }
export interface DayStat { day: string; count: number; }

export interface AdminAnalytics {
  totalViews:    number;
  activeUsers:   number;
  hotScreens:    ScreenStat[];
  viewsByDay:    DayStat[];
}

const EMPTY: AdminAnalytics = { totalViews: 0, activeUsers: 0, hotScreens: [], viewsByDay: [] };

export function useAdminAnalytics() {
  const [data,    setData]    = useState<AdminAnalytics>(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (IS_DEMO_MODE) { setData(EMPTY); setLoading(false); return; }
    setLoading(true);
    try {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: rows, error } = await supabase
        .from('analytics_events')
        .select('user_id, screen, created_at')
        .eq('event', 'screen_view')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error || !rows) { setData(EMPTY); setLoading(false); return; }

      const screenCount: Record<string, number> = {};
      const users = new Set<string>();
      const dayCount: Record<string, number> = {};

      for (const r of rows as any[]) {
        const s = r.screen ?? 'desconocido';
        screenCount[s] = (screenCount[s] ?? 0) + 1;
        if (r.user_id) users.add(r.user_id);
        const day = (r.created_at ?? '').slice(0, 10);
        if (day) dayCount[day] = (dayCount[day] ?? 0) + 1;
      }

      const totalViews = rows.length;
      const hotScreens: ScreenStat[] = Object.entries(screenCount)
        .map(([screen, count]) => ({
          screen,
          label: SCREEN_LABELS[screen] ?? screen,
          count,
          pct: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Últimos 7 días en orden cronológico
      const viewsByDay: DayStat[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        viewsByDay.push({ day: d, count: dayCount[d] ?? 0 });
      }

      setData({ totalViews, activeUsers: users.size, hotScreens, viewsByDay });
    } catch (e) {
      console.warn('[AdminAnalytics] load failed:', e);
      setData(EMPTY);
    }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { ...data, loading, reload };
}
