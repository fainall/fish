import React, { useEffect, useRef, memo } from 'react';
import { Animated, View, StyleSheet, Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Stable bubble configs — fraction of screen width for x
const CONFIGS = [
  { xFrac: 0.05, size: 5,  dur: 7000, initDelay: 0    },
  { xFrac: 0.15, size: 9,  dur: 5500, initDelay: 700  },
  { xFrac: 0.28, size: 4,  dur: 8500, initDelay: 1400 },
  { xFrac: 0.40, size: 7,  dur: 6200, initDelay: 300  },
  { xFrac: 0.52, size: 11, dur: 9000, initDelay: 2100 },
  { xFrac: 0.63, size: 5,  dur: 5200, initDelay: 1000 },
  { xFrac: 0.73, size: 8,  dur: 7300, initDelay: 500  },
  { xFrac: 0.85, size: 6,  dur: 6800, initDelay: 1700 },
  { xFrac: 0.20, size: 4,  dur: 10000,initDelay: 2800 },
  { xFrac: 0.60, size: 7,  dur: 8000, initDelay: 2400 },
  { xFrac: 0.90, size: 4,  dur: 6000, initDelay: 3200 },
  { xFrac: 0.35, size: 10, dur: 7800, initDelay: 900  },
];

interface BubbleProps {
  xFrac: number;
  size: number;
  dur: number;
  initDelay: number;
}

const Bubble = memo(({ xFrac, size, dur, initDelay }: BubbleProps) => {
  const translateY = useRef(new Animated.Value(H + size)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    let cancelled = false;

    const run = (first: boolean) => {
      if (cancelled) return;
      translateY.setValue(H + size);
      opacity.setValue(0);
      scale.setValue(0.4);

      const mainAnim = Animated.parallel([
        // Rise
        Animated.timing(translateY, {
          toValue: -size * 3,
          duration: dur,
          useNativeDriver: true,
        }),
        // Fade in → hold → fade out
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.28, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.22, duration: dur - 1400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
        // Pop in
        Animated.spring(scale, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
      ]);

      const anim = first
        ? Animated.sequence([Animated.delay(initDelay), mainAnim])
        : mainAnim;

      anim.start(({ finished }) => {
        if (finished && !cancelled) run(false);
      });
    };

    run(true);
    return () => { cancelled = true; };
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: xFrac * W - size / 2,
        bottom: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: 'rgba(41,182,246,0.55)',
        backgroundColor: 'rgba(41,182,246,0.08)',
        transform: [{ translateY }, { scale }],
        opacity,
      }}
    />
  );
});

export default function Bubbles() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {CONFIGS.map((cfg, i) => (
        <Bubble key={i} {...cfg} />
      ))}
    </View>
  );
}
