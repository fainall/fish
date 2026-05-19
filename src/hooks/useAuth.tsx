import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { User } from '../types';

const SESSION_KEY     = '@aquamanager_session';
const REGISTERED_KEY  = '@aquamanager_registered_users';

interface GoogleUserInfo {
  id: string; email: string; name: string;
  picture?: string; given_name?: string; family_name?: string;
  /** JWT id_token from Google — used with supabase.auth.signInWithIdToken in real mode */
  idToken?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn:           (email: string, password: string) => Promise<{ error: string | null }>;
  signUp:           (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signInWithGoogle: (googleUser: GoogleUserInfo) => Promise<{ error: string | null }>;
  signOut:          () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Helpers de registro local (demo mode) ─────────────────────────────────────
async function loadRegistered() {
  try {
    const raw = await AsyncStorage.getItem(REGISTERED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, User & { password: string }>) : {};
  } catch (e) { console.warn('[Auth] loadRegistered failed:', e); return {}; }
}
async function saveRegistered(users: Record<string, User & { password: string }>) {
  await AsyncStorage.setItem(REGISTERED_KEY, JSON.stringify(users));
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = async (u: User) => AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
  const clear   = async () => { await AsyncStorage.removeItem(SESSION_KEY); setUser(null); };

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 1. Supabase session (modo real)
      if (!IS_DEMO_MODE) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await fetchProfile(session.user.id);
            if (profile && mounted) { setUser(profile); setLoading(false); return; }
          }
        } catch (e) { console.warn('[Auth] Supabase session check failed:', e); }
      }

      // 2. Sesión local (AsyncStorage)
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw && mounted) setUser(JSON.parse(raw));
      } catch (e) { console.warn('[Auth] Local session load failed:', e); }

      if (mounted) setLoading(false);
    };

    init();

    // Listener de cambio de sesión Supabase
    if (!IS_DEMO_MODE) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (!mounted) return;
          if (session?.user) {
            const profile = await fetchProfile(session.user.id);
            if (profile && mounted) { setUser(profile); persist(profile); }
          } else if (_event === 'SIGNED_OUT' && mounted) {
            clear();
          }
        }
      );
      return () => { mounted = false; subscription.unsubscribe(); };
    }

    return () => { mounted = false; };
  }, []);

  // ── Fetch profile from Supabase ────────────────────────────────────────────
  async function fetchProfile(id: string): Promise<User | null> {
    try {
      const { data } = await supabase.from('users').select('*').eq('id', id).single();
      return data ?? null;
    } catch (e) { console.warn('[Auth] fetchProfile failed:', e); return null; }
  }

  // ── Sign in ────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const key = email.toLowerCase().trim();

    // Supabase (modo real)
    if (!IS_DEMO_MODE) {
      const { error } = await supabase.auth.signInWithPassword({ email: key, password });
      if (error) return { error: 'Credenciales incorrectas.' };
      return { error: null };
    }

    // Usuarios registrados localmente
    const registered = await loadRegistered();
    const localUser = registered[key];
    if (localUser && password === localUser.password) {
      const { password: _, ...u } = localUser;
      setUser(u); await persist(u);
      return { error: null };
    }

    return { error: 'Credenciales incorrectas.' };
  };

  // ── Sign up ────────────────────────────────────────────────────────────────
  const signUp = async (
    email: string, password: string, fullName: string,
  ): Promise<{ error: string | null; needsConfirmation?: boolean }> => {
    const key = email.toLowerCase().trim();
    // Supabase (modo real)
    if (!IS_DEMO_MODE) {
      const { data, error } = await supabase.auth.signUp({
        email: key, password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        // Translate common Supabase errors to Spanish
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists')) {
          return { error: 'Este correo ya está registrado. Inicia sesión o usa otro.' };
        }
        if (msg.includes('disabled') || msg.includes('signup')) {
          return { error: 'El registro por correo está deshabilitado. Contacta al admin.' };
        }
        if (msg.includes('database error')) {
          return { error: 'Error interno del servidor. (Falta configurar trigger en Supabase: profile creation)' };
        }
        return { error: error.message };
      }
      if (!data.user) return { error: 'Error al crear la cuenta. Inténtalo de nuevo.' };

      // Si NO hay sesión inmediata, Supabase está exigiendo confirmación de email.
      if (!data.session) {
        return {
          error: null,
          needsConfirmation: true,
        };
      }

      // Sesión activa — set user IMMEDIATELY (don't wait for onAuthStateChange listener,
      // which can race with navigation and leave the user on the Login screen).
      // 1. Try to fetch the profile created by the DB trigger
      let profile = await fetchProfile(data.user.id);
      // 2. If trigger hasn't run yet OR public.users row doesn't exist,
      //    construct a profile from auth data so the user can enter the app.
      if (!profile) {
        profile = {
          id:         data.user.id,
          email:      key,
          full_name:  fullName.trim(),
          role:       'user',
          created_at: data.user.created_at ?? new Date().toISOString(),
        } as User;
      }
      setUser(profile);
      await persist(profile);
      return { error: null };
    }

    // Registro local (demo mode)
    const registered = await loadRegistered();
    if (registered[key]) return { error: 'Este correo ya está registrado.' };
    const newUser: User & { password: string } = {
      id: `local-${Date.now()}`, email: key, full_name: fullName.trim(),
      role: 'user', created_at: new Date().toISOString(), password,
    };
    registered[key] = newUser;
    await saveRegistered(registered);
    const { password: _, ...u } = newUser;
    setUser(u); await persist(u);
    return { error: null };
  };

  // ── Sign in with Google ────────────────────────────────────────────────────
  const signInWithGoogle = async (_googleUser: GoogleUserInfo): Promise<{ error: string | null }> => {
    return { error: 'Google Sign-In no está disponible.' };
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const signOut = async () => {
    if (!IS_DEMO_MODE) { try { await supabase.auth.signOut(); } catch (e) { console.warn('[Auth] signOut failed:', e); } }
    await clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
