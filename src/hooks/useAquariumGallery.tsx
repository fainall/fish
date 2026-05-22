/**
 * useAquariumGallery — Photos timeline per aquarium.
 *
 * Supabase table: aquarium_photos (id, user_id, aquarium_id, image_url, caption, taken_at, created_at)
 * Supabase Storage bucket: posts
 *
 * Upload strategy (v5 — 2025-05-22):
 *   1. FileSystem.readAsStringAsync → base64 string (native Expo API, never crashes)
 *   2. base64ToArrayBuffer → pure JS decoder (no atob, no external package)
 *   3. supabase.storage.upload(path, arrayBuffer) → standard Supabase client
 *
 * Previous approaches that crashed on this device:
 *   - fetch().blob() → RN fetch can't read local file:// URIs
 *   - atob() + Uint8Array → atob crashes Hermes on large strings
 *   - XMLHttpRequest arraybuffer → can't read local file:// URIs
 *   - FileSystem.uploadAsync → causes uncatchable native crash
 *   - expo-image-manipulator → causes uncatchable native crash
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
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

/* ── Pure-JS base64 → ArrayBuffer (no atob, no external deps) ────────── */
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  let bufLen = Math.floor(base64.length * 0.75);
  if (base64.length > 0 && base64[base64.length - 1] === '=') bufLen--;
  if (base64.length > 1 && base64[base64.length - 2] === '=') bufLen--;

  const bytes = new Uint8Array(bufLen);
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const a = B64_LOOKUP[base64.charCodeAt(i)];
    const b = B64_LOOKUP[base64.charCodeAt(i + 1)];
    const c = B64_LOOKUP[base64.charCodeAt(i + 2)];
    const d = B64_LOOKUP[base64.charCodeAt(i + 3)];
    bytes[p++] = (a << 2) | (b >> 4);
    bytes[p++] = ((b & 15) << 4) | (c >> 2);
    bytes[p++] = ((c & 3) << 6) | (d & 63);
  }
  return bytes.buffer;
}

/* ── Upload: read base64 → decode → supabase.storage.upload ──────────── */
async function uploadPhoto(
  userId: string,
  aquariumId: string,
  fileUri: string,
): Promise<string> {
  // 1. Verify file exists
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) {
    throw new Error('El archivo no existe: ' + fileUri.slice(-40));
  }

  // 2. Read file as base64 (stays in native until returned as string)
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!base64 || base64.length < 100) {
    throw new Error('Archivo vacio o corrupto (base64 len=' + base64.length + ')');
  }

  // 3. Decode base64 → ArrayBuffer (pure JS, no native calls)
  const arrayBuffer = base64ToArrayBuffer(base64);

  // 4. Upload via Supabase Storage client
  const storagePath = `${userId}/${aquariumId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from('posts')
    .upload(storagePath, arrayBuffer, {
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
