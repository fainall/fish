/**
 * useAquariumGallery — Photos timeline per aquarium.
 *
 * Supabase table: aquarium_photos (id, user_id, aquarium_id, image_url, caption, taken_at, created_at)
 * Supabase Storage bucket: posts
 *
 * Upload uses expo-file-system uploadAsync (streams from disk, never loads into JS memory).
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase, IS_DEMO_MODE, SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabase';
import { useAuth } from './useAuth';

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

/* ── Upload a photo to Supabase Storage via native HTTP (no JS memory) ─── */
async function nativeUpload(userId: string, aquariumId: string, fileUri: string): Promise<string> {
  const storagePath = `${userId}/${aquariumId}/${Date.now()}.jpg`;

  // Get auth token
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token ?? SUPABASE_ANON_KEY;

  // Dynamic import expo-file-system
  const FS = await import('expo-file-system');
  const uploadAsync = FS.uploadAsync ?? (FS as any).default?.uploadAsync;
  const UploadType  = (FS as any).FileSystemUploadType ?? (FS as any).default?.FileSystemUploadType;

  if (!uploadAsync || !UploadType) {
    throw new Error('expo-file-system uploadAsync no disponible');
  }

  // Upload directly from disk → Supabase Storage REST API
  const url = `${SUPABASE_URL}/storage/v1/object/posts/${storagePath}`;
  const res = await uploadAsync(url, fileUri, {
    httpMethod: 'POST',
    uploadType: UploadType.BINARY_CONTENT,
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'false',
    },
  });

  if (!res || res.status < 200 || res.status >= 300) {
    let msg = `HTTP ${res?.status ?? 'unknown'}`;
    try { const b = JSON.parse(res.body); msg = b.message ?? b.error ?? msg; } catch {}
    throw new Error(msg);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/posts/${storagePath}`;
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
  const add = useCallback(async (aquariumId: string, localUri: string, caption?: string, takenAt?: string): Promise<GalleryPhoto | null> => {
    if (!user) return null;
    const taken_at = takenAt ?? new Date().toISOString();

    // Demo mode → local only
    if (IS_DEMO_MODE) {
      const p: GalleryPhoto = { id: `g_${Date.now()}`, aquarium_id: aquariumId, image_url: localUri, caption, taken_at };
      await persistLocal([p, ...photos]);
      return p;
    }

    // Production → upload to Storage, then insert row
    const remoteUrl = await nativeUpload(user.id, aquariumId, localUri);

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
