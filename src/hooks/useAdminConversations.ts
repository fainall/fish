import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { useAuth } from './useAuth';

export interface AdminMessage {
  id:      string;
  content: string;
  sender:  'user' | 'admin' | 'ai';
  time:    string;
}

export interface AdminConversation {
  id:          string;
  userId:      string;
  userName:    string;
  lastMessage: string;
  time:        string;
  unread:      number;
  messages:    AdminMessage[];
}

// ── Demo fallback data ────────────────────────────────────────────────────────
export const ADMIN_DEMO_CONVERSATIONS: AdminConversation[] = [
  {
    id: '1', userId: 'u1', userName: 'Carlos M.',
    lastMessage: '¿Puedo poner un Betta con mis neones?',
    time: 'hace 5 min', unread: 1,
    messages: [
      { id: 'm1', content: '¿Puedo poner un Betta con mis neones?', sender: 'user', time: '10:25' },
      { id: 'm2', content: 'Hola Carlos! En general, los Bettas pueden vivir con neones si el acuario es suficientemente grande.', sender: 'ai', time: '10:25' },
    ],
  },
  {
    id: '2', userId: 'u2', userName: 'María L.',
    lastMessage: 'Mi pez tiene manchas blancas',
    time: 'hace 1h', unread: 0,
    messages: [
      { id: 'm3', content: 'Mi pez tiene manchas blancas en las aletas, ¿qué puede ser?', sender: 'user', time: '09:15' },
      { id: 'm4', content: 'Las manchas blancas pueden indicar Ich. Sube la temperatura a 28°C gradualmente y añade sal de acuario.', sender: 'ai', time: '09:16' },
    ],
  },
];

function toTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { console.warn('[AdminConv] toTime parse failed:', e); return ''; }
}

function toRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAdminConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AdminConversation[]>(
    IS_DEMO_MODE ? ADMIN_DEMO_CONVERSATIONS : []
  );
  const [loading,  setLoading]  = useState(!IS_DEMO_MODE);
  const channelRef = useRef<any>(null);

  // ── Load conversations ─────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    if (IS_DEMO_MODE) return;
    setLoading(true);
    try {
      const { data: convs, error } = await supabase
        .from('conversations')
        .select('*, users!conversations_user_id_fkey(full_name)')
        .order('updated_at', { ascending: false });

      if (error || !convs) { setLoading(false); return; }

      const list: AdminConversation[] = convs.map((c: any) => ({
        id:          c.id,
        userId:      c.user_id,
        userName:    c.users?.full_name ?? 'Usuario',
        lastMessage: c.last_message ?? '',
        time:        toRelative(c.updated_at ?? c.created_at),
        unread:      c.unread_admin ?? 0,
        messages:    [], // lazy loaded
      }));
      setConversations(list);
    } catch (e) { console.warn('[AdminConv] Reload failed:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── Realtime: new messages ─────────────────────────────────────────────────
  useEffect(() => {
    if (IS_DEMO_MODE) return;

    channelRef.current = supabase
      .channel('admin:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const msg: AdminMessage = {
            id:      payload.new.id,
            content: payload.new.content,
            sender:  payload.new.sender_role as AdminMessage['sender'],
            time:    toTime(payload.new.created_at),
          };
          setConversations(prev => prev.map(c => {
            if (c.id !== payload.new.conversation_id) return c;
            const already = c.messages.some(m => m.id === msg.id);
            return {
              ...c,
              lastMessage: msg.content,
              time:        'ahora',
              unread:      msg.sender === 'user' ? c.unread + 1 : c.unread,
              messages:    already ? c.messages : [...c.messages, msg],
            };
          }));
        }
      )
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  // ── loadMessages: lazy-load for a conversation ─────────────────────────────
  const loadMessages = useCallback(async (convId: string) => {
    if (IS_DEMO_MODE) return;

    const conv = conversations.find(c => c.id === convId);
    if (conv && conv.messages.length > 0) return; // already loaded

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at');
      if (error || !data) return;

      setConversations(prev => prev.map(c =>
        c.id === convId
          ? { ...c, messages: data.map((m: any) => ({
              id:      m.id,
              content: m.content,
              sender:  m.sender_role as AdminMessage['sender'],
              time:    toTime(m.created_at),
            }))}
          : c
      ));
    } catch (e) { console.warn('[AdminConv] loadMessages failed:', e); }
  }, [conversations]);

  // ── sendAdminReply ─────────────────────────────────────────────────────────
  const sendAdminReply = useCallback(async (convId: string, content: string) => {
    if (!content.trim()) return;

    const msg: AdminMessage = {
      id:      `adm_${Date.now()}`,
      content: content.trim(),
      sender:  'admin',
      time:    toTime(new Date().toISOString()),
    };

    // Optimistic update
    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, messages: [...c.messages, msg], lastMessage: msg.content, time: 'ahora' }
        : c
    ));

    if (!IS_DEMO_MODE) {
      try {
        const conv = conversations.find(c => c.id === convId);
        await supabase.from('messages').insert({
          conversation_id: convId,
          sender_id:       user?.id,
          sender_role:     'admin',
          content:         content.trim(),
        });
      } catch (e) { console.warn('[AdminConv] sendReply failed:', e); }
    }
  }, [conversations, user?.id]);

  // ── markRead ──────────────────────────────────────────────────────────────
  const markRead = useCallback((convId: string) => {
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, unread: 0 } : c
    ));
  }, []);

  return { conversations, loading, loadMessages, sendAdminReply, markRead };
}
