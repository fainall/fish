import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { FishSuggestion, SuggestionStatus } from '../types';

const LOCAL_KEY = '@aquamanager_fish_suggestions';

interface FishSuggestionsContextType {
  suggestions: FishSuggestion[];
  pendingCount: number;
  addSuggestion:    (data: Omit<FishSuggestion, 'id' | 'status' | 'created_at'>) => Promise<void>;
  approveSuggestion:(id: string) => Promise<FishSuggestion | null>;
  rejectSuggestion: (id: string, reason?: string) => Promise<void>;
  deleteSuggestion: (id: string) => Promise<void>;
}

const FishSuggestionsContext = createContext<FishSuggestionsContextType | undefined>(undefined);

export function FishSuggestionsProvider({ children }: { children: React.ReactNode }) {
  const [suggestions, setSuggestions] = useState<FishSuggestion[]>([]);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!IS_DEMO_MODE) {
        try {
          const { data, error } = await supabase
            .from('fish_suggestions').select('*').order('created_at', { ascending: false });
          if (!error && data) { setSuggestions(data); return; }
        } catch (e) { console.warn('[Suggestions] Supabase op failed:', e); }
      }
      try {
        const raw = await AsyncStorage.getItem(LOCAL_KEY);
        if (raw) setSuggestions(JSON.parse(raw));
      } catch (e) { console.warn('[Suggestions] Op failed:', e); }
    };
    load();
  }, []);

  const persistLocal = async (list: FishSuggestion[]) => {
    setSuggestions(list);
    try { await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch (e) { console.warn('[Suggestions] Op failed:', e); }
  };

  // ── Add ───────────────────────────────────────────────────────────────────
  const addSuggestion = async (data: Omit<FishSuggestion, 'id' | 'status' | 'created_at'>) => {
    if (!IS_DEMO_MODE) {
      try {
        // Let Supabase generate the UUID — don't pass a local id
        const { data: row, error } = await supabase
          .from('fish_suggestions')
          .insert({ ...data, status: 'pending' })
          .select()
          .single();
        if (!error && row) { setSuggestions(prev => [row, ...prev]); return; }
      } catch (e) { console.warn('[Suggestions] Supabase op failed:', e); }
    }
    // Local fallback (demo mode)
    const suggestion: FishSuggestion = {
      ...data, id: `suggestion-${Date.now()}`,
      status: 'pending', created_at: new Date().toISOString(),
    };
    await persistLocal([...suggestions, suggestion]);
  };

  // ── Approve ───────────────────────────────────────────────────────────────
  const approveSuggestion = async (id: string): Promise<FishSuggestion | null> => {
    const s = suggestions.find(s => s.id === id);
    if (!s) return null;
    const now = new Date().toISOString();
    if (!IS_DEMO_MODE) {
      try {
        await supabase.from('fish_suggestions')
          .update({ status: 'approved', reviewed_at: now }).eq('id', id);
      } catch (e) { console.warn('[Suggestions] Op failed:', e); }
    }
    await persistLocal(suggestions.map(s =>
      s.id === id ? { ...s, status: 'approved' as SuggestionStatus, reviewed_at: now } : s
    ));
    return s;
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const rejectSuggestion = async (id: string, reason?: string) => {
    const now = new Date().toISOString();
    if (!IS_DEMO_MODE) {
      try {
        await supabase.from('fish_suggestions')
          .update({ status: 'rejected', reviewed_at: now, reject_reason: reason }).eq('id', id);
      } catch (e) { console.warn('[Suggestions] Op failed:', e); }
    }
    await persistLocal(suggestions.map(s =>
      s.id === id
        ? { ...s, status: 'rejected' as SuggestionStatus, reviewed_at: now, reject_reason: reason }
        : s
    ));
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteSuggestion = async (id: string) => {
    if (!IS_DEMO_MODE) {
      try { await supabase.from('fish_suggestions').delete().eq('id', id); } catch (e) { console.warn('[Suggestions] Op failed:', e); }
    }
    await persistLocal(suggestions.filter(s => s.id !== id));
  };

  return (
    <FishSuggestionsContext.Provider value={{
      suggestions, pendingCount: suggestions.filter(s => s.status === 'pending').length,
      addSuggestion, approveSuggestion, rejectSuggestion, deleteSuggestion,
    }}>
      {children}
    </FishSuggestionsContext.Provider>
  );
}

export function useFishSuggestions(): FishSuggestionsContextType {
  const ctx = useContext(FishSuggestionsContext);
  if (!ctx) throw new Error('useFishSuggestions must be within FishSuggestionsProvider');
  return ctx;
}
