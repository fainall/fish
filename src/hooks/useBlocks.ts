/**
 * useBlocks — Bloqueo de usuarios en la comunidad.
 *
 * Supabase table: user_blocks (blocker_id, blocked_id)
 * RLS: cada usuario solo ve/edita sus propios bloqueos.
 *
 * Cuando bloqueas a alguien, sus posts y comentarios se filtran del feed
 * (ver useCommunity). Es requisito de Play Store para apps con UGC.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { useAuth } from './useAuth';

export function useBlocks() {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user || IS_DEMO_MODE) { setBlocked(new Set()); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);
      if (!error && data) {
        setBlocked(new Set((data as { blocked_id: string }[]).map(r => r.blocked_id)));
      }
    } catch (e) { console.warn('[Blocks] load failed:', e); }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { reload(); }, [reload]);

  const block = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user || !targetUserId || targetUserId === user.id) return false;
    setBlocked(prev => new Set(prev).add(targetUserId));
    if (IS_DEMO_MODE) return true;
    try {
      const { error } = await supabase.from('user_blocks').insert({
        blocker_id: user.id, blocked_id: targetUserId,
      });
      if (error && !/duplicate/i.test(error.message)) {
        // rollback
        setBlocked(prev => { const s = new Set(prev); s.delete(targetUserId); return s; });
        console.warn('[Blocks] block failed:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      setBlocked(prev => { const s = new Set(prev); s.delete(targetUserId); return s; });
      console.warn('[Blocks] block failed:', e);
      return false;
    }
  }, [user?.id]);

  const unblock = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user) return false;
    setBlocked(prev => { const s = new Set(prev); s.delete(targetUserId); return s; });
    if (IS_DEMO_MODE) return true;
    try {
      await supabase.from('user_blocks')
        .delete()
        .match({ blocker_id: user.id, blocked_id: targetUserId });
      return true;
    } catch (e) { console.warn('[Blocks] unblock failed:', e); return false; }
  }, [user?.id]);

  const isBlocked = useCallback((uid: string) => blocked.has(uid), [blocked]);

  return { blocked, loading, block, unblock, isBlocked, reload };
}
