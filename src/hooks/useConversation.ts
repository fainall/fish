import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { useAuth } from './useAuth';

export interface ChatMessage {
  id:         string;
  content:    string;
  sender:     'user' | 'admin' | 'ai';
  created_at: string;
}

const WELCOME: ChatMessage = {
  id:         'welcome',
  content:    '¡Hola! Soy el asistente de Aquaria. Puedes preguntarme sobre cuidado de peces, parámetros de agua, compatibilidad y más. El administrador también estará disponible para ayudarte personalmente.',
  sender:     'ai',
  created_at: new Date().toISOString(),
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useConversation() {
  const { user } = useAuth();
  const [messages,       setMessages]       = useState<ChatMessage[]>([WELCOME]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading,        setLoading]        = useState(false);
  const channelRef = useRef<any>(null);

  // ── Bootstrap: find or create conversation ────────────────────────────────
  useEffect(() => {
    if (IS_DEMO_MODE || !user) return;

    const bootstrap = async () => {
      try {
        // Find existing conversation
        let { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!conv) {
          // Create one
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({ user_id: user.id, subject: 'Soporte general' })
            .select('id')
            .maybeSingle();
          conv = newConv;
        }

        if (!conv) return;
        setConversationId(conv.id);

        // Load existing messages
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at');

        if (msgs && msgs.length > 0) {
          setMessages([WELCOME, ...msgs.map(rowToMsg)]);
        }

        // Realtime subscription for new messages
        channelRef.current = supabase
          .channel(`conv:${conv.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
            (payload: any) => {
              const msg = rowToMsg(payload.new);
              // Only add if not the user's own message (we add those optimistically)
              if (msg.sender !== 'user') {
                setMessages(prev => [...prev, msg]);
              }
            }
          )
          .subscribe();

      } catch (e) { console.warn('[Conversation] Bootstrap failed:', e); }
    };

    bootstrap();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user?.id]);

  // ── sendMessage ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (content: string): Promise<string> => {
    const optimistic: ChatMessage = {
      id:         `msg_${Date.now()}`,
      content,
      sender:     'user',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    if (!IS_DEMO_MODE && conversationId) {
      try {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id:       user?.id,
          sender_role:     'user',
          content,
        });
      } catch (e) { console.warn('[Conversation] sendMessage failed:', e); }
    }

    return content; // return input so caller can generate AI response
  }, [conversationId, user?.id]);

  // ── addAIMessage ──────────────────────────────────────────────────────────
  const addAIMessage = useCallback((content: string) => {
    const msg: ChatMessage = {
      id:         `ai_${Date.now()}`,
      content,
      sender:     'ai',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
    // AI messages are local-only (not persisted to DB)
  }, []);

  return { messages, loading, sendMessage, addAIMessage };
}

// ── Mapper ────────────────────────────────────────────────────────────────────
function rowToMsg(row: any): ChatMessage {
  return {
    id:         row.id,
    content:    row.content,
    sender:     (row.sender_role ?? 'user') as ChatMessage['sender'],
    created_at: row.created_at,
  };
}
