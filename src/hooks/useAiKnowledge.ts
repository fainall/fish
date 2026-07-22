/**
 * useAiKnowledge — "Entrenamiento" del Asistente de IA (solo admin).
 *
 * Supabase table: ai_knowledge
 * Cada fila es una corrección / hecho verificado que el Edge Function `fish-ai`
 * inyecta en su prompt con prioridad. RLS exige rol admin para leer/escribir.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { useAuth } from './useAuth';

export interface AiKnowledge {
  id:         string;
  topic:      string;
  content:    string;
  active:     boolean;
  created_at: string;
  updated_at: string;
}

export function useAiKnowledge() {
  const { user } = useAuth();
  const [items, setItems]   = useState<AiKnowledge[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user || IS_DEMO_MODE) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_knowledge')
        .select('*')
        .order('updated_at', { ascending: false });
      if (!error && data) setItems(data as AiKnowledge[]);
    } catch (e) { console.warn('[AiKnowledge] load failed:', e); }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { reload(); }, [reload]);

  const addItem = useCallback(async (topic: string, content: string): Promise<boolean> => {
    if (!content.trim()) return false;
    if (IS_DEMO_MODE) return true;
    try {
      const { data, error } = await supabase.from('ai_knowledge').insert({
        topic: topic.trim(), content: content.trim(), active: true,
      }).select().single();
      if (error || !data) { console.warn('[AiKnowledge] add failed:', error?.message); return false; }
      setItems(prev => [data as AiKnowledge, ...prev]);
      return true;
    } catch (e) { console.warn('[AiKnowledge] add failed:', e); return false; }
  }, []);

  const updateItem = useCallback(async (id: string, topic: string, content: string): Promise<boolean> => {
    if (!content.trim()) return false;
    if (IS_DEMO_MODE) return true;
    try {
      const { data, error } = await supabase.from('ai_knowledge')
        .update({ topic: topic.trim(), content: content.trim() })
        .eq('id', id).select().single();
      if (error || !data) return false;
      setItems(prev => prev.map(it => it.id === id ? (data as AiKnowledge) : it));
      return true;
    } catch (e) { console.warn('[AiKnowledge] update failed:', e); return false; }
  }, []);

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, active } : it));
    if (IS_DEMO_MODE) return;
    try { await supabase.from('ai_knowledge').update({ active }).eq('id', id); }
    catch (e) { console.warn('[AiKnowledge] toggle failed:', e); }
  }, []);

  const removeItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
    if (IS_DEMO_MODE) return;
    try { await supabase.from('ai_knowledge').delete().eq('id', id); }
    catch (e) { console.warn('[AiKnowledge] remove failed:', e); }
  }, []);

  return { items, loading, addItem, updateItem, toggleActive, removeItem, reload };
}
