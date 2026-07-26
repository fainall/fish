/**
 * useTickets — Soporte / reporte de errores.
 *
 * Supabase table: support_tickets
 * Las capturas se suben al bucket 'posts' bajo tickets/{uid}/.
 *
 * RLS auto-filtra: un usuario normal solo ve SUS tickets; un admin ve TODOS.
 * Por eso el mismo `select('*')` sirve para la pantalla de usuario y el panel admin.
 */
import { useState, useEffect, useCallback } from 'react';
import { File } from 'expo-file-system';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { useAuth } from './useAuth';

export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketCategory = 'bug' | 'suggestion' | 'other' | 'report';
export type ReportTarget   = 'post' | 'comment' | 'user';

export interface SupportTicket {
  id:              string;
  user_id:         string;
  user_name:       string;
  category:        TicketCategory;
  description:     string;
  image_url?:      string | null;
  status:          TicketStatus;
  created_at:      string;
  target_type?:    ReportTarget | null;
  target_id?:      string | null;
  target_user_id?: string | null;
}

export function useTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user || IS_DEMO_MODE) { setTickets([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setTickets(data as SupportTicket[]);
    } catch (e) { console.warn('[Tickets] load failed:', e); }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { reload(); }, [reload]);

  // Sube la captura al bucket posts (API File de SDK 54 — sin crash nativo)
  const uploadShot = async (uid: string, localUri: string): Promise<string | null> => {
    try {
      const file = new File(localUri);
      if (!file.exists) return null;
      const bytes = await file.bytes();
      const path = `tickets/${uid}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('posts').upload(path, bytes, {
        contentType: 'image/jpeg', upsert: false,
      });
      if (error) return null;
      const { data } = supabase.storage.from('posts').getPublicUrl(path);
      return data?.publicUrl ?? null;
    } catch (e) { console.warn('[Tickets] screenshot upload failed:', e); return null; }
  };

  const createTicket = useCallback(async (
    category: TicketCategory,
    description: string,
    localImageUri?: string,
  ): Promise<boolean> => {
    if (!user || !description.trim()) return false;
    if (IS_DEMO_MODE) return true; // demo: no-op success

    let image_url: string | null = null;
    if (localImageUri) image_url = await uploadShot(user.id, localImageUri);

    try {
      const { data, error } = await supabase.from('support_tickets').insert({
        user_id:     user.id,
        user_name:   user.full_name ?? 'Usuario',
        category,
        description: description.trim(),
        image_url,
      }).select().single();
      if (error || !data) return false;
      setTickets(prev => [data as SupportTicket, ...prev]);
      return true;
    } catch (e) { console.warn('[Tickets] create failed:', e); return false; }
  }, [user]);

  // Reportar contenido (post/comentario/usuario). Reusa support_tickets con
  // categoria 'report' + target_type/target_id. El admin lo ve en la pestana
  // Tickets junto con los bugs/sugerencias.
  const reportContent = useCallback(async (
    target: ReportTarget,
    targetId: string,
    targetUserId: string | null,
    reason: string,
  ): Promise<boolean> => {
    if (!user || !reason.trim()) return false;
    if (IS_DEMO_MODE) return true;
    try {
      const { data, error } = await supabase.from('support_tickets').insert({
        user_id:        user.id,
        user_name:      user.full_name ?? 'Usuario',
        category:       'report',
        description:    reason.trim(),
        target_type:    target,
        target_id:      targetId,
        target_user_id: targetUserId,
      }).select().single();
      if (error || !data) { console.warn('[Tickets] report failed:', error?.message); return false; }
      setTickets(prev => [data as SupportTicket, ...prev]);
      return true;
    } catch (e) { console.warn('[Tickets] report failed:', e); return false; }
  }, [user]);

  // Admin: cambiar estado (RLS exige rol admin)
  const updateStatus = useCallback(async (id: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (!IS_DEMO_MODE) {
      try { await supabase.from('support_tickets').update({ status }).eq('id', id); }
      catch (e) { console.warn('[Tickets] updateStatus failed:', e); }
    }
  }, []);

  return { tickets, loading, createTicket, reportContent, updateStatus, reload };
}
