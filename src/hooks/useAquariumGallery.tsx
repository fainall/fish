/**
 * useAquariumGallery — Photos timeline per aquarium.
 *
 * Supabase table: aquarium_photos (id, user_id, aquarium_id, image_url, caption, taken_at, created_at)
 * Supabase Storage bucket: posts
 *
 * Upload strategy (v6 — 2025-05-22):
 *   1. new File(uri).bytes() → reads file natively into a Uint8Array (SDK 54 API)
 *   2. supabase.storage.upload(path, bytes) → standard Supabase client
 *
 * Uses the NEW expo-file-system API (File class). The legacy methods
 * (getInfoAsync / readAsStringAsync) are deprecated in SDK 54 and THROW.
 *
 * Previous approaches that crashed on this device:
 *   - fetch().blob() → RN fetch can't read local file:// URIs
 *   - atob() + Uint8Array → atob crashes Hermes on large strings
 *   - XMLHttpRequest arraybuffer → can't read local file:// URIs
 *   - FileSystem.uploadAsync → causes uncatchable native crash
 *   - expo-image-manipulator → causes uncatchable native crash
 *   - FileSystem.getInfoAsync (legacy) → throws "deprecated" in SDK 54
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { File } from 'expo-file-system';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { useAuth } from './useAuth';

/* ── Types ────────────────────────────────────────────────────────────── */
export interface GalleryPhoto {
  id:          string;
  aquarium_id: string;
  image_url:   string;
  caption?:    string | null;
  taken_at:    string;
}

interface Ctx {
  photos:      GalleryPhoto[];
  loading:     boolean;
  add:         (aquariumId: string, localUri: string, caption?: string, takenAt?: string) => Promise<GalleryPhoto | null>;
  remove:      (photoId: string) => Promise<void>;
  forAquarium: (aquariumId: string) => GalleryPhoto[];
}

const GalleryCtx = createContext<Ctx | undefined>(undefined);
const localKey = (uid: string) => `@aquamanager_gallery_${uid}`;

/* ── Upload: File.bytes() → supabase.storage.upload (SDK 54 API) ─────── */
async function uploadPhoto(
  userId: string,
  aquariumId: string,
  fileUri: string,
): Promise<string> {
  // 1. Create a File reference (new expo-file-system API)
  const file = new File(fileUri);

  // 2. Verify it exists
  if (!file.exists) {
    throw new Error('El archivo no existe: ' + fileUri.slice(-40));
  }

  // 3. Read bytes natively into a Uint8Array (no base64, no atob)
  const bytes = await file.bytes();
  if (!bytes || bytes.length < 100) {
    throw new Error('Archivo vacio o corrupto (' + (bytes?.length ?? 0) + ' bytes)');
  }

  // 4. Upload via Supabase Storage client
  const storagePath = `${userId}/${aquariumId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('posts')
    .upload(storagePath, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error('Storage: ' + (error.message || JSON.stringify(error)));
  }

  // 5. Get public URL
  const { data: urlData } = supabase.storage.from('posts').getPublicUrl(storagePath);
  return urlData.publicUrl;
}

/* ── Provider ──────────────────────────────────────────────────────────── */
export function AquariumGalleryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [photos,  setPhotos]  = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // Load photos on mount
  useEffect(() => {
    if (!user) { setPhotos([]); setLoading(false); return; }
    setLoading(true);
    (async () => {
      if (!IS_DEMO_MODE) {
        try {
          const { data, error } = await supabase
            .from('aquarium_photos').select('*')
            .eq('user_id', user.id).order('taken_at', { ascending: false });
          if (!error && data) { setPhotos(data); setLoading(false); return; }
        } catch {}
      }
      try {
        const raw = await AsyncStorage.getItem(localKey(user.id));
        setPhotos(raw ? JSON.parse(raw) : []);
      } catch { setPhotos([]); }
      setLoading(false);
    })();
  }, [user?.id]);

  const persistLocal = useCallback(async (next: GalleryPhoto[]) => {
    setPhotos(next);
    if (user) {
      try { await AsyncStorage.setItem(localKey(user.id), JSON.stringify(next)); } catch {}
    }
  }, [user]);

  // Add photo
  const add = useCallback(async (
    aquariumId: string,
    localUri: string,
    caption?: string,
    takenAt?: string,
  ): Promise<GalleryPhoto | null> => {
    if (!user) return null;
    const taken_at = takenAt ?? new Date().toISOString();

    // Demo mode → local only
    if (IS_DEMO_MODE) {
      const p: GalleryPhoto = {
        id: `g_${Date.now()}`, aquarium_id: aquariumId,
        image_url: localUri, caption, taken_at,
      };
      await persistLocal([p, ...photos]);
      return p;
    }

    // Production → upload to Storage, then insert row
    const remoteUrl = await uploadPhoto(user.id, aquariumId, localUri);

    const { data, error } = await supabase.from('aquarium_photos').insert({
      user_id: user.id, aquarium_id: aquariumId,
      image_url: remoteUrl, caption, taken_at,
    }).select().single();

    if (error || !data) throw new Error(error?.message ?? 'No se pudo guardar la foto');
    setPhotos(prev => [data, ...prev]);
    return data as GalleryPhoto;
  }, [user, photos, persistLocal]);

  // Remove photo
  const remove = useCallback(async (photoId: string) => {
    if (!user) return;
    if (!IS_DEMO_MODE) {
      try { await supabase.from('aquarium_photos').delete().eq('id', photoId); } catch {}
    }
    await persistLocal(photos.filter(p => p.id !== photoId));
  }, [user, photos, persistLocal]);

  const forAquarium = useCallback(
    (aqId: string) => photos.filter(p => p.aquarium_id === aqId)
                            .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()),
    [photos],
  );

  return (
    <GalleryCtx.Provider value={{ photos, loading, add, remove, forAquarium }}>
      {children}
    </GalleryCtx.Provider>
  );
}

export function useAquariumGallery(): Ctx {
  const ctx = useContext(GalleryCtx);
  if (!ctx) throw new Error('useAquariumGallery must be used within AquariumGalleryProvider');
  return ctx;
}
