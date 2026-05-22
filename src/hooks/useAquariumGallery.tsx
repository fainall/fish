/**
 * useAquariumGallery (#14) — Photos timeline per aquarium.
 *
 * Required Supabase table:
 *   CREATE TABLE public.aquarium_photos (
 *     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *     aquarium_id   uuid NOT NULL,
 *     image_url     text NOT NULL,
 *     caption       text,
 *     taken_at      timestamptz DEFAULT now(),
 *     created_at    timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE aquarium_photos ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "users own photos" ON aquarium_photos FOR ALL TO authenticated
 *     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { useAuth } from './useAuth';

export interface GalleryPhoto {
  id:          string;
  aquarium_id: string;
  image_url:   string;
  caption?:    string | null;
  taken_at:    string;
}

interface Ctx {
  photos:    GalleryPhoto[];
  loading:   boolean;
  add:       (aquariumId: string, localUri: string, caption?: string, takenAt?: string) => Promise<GalleryPhoto | null>;
  remove:    (photoId: string) => Promise<void>;
  forAquarium: (aquariumId: string) => GalleryPhoto[];
}

const GalleryCtx = createContext<Ctx | undefined>(undefined);
const localKey = (uid: string) => `@aquamanager_gallery_${uid}`;

const MAX_DIMENSION = 1200;
const COMPRESS_QUALITY = 0.7;

async function compressImage(uri: string): Promise<string> {
  try {
    const IM = await import('expo-image-manipulator');
    const manipulate = IM.manipulateAsync ?? (IM as any).default?.manipulateAsync;
    const SaveFormat = IM.SaveFormat ?? (IM as any).default?.SaveFormat;
    if (!manipulate) return uri;
    const result = await manipulate(
      uri,
      [{ resize: { width: MAX_DIMENSION } }],
      { compress: COMPRESS_QUALITY, format: SaveFormat?.JPEG },
    );
    return result.uri;
  } catch (e) {
    console.warn('[Gallery] compressImage fallback to original:', e);
    return uri;
  }
}

function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as ArrayBuffer);
    xhr.onerror = () => reject(new Error('No se pudo leer el archivo'));
    xhr.responseType = 'arraybuffer';
    xhr.open('GET', uri, true);
    xhr.send();
  });
}

async function uploadPhoto(userId: string, aquariumId: string, localUri: string): Promise<string> {
  const compressedUri = await compressImage(localUri);
  const path = `${userId}/${aquariumId}/${Date.now()}.jpg`;

  const arrayBuffer = await readFileAsArrayBuffer(compressedUri);

  const { error } = await (supabase as any).storage.from('posts')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message ?? 'Upload failed');

  const { data } = (supabase as any).storage.from('posts').getPublicUrl(path);
  const url = data?.publicUrl as string | undefined;
  if (!url) throw new Error('No se pudo obtener la URL pública');
  return url;
}

export function AquariumGalleryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [photos,  setPhotos]  = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setPhotos([]); setLoading(false); return; }
    setLoading(true);
    (async () => {
      if (!IS_DEMO_MODE) {
        try {
          const { data, error } = await supabase
            .from('aquarium_photos').select('*')
            .eq('user_id', user.id).order('taken_at', { ascending: false });
          if (!error && data) {
            setPhotos(data); setLoading(false); return;
          }
        } catch (e) { console.warn('[Gallery] Supabase load failed:', e); }
      }
      try {
        const raw = await AsyncStorage.getItem(localKey(user.id));
        setPhotos(raw ? JSON.parse(raw) : []);
      } catch (e) { console.warn('[Gallery] Local load failed:', e); setPhotos([]); }
      setLoading(false);
    })();
  }, [user?.id]);

  const persistLocal = useCallback(async (next: GalleryPhoto[]) => {
    setPhotos(next);
    if (user) {
      try { await AsyncStorage.setItem(localKey(user.id), JSON.stringify(next)); } catch (e) { console.warn('[Gallery] Local persist failed:', e); }
    }
  }, [user]);

  const add = useCallback(async (aquariumId: string, localUri: string, caption?: string, takenAt?: string): Promise<GalleryPhoto | null> => {
    if (!user) return null;
    const taken_at = takenAt ?? new Date().toISOString();

    // Demo mode: save locally with the local file URI
    if (IS_DEMO_MODE) {
      const newPhoto: GalleryPhoto = {
        id: `g_${Date.now()}`, aquarium_id: aquariumId, image_url: localUri,
        caption, taken_at,
      };
      await persistLocal([newPhoto, ...photos]);
      return newPhoto;
    }

    // Production: upload to Supabase Storage (throws on failure)
    const remoteUrl = await uploadPhoto(user.id, aquariumId, localUri);

    const { data, error } = await supabase.from('aquarium_photos').insert({
      user_id: user.id, aquarium_id: aquariumId,
      image_url: remoteUrl, caption, taken_at,
    }).select().single();

    if (error || !data) throw new Error(error?.message ?? 'No se pudo guardar la foto');

    setPhotos(prev => [data, ...prev]);
    return data as GalleryPhoto;
  }, [user, photos, persistLocal]);

  const remove = useCallback(async (photoId: string) => {
    if (!user) return;
    if (!IS_DEMO_MODE) {
      try { await supabase.from('aquarium_photos').delete().eq('id', photoId); } catch (e) { console.warn('[Gallery] Supabase delete failed:', e); }
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
