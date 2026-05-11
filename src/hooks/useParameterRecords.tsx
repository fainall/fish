import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { ParameterRecord } from '../types';
import { useAuth } from './useAuth';

const localKey = (uid: string) => `@aquamanager_params_${uid}`;

interface ParameterRecordsContextType {
  records: ParameterRecord[];
  recordsFor:  (aquariumId: string) => ParameterRecord[];
  addRecord:   (record: Omit<ParameterRecord, 'id'>) => Promise<void>;
  deleteRecord:(id: string) => Promise<void>;
}

const ParameterRecordsContext = createContext<ParameterRecordsContextType | undefined>(undefined);

export function ParameterRecordsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [records, setRecords] = useState<ParameterRecord[]>([]);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setRecords([]); return; }

    const load = async () => {
      if (!IS_DEMO_MODE) {
        try {
          const { data, error } = await supabase
            .from('parameter_records')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: true });
          if (!error && data) { setRecords(data); return; }
        } catch { /* fallback */ }
      }
      try {
        const raw = await AsyncStorage.getItem(localKey(user.id));
        if (raw) setRecords(JSON.parse(raw));
      } catch { /* ignore */ }
    };

    load();
  }, [user?.id]);

  const persistLocal = async (list: ParameterRecord[]) => {
    setRecords(list);
    if (user) {
      try { await AsyncStorage.setItem(localKey(user.id), JSON.stringify(list)); } catch { /* ignore */ }
    }
  };

  // ── Add ───────────────────────────────────────────────────────────────────
  const addRecord = useCallback(async (record: Omit<ParameterRecord, 'id'>) => {
    if (!IS_DEMO_MODE && user) {
      try {
        const { data, error } = await supabase
          .from('parameter_records')
          .insert({ ...record, user_id: user.id })
          .select()
          .single();
        if (!error && data) { setRecords(prev => [...prev, data]); return; }
      } catch { /* fallback */ }
    }
    const full: ParameterRecord = { ...record, id: `pr-${Date.now()}` };
    await persistLocal([...records, full]);
  }, [records, user]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteRecord = useCallback(async (id: string) => {
    if (!IS_DEMO_MODE) {
      try { await supabase.from('parameter_records').delete().eq('id', id); } catch { /* fallback */ }
    }
    await persistLocal(records.filter(r => r.id !== id));
  }, [records, user]);

  const recordsFor = useCallback((aquariumId: string) =>
    records
      .filter(r => r.aquarium_id === aquariumId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [records]);

  return (
    <ParameterRecordsContext.Provider value={{ records, recordsFor, addRecord, deleteRecord }}>
      {children}
    </ParameterRecordsContext.Provider>
  );
}

export function useParameterRecords(): ParameterRecordsContextType {
  const ctx = useContext(ParameterRecordsContext);
  if (!ctx) throw new Error('useParameterRecords must be within ParameterRecordsProvider');
  return ctx;
}
