/**
 * analytics — Rastreo de uso propio (zona caliente).
 *
 * Registra eventos de uso en Supabase (tabla analytics_events) para saber
 * qué pantallas/funciones usa más la gente. Sin terceros, sin costo extra.
 *
 * - Fire-and-forget: nunca bloquea la UI ni lanza errores hacia arriba.
 * - No registra en modo demo ni en desarrollo (__DEV__) para no contaminar
 *   las métricas con navegación de pruebas locales.
 * - Solo registra usuarios autenticados (necesitamos user_id).
 *
 * El uid se setea desde AuthProvider (setAnalyticsUser) para no consultar la
 * sesión en cada cambio de pantalla.
 */
import { supabase, IS_DEMO_MODE } from './supabase';

let currentUid: string | null = null;

/** Llamado por AuthProvider cuando cambia el usuario. */
export function setAnalyticsUser(uid: string | null) {
  currentUid = uid;
}

function send(event: string, screen?: string) {
  if (IS_DEMO_MODE || __DEV__ || !currentUid) return;
  try {
    // Fire-and-forget — se traga cualquier error de red/permiso.
    supabase
      .from('analytics_events')
      .insert({ user_id: currentUid, event, screen: screen ?? null })
      .then(() => {}, () => {});
  } catch {
    /* nunca propagar */
  }
}

/** Registra que el usuario abrió una pantalla (zona caliente). */
export function logScreenView(screen: string) {
  send('screen_view', screen);
}

/** Registra una acción concreta (uso futuro: 'add_fish', 'create_post', etc.). */
export function trackEvent(event: string, screen?: string) {
  send(event, screen);
}
