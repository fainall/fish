import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { Achievement } from '../types';
import { RARITY_COLORS } from '../hooks/useAchievements';

interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
}

export default function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const translateY  = useRef(new Animated.Value(-140)).current;
  const opacity     = useRef(new Animated.Value(0)).current;
  const iconScale   = useRef(new Animated.Value(0)).current;
  const iconRotate  = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;
  const toastScale  = useRef(new Animated.Value(0.92)).current;

  const rarityColor = RARITY_COLORS[achievement.rarity];

  useEffect(() => {
    // 1. Slide + fade in the toast
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 75,
        friction: 9,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(toastScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 75,
        friction: 9,
      }),
    ]).start(() => {
      // 2. Icon bounces in after toast lands
      Animated.sequence([
        Animated.spring(iconScale, {
          toValue: 1.3,
          tension: 200,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          tension: 200,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      // 3. Icon wobble (rotate)
      Animated.sequence([
        Animated.timing(iconRotate, { toValue: 1,  duration: 80,  useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: -1, duration: 80,  useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: 1,  duration: 80,  useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: 0,  duration: 80,  useNativeDriver: true }),
      ]).start();

      // 4. Glow stripe pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1,   duration: 800, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    });

    // Auto-dismiss after 4.5 s
    const timer = setTimeout(dismiss, 4500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -140,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(toastScale, {
        toValue: 0.92,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  const rotate = iconRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }, { scale: toastScale }], opacity },
      ]}
    >
      <TouchableOpacity
        style={[styles.toast, { borderColor: rarityColor + '77' }]}
        onPress={dismiss}
        activeOpacity={0.9}
      >
        {/* Animated glow stripe */}
        <Animated.View
          style={[styles.stripe, { backgroundColor: rarityColor, opacity: glowOpacity }]}
        />

        {/* Animated icon */}
        <Animated.View
          style={[
            styles.iconBg,
            { backgroundColor: rarityColor + '22' },
            { transform: [{ scale: iconScale }, { rotate }] },
          ]}
        >
          <Ionicons name={achievement.icon as any} size={28} color={rarityColor} />
        </Animated.View>

        {/* Text */}
        <View style={styles.textBlock}>
          <View style={styles.topRow}>
            <Text style={styles.newBadge}>¡Nuevo logro!</Text>
            <View style={[styles.rarityChip, { backgroundColor: rarityColor + '33' }]}>
              <Text style={[styles.rarityText, { color: rarityColor }]}>
                {achievement.rarity.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{achievement.title}</Text>
          <Text style={styles.desc} numberOfLines={2}>{achievement.description}</Text>
        </View>

        {/* Close */}
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn}>
          <Ionicons name="close" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  stripe: {
    width: 5,
    alignSelf: 'stretch',
  },
  iconBg: {
    width: 54,
    height: 54,
    margin: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 28 },
  textBlock: { flex: 1, paddingVertical: SPACING.sm, paddingRight: SPACING.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 2 },
  newBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rarityChip: {
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rarityText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  desc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 15 },
  closeBtn: { padding: SPACING.md },
});
