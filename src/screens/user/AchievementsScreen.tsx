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
  const { unlocked, unlockedIds } = useAchievements();

  const unlockedCount  = unlocked.length;
  const totalCount     = ACHIEVEMENTS.length;
  const progressPct    = Math.round((unlockedCount / totalCount) * 100);
  const animatedBarWidth = useAnimatedWidth(progressPct, 500, 1000);

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

        {/* Progress card */}
        <RAnimated.View
          entering={FadeInDown.duration(500).springify().damping(16)}
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
});
