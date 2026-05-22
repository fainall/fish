import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const URL  = process.env.EXPO_PUBLIC_SUPABASE_URL      ?? '';
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Exposed for native file uploads via expo-file-system */
export const SUPABASE_URL = URL;
export const SUPABASE_ANON_KEY = ANON;

/** true → sin Supabase, usa AsyncStorage local */
export const IS_DEMO_MODE = !URL || URL.includes('YOUR_') || !ANON || ANON.includes('PEGA_');

// ── Cliente real ──────────────────────────────────────────────────────────────
function buildRealClient(): SupabaseClient {
  return createClient(URL, ANON, {
    auth: {
      storage:           Platform.OS === 'web' ? undefined : (AsyncStorage as any),
      autoRefreshToken:  true,
      persistSession:    true,
      detectSessionInUrl: false,
    },
  });
}

// ── Cliente mock (demo) ───────────────────────────────────────────────────────
function buildMockClient() {
  const empty = async () => ({ data: null, error: null });
  const list  = async () => ({ data: [],   error: null });

  const chainable = () => {
    const obj: any = {
      eq:     () => obj,
      neq:    () => obj,
      match:  () => obj,
      order:  () => obj,
      limit:  () => obj,
      single: empty,
      then:   (resolve: any) => resolve({ data: null, error: null }),
    };
    return obj;
  };

  return {
    auth: {
      getSession:          async () => ({ data: { session: null }, error: null }),
      onAuthStateChange:   (_e: any, _cb: any) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword:  async () => ({ data: null, error: { message: 'demo' } }),
      signInWithIdToken:   async () => ({ data: null, error: { message: 'demo' } }),
      signUp:              async () => ({ data: { user: null }, error: { message: 'demo' } }),
      signOut:             async () => ({ error: null }),
    },
    from: (_table: string) => ({
      select:  (_cols?: string) => chainable(),
      insert:  (_data: any)     => chainable(),
      update:  (_data: any)     => chainable(),
      upsert:  (_data: any, _opts?: any) => chainable(),
      delete:  ()               => chainable(),
    }),
    channel:       (_n: string) => ({ on: () => ({ subscribe: () => {} }) }),
    removeChannel: () => {},
    storage: {
      from: (_bucket: string) => ({
        upload:        async (_p: string, _f: any, _o?: any) => ({ data: null, error: { message: 'demo' } }),
        getPublicUrl:  (_p: string) => ({ data: { publicUrl: '' } }),
        remove:        async (_paths: string[]) => ({ data: null, error: null }),
        download:      async (_p: string) => ({ data: null, error: { message: 'demo' } }),
      }),
    },
  };
}

export const supabase = (IS_DEMO_MODE ? buildMockClient() : buildRealClient()) as unknown as SupabaseClient;
