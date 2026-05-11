/**
 * FishImage — Drop-in replacement for <Image> using expo-image.
 *
 * Fixes Wikipedia thumbnail policy change (2025):
 * Wikimedia now only allows specific thumbnail steps:
 *   20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840px
 * Any other size returns 400. We auto-fix URLs at render time.
 */
import React, { useState, useMemo } from 'react';
import { Image, ImageContentFit, ImageProps } from 'expo-image';
import { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  source: { uri: string } | number | null | undefined;
  style?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain' | 'fill' | 'center';
  placeholder?: string;
  transition?: number;
  onError?: () => void;
}

const TINY_BLUR = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

// Valid Wikimedia thumbnail steps (2025+ policy)
const WIKI_STEPS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

/**
 * Fix Wikipedia thumbnail URLs to use allowed step sizes.
 * e.g. /thumb/.../800px-Foo.jpg → /thumb/.../500px-Foo.jpg
 *
 * If the size is already valid, returns unchanged.
 * Non-Wikipedia URLs pass through untouched.
 */
function fixWikiThumbUrl(uri: string): string {
  if (!uri.includes('wikimedia.org/wikipedia/commons/thumb/')) return uri;

  const match = uri.match(/\/(\d+)px-([^/]+)$/);
  if (!match) return uri;

  const requested = parseInt(match[1], 10);
  if (WIKI_STEPS.includes(requested)) return uri;

  // Pick the largest step ≤ requested, or the smallest step ≥ requested
  const smaller = WIKI_STEPS.filter(s => s <= requested);
  const best = smaller.length > 0 ? smaller[smaller.length - 1] : WIKI_STEPS[0];

  return uri.replace(/\/\d+px-([^/]+)$/, `/${best}px-$1`);
}

export function FishImage({
  source,
  style,
  resizeMode = 'cover',
  placeholder = TINY_BLUR,
  transition = 250,
  onError,
}: Props) {
  const [failed, setFailed] = useState(false);

  const fixedSource = useMemo(() => {
    if (!source || typeof source === 'number') return source;
    if (!source.uri) return source;
    return { uri: fixWikiThumbUrl(source.uri) };
  }, [source]);

  const contentFit: ImageContentFit =
    resizeMode === 'cover' ? 'cover' :
    resizeMode === 'contain' ? 'contain' :
    resizeMode === 'fill' ? 'fill' : 'cover';

  if (failed) {
    return (
      <View style={[style as any, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F4FD' }]}>
        <Ionicons name="fish" size={32} color="#0891b2" />
      </View>
    );
  }

  return (
    <Image
      source={fixedSource}
      style={style as ImageProps['style']}
      contentFit={contentFit}
      placeholder={placeholder ? { blurhash: placeholder } : undefined}
      placeholderContentFit="cover"
      transition={transition}
      cachePolicy="memory-disk"
      recyclingKey={fixedSource && typeof fixedSource === 'object' ? fixedSource.uri : undefined}
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}

export default FishImage;
