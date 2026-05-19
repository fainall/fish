import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import RAnimated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
  interpolate,
} from 'react-native-reanimated';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.7]),
  }));

  return (
    <RAnimated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: COLORS.border,
        },
        animStyle,
        style,
      ]}
    />
  );
}

export function HomeSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <SkeletonBox width={160} height={26} borderRadius={6} />
          <SkeletonBox width={200} height={14} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
        <SkeletonBox width={44} height={44} borderRadius={22} />
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <SkeletonBox height={44} borderRadius={22} />
      </View>

      {/* Banner */}
      <View style={styles.bannerWrap}>
        <SkeletonBox height={180} borderRadius={20} />
      </View>

      {/* Aquarium card */}
      <View style={styles.cardWrap}>
        <SkeletonBox height={130} borderRadius={20} />
      </View>

      {/* Tip section */}
      <View style={styles.sectionHeader}>
        <SkeletonBox width={140} height={18} borderRadius={4} />
      </View>
      <View style={styles.cardWrap}>
        <SkeletonBox height={90} borderRadius={16} />
      </View>

      {/* Stats row */}
      <View style={styles.sectionHeader}>
        <SkeletonBox width={100} height={18} borderRadius={4} />
      </View>
      <View style={styles.statsRow}>
        {[0, 1, 2, 3].map(i => (
          <SkeletonBox key={i} width={76} height={90} borderRadius={16} />
        ))}
      </View>
    </View>
  );
}

export function ParametersSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <SkeletonBox width={200} height={24} borderRadius={6} />
          <SkeletonBox width={260} height={14} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
        <SkeletonBox width={44} height={44} borderRadius={14} />
      </View>
      <View style={styles.tabsRow}>
        {[0, 1].map(i => (
          <SkeletonBox key={i} width={100} height={34} borderRadius={17} />
        ))}
      </View>
      <View style={styles.cardWrap}>
        <SkeletonBox height={80} borderRadius={16} />
      </View>
      <View style={styles.cardWrap}>
        <SkeletonBox height={200} borderRadius={16} />
      </View>
    </View>
  );
}

export function TasksSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <SkeletonBox width={100} height={26} borderRadius={6} />
          <SkeletonBox width={120} height={14} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
        <SkeletonBox width={46} height={46} borderRadius={23} />
      </View>
      <View style={styles.tabsRow}>
        {[0, 1, 2].map(i => (
          <SkeletonBox key={i} width={90} height={34} borderRadius={17} />
        ))}
      </View>
      <View style={styles.statsRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{ flex: 1 }}>
            <SkeletonBox height={70} borderRadius={20} />
          </View>
        ))}
      </View>
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.cardWrap}>
          <SkeletonBox height={90} borderRadius={20} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: SPACING.xxl },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.sm,
  },
  searchWrap: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  bannerWrap: { marginHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  cardWrap: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md },
  sectionHeader: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md, marginTop: SPACING.sm },
  statsRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg,
  },
  tabsRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
  },
});

export default SkeletonBox;
