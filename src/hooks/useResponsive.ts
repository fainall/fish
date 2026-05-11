/**
 * useResponsive — Responsive scaling utilities for multi-device support.
 *
 * Design baseline: iPhone SE / 375px width.
 * Scales proportionally up to tablets (~1024px).
 *
 * Usage:
 *   const { wp, hp, fs, isTablet, isSmall } = useResponsive();
 *   style={{ width: wp(25), fontSize: fs(16), padding: wp(4) }}
 */
import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

// Design baseline (iPhone SE)
const BASE_WIDTH  = 375;
const BASE_HEIGHT = 812;

// Breakpoints
const SMALL_PHONE  = 360;  // iPhone SE, Galaxy S10e
const TABLET_MIN   = 600;  // iPad Mini portrait, large Android tablets

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isTablet   = width >= TABLET_MIN;
    const isSmall    = width <= SMALL_PHONE;
    const isLandscape = width > height;

    // Scale factor relative to baseline
    const scaleW = width / BASE_WIDTH;
    const scaleH = height / BASE_HEIGHT;

    /**
     * wp — Width percentage: converts a % of screen width to pixels.
     * wp(50) = half the screen width.
     */
    const wp = (pct: number) => Math.round((pct / 100) * width);

    /**
     * hp — Height percentage: converts a % of screen height to pixels.
     * hp(50) = half the screen height.
     */
    const hp = (pct: number) => Math.round((pct / 100) * height);

    /**
     * s — Scale a pixel value proportionally to screen width.
     * Clamped: won't shrink below 0.85x or grow above 1.4x on tablets.
     * Use for padding, margins, icon sizes, image dimensions.
     * s(16) on 375px = 16, on 428px ≈ 18, on 768px ≈ 22 (clamped)
     */
    const s = (size: number) => {
      const factor = Math.min(1.4, Math.max(0.85, scaleW));
      return Math.round(size * factor);
    };

    /**
     * fs — Font scaling. More conservative than `s()` to keep text readable.
     * Clamped: won't shrink below 0.9x or grow above 1.25x.
     */
    const fs = (size: number) => {
      const factor = Math.min(1.25, Math.max(0.9, scaleW));
      return Math.round(size * factor * 10) / 10;
    };

    /**
     * columns — Suggests number of grid columns for cards/items.
     */
    const columns = (minItemWidth: number) => {
      const available = width - 40; // minus horizontal padding
      return Math.max(1, Math.floor(available / minItemWidth));
    };

    return {
      width, height,
      isTablet, isSmall, isLandscape,
      scaleW, scaleH,
      wp, hp, s, fs,
      columns,
    };
  }, [width, height]);
}
