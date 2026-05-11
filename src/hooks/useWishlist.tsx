/**
 * useWishlist (#18) — User's "want list" of fish.
 * Each entry stores fish_id + note + added_at.
 * Persists to AsyncStorage in demo mode, Supabase `wishlist` in real mode.
 *
 * Required Supabase table (run in SQL editor):
 *   CREATE TABLE public.wishlist (
 *     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *     fish_id     text NOT NULL,
 *     note        text,
 *     added_at    timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "users own wishlist" ON wishlist FOR ALL TO authenticated
 *     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { useAuth } from './useAuth';

export interface WishlistItem {
  id:       string;
  fish_id:  string;
  note?:    string;
  added_at: string;
}

interface Ctx {
  items:   WishlistItem[];
  loading: boolean;
  add:     (fishId: string, note?: string) => Promise<void>;
  remove:  (fishId: string) => Promise<void>;
  isInWishlist: (fishId: string) => boolean;
  updateNote:   (fishId: string, note: string) => Promise<void>;
}

const WishlistCtx = createContext<Ctx | undefined>(undefined);
const localKey = (uid: string) => `@aquamanager_wishlist_${uid}`;

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items,   setItems]   = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    (async () => {
      if (!IS_DEMO_MODE) {
        try {
          const { data, error } = await supabase
            .from('wishlist').select('*')
            .eq('user_id', user.id).order('added_at', { ascending: false });
          if (!error && data) {
            setItems(data); setLoading(false); return;
          }
        } catch { /* fallback */ }
      }
      try {
        const raw = await AsyncStorage.getItem(localKey(user.id));
        if (raw) setItems(JSON.parse(raw));
        else setItems([]);
      } catch { setItems([]); }
      setLoading(false);
    })();
  }, [user?.id]);

  const persistLocal = useCallback(async (next: WishlistItem[]) => {
    setItems(next);
    if (user) {
      try { await AsyncStorage.setItem(localKey(user.id), JSON.stringify(next)); } catch {}
    }
  }, [user]);

  // ── Add ───────────────────────────────────────────────────────────────
  const add = useCallback(async (fishId: string, note?: string) => {
    if (!user) return;
    if (items.some(i => i.fish_id === fishId)) return; // already there

    const newItem: WishlistItem = {
      id: `w_${Date.now()}`, fish_id: fishId, note,
      added_at: new Date().toISOString(),
    };

    if (!IS_DEMO_MODE) {
      try {
        const { data, error } = await supabase
          .from('wishlist').insert({ user_id: user.id, fish_id: fishId, note }).select().single();
        if (!error && data) { setItems(prev => [data, ...prev]); return; }
      } catch { /* fallback */ }
    }
    await persistLocal([newItem, ...items]);
  }, [user, items, persistLocal]);

  // ── Remove ────────────────────────────────────────────────────────────
  const remove = useCallback(async (fishId: string) => {
    if (!user) return;
    if (!IS_DEMO_MODE) {
      try { await supabase.from('wishlist').delete().match({ user_id: user.id, fish_id: fishId }); } catch {}
    }
    await persistLocal(items.filter(i => i.fish_id !== fishId));
  }, [user, items, persistLocal]);

  const updateNote = useCallback(async (fishId: string, note: string) => {
    if (!user) return;
    if (!IS_DEMO_MODE) {
      try { await supabase.from('wishlist').update({ note }).match({ user_id: user.id, fish_id: fishId }); } catch {}
    }
    await persistLocal(items.map(i => i.fish_id === fishId ? { ...i, note } : i));
  }, [user, items, persistLocal]);

  // O(1) Set-based lookup so checking 119 fish cards is instant
  const itemIds = React.useMemo(() => new Set(items.map(i => i.fish_id)), [items]);
  const isInWishlist = useCallback((fishId: string) => itemIds.has(fishId), [itemIds]);

  return (
    <WishlistCtx.Provider value={{ items, loading, add, remove, isInWishlist, updateNote }}>
      {children}
    </WishlistCtx.Provider>
  );
}

export function useWishlist(): Ctx {
  const ctx = useContext(WishlistCtx);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
