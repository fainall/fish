/**
 * Reanimated animation utilities — GSAP/Lenis-style scroll effects for React Native.
 *
 * Drop-in wrappers for parallax, scroll-triggered reveals, staggered lists,
 * scale-on-press, and spring entries.
 */
import React, { useCallback } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
  SharedValue,
  runOnJS,
} from 'react-native-reanimated';

// ── Scroll context ───────────────────────────────────────────────────────────
/** Returns { scrollY, scrollHandler } for an Animated.ScrollView */
export function useScrollAnimations() {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  return { scrollY, scrollHandler };
}

// ── Parallax header ──────────────────────────────────────────────────────────
/** Parallax style: moves at 0.5× scroll speed, fades out after `fadeEnd` px */
export function useParallaxStyle(scrollY: SharedValue<number>, height = 200, fadeEnd = 250) {
  return useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, height], [0, -height * 0.5], Extrapolation.CLAMP) }],
    opacity: interpolate(scrollY.value, [0, fadeEnd], [1, 0.3], Extrapolation.CLAMP),
  }));
}

// ── Shrinking header on scroll ───────────────────────────────────────────────
export function useShrinkHeaderStyle(scrollY: SharedValue<number>, from = 1, to = 0.85, scrollRange = 150) {
  return useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollY.value, [0, scrollRange], [from, to], Extrapolation.CLAMP) }],
    opacity: interpolate(scrollY.value, [0, scrollRange], [1, 0.7], Extrapolation.CLAMP),
  }));
}

// ── Scroll-triggered reveal ──────────────────────────────────────────────────
/**
 * Fades + slides up when scroll reaches `triggerOffset`.
 * Use one per section/card.
 */
export function useScrollRevealStyle(
  scrollY: SharedValue<number>,
  triggerOffset: number,
  distance = 40,
  range = 120,
) {
  return useAnimatedStyle(() => {
    const start = Math.max(0, triggerOffset - range);
    const end = triggerOffset;
    return {
      opacity: interpolate(scrollY.value, [start, end], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [start, end],
            [distance, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });
}

// ── Staggered entry (index-based, no scroll) ─────────────────────────────────
/**
 * Each item fades + slides up with a staggered delay.
 * Great for lists, stat cards, grid items.
 */
export function useStaggerStyle(index: number, baseDelay = 80, duration = 500) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  React.useEffect(() => {
    const delay = Math.min(index, 8) * baseDelay;
    opacity.value = withDelay(delay, withTiming(1, { duration }));
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 18, stiffness: 120 }),
    );
  }, []);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

// ── Scale-on-press (spring) ──────────────────────────────────────────────────
export function useScalePress(to = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = useCallback(() => {
    scale.value = withSpring(to, { damping: 20, stiffness: 300 });
  }, []);
  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  }, []);
  return { style, onPressIn, onPressOut };
}

// ── Spring fade-in (one-shot) ────────────────────────────────────────────────
export function useSpringEntry(delay = 0) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  React.useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 16, stiffness: 110 }),
    );
  }, []);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

// ── Animated progress bar ────────────────────────────────────────────────────
export function useAnimatedWidth(targetPct: number, delay = 300, duration = 900) {
  const width = useSharedValue(0);

  React.useEffect(() => {
    width.value = withDelay(delay, withTiming(targetPct, { duration }));
  }, [targetPct]);

  return useAnimatedStyle(() => ({
    width: `${width.value}%` as any,
  }));
}

// ── Animated counter ─────────────────────────────────────────────────────────
export function useAnimatedCounter(target: number, delay = 200, duration = 800) {
  const current = useSharedValue(0);

  React.useEffect(() => {
    current.value = withDelay(delay, withTiming(target, { duration }));
  }, [target]);

  return current;
}
