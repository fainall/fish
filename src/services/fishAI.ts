/**
 * fishAI — Llama al asistente de IA vía Supabase Edge Function `fish-ai`.
 *
 * La API key de OpenAI NUNCA está en la app: vive como secreto en la Edge
 * Function. Aquí solo invocamos la función con la sesión del usuario.
 */
import { supabase, IS_DEMO_MODE } from './supabase';

export interface AIHistoryItem { role: 'user' | 'assistant'; content: string; }

export interface AIResult {
  answer: string | null;
  /** true si falló (red, IA no configurada, etc.) → el caller usa fallback local */
  failed: boolean;
}

export async function askFishAI(question: string, history: AIHistoryItem[] = []): Promise<AIResult> {
  if (IS_DEMO_MODE) return { answer: null, failed: true };
  try {
    const { data, error } = await supabase.functions.invoke('fish-ai', {
      body: { question, history },
    });
    if (error) {
      console.warn('[fishAI] invoke error:', error.message);
      return { answer: null, failed: true };
    }
    const answer = (data as any)?.answer;
    if (typeof answer === 'string' && answer.trim()) {
      return { answer: answer.trim(), failed: false };
    }
    return { answer: null, failed: true };
  } catch (e) {
    console.warn('[fishAI] failed:', e);
    return { answer: null, failed: true };
  }
}
