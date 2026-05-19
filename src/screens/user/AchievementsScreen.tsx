import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import RAnimated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import {
  useAchievements,
  ACHIEVEMENTS,
  RARITY_COLORS,
  AQUARIST_LEVELS,
  AchievementProgress,
} from '../../hooks/useAchievements';
import { useAnimatedWidth } from '../../utils/animations';

const RARITY_LABELS: Record<string, string> = {
  bronze:   'Bronce',
  silver:   'Plata',
  gold:     'Oro',
  platinum: 'Platino',
};

const RARITY_ORDER = ['bronze', 'silver', 'gold', 'platinum'] as const;

interface Props { onClose: () => void; }

export default function AchievementsScreen({ onClose }: Props) {
  const { unlocked, unlockedIds, progress, level, nextLevel } = useAchievements();

  const unlockedCount  = unlocked.length;
  const totalCount     = ACHIEVEMENTS.length;
  const progressPct    = Math.round((unlockedCount / totalCount) * 100);
  const animatedBarWidth = useAnimatedWidth(progressPct, 500, 1000);

  // Level progress
  const nextMin = nextLevel?.minAchievements ?? totalCount;
  const levelProgressPct = nextLevel
    ? Math.round(((unlockedCount - level.minAchievements) / (nextMin - level.minAchievements)) * 100)
    : 100;
  const animatedLevelBar = useAnimatedWidth(levelProgressPct, 700, 1200);

  // Group by rarity
  const grouped = RARITY_ORDER.map(rarity => ({
    rarity,
    items: ACHIEVEMENTS.filter(a => a.rarity === rarity),
  }));

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis logros</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Aquarist Level card */}
        <RAnimated.View
          entering={FadeInDown.duration(500).springify().damping(16)}
          style={[styles.levelCard, { borderColor: level.color + '44' }]}
        >
          <LinearGradient
            colors={[level.color + '15', level.color + '08']}
            style={styles.levelGradient}
          >
            <View style={styles.levelTop}>
              <View style={[styles.levelIconWrap, { backgroundColor: level.color + '22' }]}>
                <Text style={styles.levelIcon}>{level.icon}</Text>
              </View>
              <View style={styles.levelInfo}>
                <Text style={styles.levelLabel}>Nivel de acuarista</Text>
                <Text style={[styles.levelName, { color: level.color }]}>{level.label}</Text>
              </View>
              <View style={[styles.levelBadge, { backgroundColor: level.color + '22' }]}>
                <Text style={[styles.levelBadgeText, { color: level.color }]}>{unlockedCount}</Text>
                <Text style={[styles.levelBadgeSub, { color: level.color }]}>logros</Text>
              </View>
            </View>

            {nextLevel && (
              <View style={styles.levelProgressSection}>
                <View style={styles.levelProgressHeader}>
                  <Text style={styles.levelProgressLabel}>
                    Siguiente: {nextLevel.icon} {nextLevel.label}
                  </Text>
                  <Text style={[styles.levelProgressCount, { color: nextLevel.color }]}>
                    {unlockedCount}/{nextMin}
                  </Text>
                </View>
                <View style={styles.levelBarBg}>
                  <RAnimated.View style={[{ height: '100%', borderRadius: 4, overflow: 'hidden' }, animatedLevelBar]}>
                    <LinearGradient
                      colors={[level.color, nextLevel.color]}
                      style={{ flex: 1, borderRadius: 4 }}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                  </RAnimated.View>
                </View>
              </View>
            )}

            {!nextLevel && (
              <View style={styles.maxLevelBanner}>
                <Text style={styles.maxLevelText}>🏆 ¡Nivel máximo alcanzado!</Text>
              </View>
            )}
          </LinearGradient>

          {/* Level milestones */}
          <View style={styles.milestonesRow}>
            {AQUARIST_LEVELS.map((lv, i) => {
              const reached = unlockedCount >= lv.minAchievements;
              return (
                <View key={lv.id} style={styles.milestoneItem}>
                  <View style={[
                    styles.milestoneDot,
                    { backgroundColor: reached ? lv.color : COLORS.border },
                  ]}>
                    <Text style={{ fontSize: 10 }}>{reached ? lv.icon : '🔒'}</Text>
                  </View>
                  {i < AQUARIST_LEVELS.length - 1 && (
                    <View style={[
                      styles.milestoneLine,
                      { backgroundColor: reached ? lv.color + '55' : COLORS.border },
                    ]} />
                  )}
                </View>
              );
            })}
          </View>
        </RAnimated.View>

        {/* Progress card */}
        <RAnimated.View
          entering={FadeInDown.delay(100).duration(500).springify().damping(16)}
          style={styles.progressCard}
        >
          <View style={styles.progressTop}>
            <View>
              <Text style={styles.progressCount}>
                {unlockedCount} / {totalCount}
              </Text>
              <Text style={styles.progressLabel}>logros desbloqueados</Text>
            </View>
            <View style={[styles.pctBadge, { backgroundColor: progressPct === 100 ? '#ffd700' + '33' : COLORS.primary + '22' }]}>
              <Text style={[styles.pctText, { color: progressPct === 100 ? '#ffd700' : COLORS.primary }]}>
                {progressPct}%
              </Text>
            </View>
          </View>

          {/* Animated progress bar */}
          <View style={styles.progressBarBg}>
            <RAnimated.View style={[{ height: '100%', borderRadius: 4, overflow: 'hidden' }, animatedBarWidth]}>
              <LinearGradient
                colors={progressPct === 100 ? ['#ffd700', '#ffab40'] : [COLORS.primary, COLORS.accent]}
                style={[styles.progressBarFill, { width: '100%' }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
            </RAnimated.View>
          </View>

          {unlockedIds.has('master') && (
            <View style={styles.masterBanner}>
              <Text style={styles.masterBannerText}>🏆 ¡Maestro Acuarista! Has desbloqueado todos los logros.</Text>
            </View>
          )}
        </RAnimated.View>

        {/* Achievement groups */}
        {grouped.map(({ rarity, items }) => {
          const rarityColor = RARITY_COLORS[rarity];
          const unlockedInGroup = items.filter(a => unlockedIds.has(a.id)).length;
          return (
            <View key={rarity} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={[styles.groupTitle, { color: rarityColor }]}>
                  {RARITY_LABELS[rarity]}
                </Text>
                <Text style={styles.groupCount}>
                  {unlockedInGroup}/{items.length}
                </Text>
              </View>

              {items.map((achievement, achIdx) => {
                const isUnlocked = unlockedIds.has(achievement.id);
                const unlockDate = unlocked.find(u => u.id === achievement.id)?.unlockedAt;

                return (
                  <RAnimated.View
                    key={achievement.id}
                    entering={FadeInRight.delay(200 + achIdx * 50).duration(400).springify().damping(16)}
                    layout={Layout.springify()}
                    style={[
                      styles.achievementCard,
                      SHADOWS.sm,
                      !isUnlocked && styles.achievementCardLocked,
                    ]}
                  >
                    {/* Color stripe */}
                    <View style={[
                      styles.cardStripe,
                      { backgroundColor: isUnlocked ? rarityColor : COLORS.border },
                    ]} />

                    {/* Icon */}
                    <View style={[
                      styles.cardIconBg,
                      {
                        backgroundColor: isUnlocked ? rarityColor + '22' : COLORS.background,
                        borderColor: isUnlocked ? rarityColor + '55' : COLORS.border,
                      },
                    ]}>
                      {isUnlocked ? (
                        <Ionicons name={achievement.icon as any} size={24} color={rarityColor} />
                      ) : (
                        <Ionicons name="lock-closed" size={22} color={COLORS.textMuted} />
                      )}
                    </View>

                    {/* Content */}
                    <View style={styles.cardContent}>
                      <View style={styles.cardTitleRow}>
                        <Text style={[
                          styles.cardTitle,
                          !isUnlocked && styles.cardTitleLocked,
                        ]}>
                          {achievement.title}
                        </Text>
                        {isUnlocked && (
                          <Ionicons name="checkmark-circle" size={16} color={rarityColor} />
                        )}
                      </View>
                      <Text style={[
                        styles.cardDesc,
                        !isUnlocked && styles.cardDescLocked,
                      ]}>
                        {isUnlocked ? achievement.description : achievement.hint}
                      </Text>
                      {isUnlocked && unlockDate && (
                        <Text style={styles.cardDate}>
                          🗓 {new Date(unlockDate).toLocaleDateString('es-ES', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </Text>
                      )}
                      {!isUnlocked && progress[achievement.id] && progress[achievement.id].target > 1 && (
                        <View style={styles.achProgressRow}>
                          <View style={styles.achProgressBg}>
                            <View style={[
                              styles.achProgressFill,
                              {
                                width: `${Math.round((progress[achievement.id].current / progress[achievement.id].target) * 100)}%`,
                                backgroundColor: rarityColor,
                              },
                            ]} />
                          </View>
                          <Text style={[styles.achProgressText, { color: rarityColor }]}>
                            {progress[achievement.id].current}/{progress[achievement.id].target}
                          </Text>
                        </View>
                      )}
                    </View>
                  </RAnimated.View>
                );
              })}
            </View>
          );
        })}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, fontFamily: FONTS.sansEb },

  // Level card
  levelCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  levelGradient: { padding: SPACING.lg },
  levelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  levelIcon: { fontSize: 28 },
  levelInfo: { flex: 1 },
  levelLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sans },
  levelName: { fontSize: 22, fontWeight: 'bold', fontFamily: FONTS.sansEb },
  levelBadge: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  levelBadgeText: { fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.sansEb },
  levelBadgeSub: { fontSize: 8, fontFamily: FONTS.sans, marginTop: -2 },

  levelProgressSection: { marginTop: SPACING.md },
  levelProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelProgressLabel: { fontSize: 12, color: COLORS.textSecondary, fontFamily: FONTS.sans },
  levelProgressCount: { fontSize: 12, fontWeight: '700', fontFamily: FONTS.sansBd },
  levelBarBg: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
  },

  maxLevelBanner: {
    marginTop: SPACING.md,
    backgroundColor: '#ffd700' + '15',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.xs,
  },
  maxLevelText: { fontSize: 12, color: '#ffd700', fontWeight: '700', textAlign: 'center', fontFamily: FONTS.sansBd },

  milestonesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.xs,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  milestoneDot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneLine: {
    flex: 1, height: 2, marginHorizontal: 2,
  },

  // Progress card
  progressCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  progressCount: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, fontFamily: FONTS.sansEb },
  progressLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.sans },
  pctBadge: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  pctText: { fontSize: 16, fontWeight: 'bold', fontFamily: FONTS.sansEb },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  masterBanner: {
    marginTop: SPACING.md,
    backgroundColor: '#ffd700' + '18',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: '#ffd700' + '44',
  },
  masterBannerText: { color: '#ffd700', fontWeight: '700', fontSize: 13, textAlign: 'center', fontFamily: FONTS.sansBd },

  group: { marginBottom: SPACING.lg },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  groupTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3, fontFamily: FONTS.sansBd },
  groupCount: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.sans },

  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  achievementCardLocked: { opacity: 0.55 },
  cardStripe: { width: 4, alignSelf: 'stretch' },
  cardIconBg: {
    width: 52, height: 52, margin: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  cardIcon: { fontSize: 26 },
  cardContent: { flex: 1, paddingVertical: SPACING.sm, paddingRight: SPACING.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1, fontFamily: FONTS.sansBd },
  cardTitleLocked: { color: COLORS.textMuted },
  cardDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, fontFamily: FONTS.sans },
  cardDescLocked: { color: COLORS.textMuted, fontStyle: 'italic' },
  cardDate: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, fontFamily: FONTS.sans },

  // Achievement progress bar
  achProgressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6,
  },
  achProgressBg: {
    flex: 1, height: 6, backgroundColor: COLORS.background,
    borderRadius: 3, overflow: 'hidden',
  },
  achProgressFill: { height: '100%', borderRadius: 3, minWidth: 2 },
  achProgressText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.sansBd },
});
