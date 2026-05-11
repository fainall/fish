/**
 * useFishImagePrefetch — On app boot, silently prefetch all fish images
 * to the persistent disk cache so they appear instantly thereafter.
 *
 * Uses expo-image's Image.prefetch which respects the same cache as
 * <FishImage> (memory + disk).
 *
 * Applies the same Wikipedia thumbnail URL fix as FishImage component.
 */
import { useEffect } from 'react';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FISH_DATABASE } from '../data/fishDatabase';

const PREFETCH_KEY = '@aquamanager_images_prefetched_v2'; // v2: fixed wiki URLs

// Same valid steps as FishImage.tsx
const WIKI_STEPS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

function fixWikiThumbUrl(uri: string): string {
  if (!uri.includes('wikimedia.org/wikipedia/commons/thumb/')) return uri;
  const match = uri.match(/\/(\d+)px-([^/]+)$/);
  if (!match) return uri;
  const requested = parseInt(match[1], 10);
  if (WIKI_STEPS.includes(requested)) return uri;
  const smaller = WIKI_STEPS.filter(s => s <= requested);
  const best = smaller.length > 0 ? smaller[smaller.length - 1] : WIKI_STEPS[0];
  return uri.replace(/\/\d+px-([^/]+)$/, `/${best}px-$1`);
}

export function useFishImagePrefetch() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const done = await AsyncStorage.getItem(PREFETCH_KEY);
        if (done === '1') return;

        await new Promise(resolve => setTimeout(resolve, 2000));
        if (cancelled) return;

        const urls = FISH_DATABASE
          .map(f => f.image_url)
          .filter((u): u is string => !!u)
          .map(fixWikiThumbUrl);

        const BATCH = 6;
        for (let i = 0; i < urls.length; i += BATCH) {
          if (cancelled) return;
          const batch = urls.slice(i, i + BATCH);
          await Promise.allSettled(batch.map(u => Image.prefetch(u)));
        }

        await AsyncStorage.setItem(PREFETCH_KEY, '1');
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, []);
}
