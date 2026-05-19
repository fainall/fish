import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Image, RefreshControl,
} from 'react-native';
import RAnimated, { FadeInDown, FadeInRight, FadeInUp, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAquariums } from '../../hooks/useAquariums';
import { useTasks } from '../../hooks/useTasks';
import { useAchievements, ACHIEVEMENTS, RARITY_COLORS } from '../../hooks/useAchievements';
import { useFishDatabase } from '../../hooks/useFishDatabase';
import { useParameterRecords } from '../../hooks/useParameterRecords';
import { getDailyTip } from '../../constants/tips';
import { getStyleInfo } from '../../data/aquariumStyles';
import { getEffectiveVolume } from '../../utils/stocking';
import { FishImage } from '../../components/FishImage';
import {
  FishAlert, getParameterAlerts, getSchoolingAlerts,
  getDifficultyAlerts, getHealthTips, getFishOfTheDay,
} from '../../utils/fishAlerts';
import {
  useScrollAnimations,
  useParallaxStyle,
  useStaggerStyle,
  useScalePress,
} from '../../utils/animations';
import { HomeSkeleton } from '../../components/SkeletonLoader';
import AchievementsScreen from './AchievementsScreen';
import ProfileScreen from './ProfileScreen';


// ── Animated stat pill ────────────────────────────────────────────────────────
interface StatPillProps { label: string; value: string; icon: string; color: string; index: number; }
const StatPill = ({ label, value, icon, color, index }: StatPillProps) => {
  const { style, onPressIn, onPressOut } = useScalePress(0.93);
  return (
    <RAnimated.View
      entering={FadeInDown.delay(300 + index * 80).duration(500).springify().damping(16)}
      style={style}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.statPill}
      >
        <View style={[styles.statPillIcon, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View>
          <Text style={[styles.statPillValue, { color }]}>{value}</Text>
          <Text style={styles.statPillLabel}>{label}</Text>
        </View>
      </TouchableOpacity>
    </RAnimated.View>
  );
};

// ── Experience labels ─────────────────────────────────────────────────────────
const EXP_LABELS = {
  beginner:     { label: 'Principiante', icon: 'leaf',   color: COLORS.success },
  intermediate: { label: 'Intermedio',   icon: 'flame',  color: COLORS.primary },
  advanced:     { label: 'Avanzado',     icon: 'trophy', color: COLORS.warning },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const { s, fs, wp, isTablet }     = useResponsive();
  const { user }                    = useAuth();
  const { profile }                 = useUserProfile();
  const { aquariums, selectedAquarium, loading: aqLoading } = useAquariums();
  const { pendingTasks, overdueCount }  = useTasks();
  const { unlocked }                = useAchievements();
  const { fish: allFish, loading: fishLoading } = useFishDatabase();
  const { recordsFor }              = useParameterRecords();
  const [refreshing, setRefreshing] = useState(false);
  const dailyTip                    = getDailyTip(profile.experience);
  const expInfo                     = EXP_LABELS[profile.experience];
  const activeStyle                 = selectedAquarium?.aquarium_style ?? profile.aquarium?.aquarium_style;
  const styleInfo                   = getStyleInfo(activeStyle);
  const totalFish                   = selectedAquarium?.fish.reduce((s, f) => s + f.qty, 0) ?? 0;
  const pendingCount                = pendingTasks.length;

  const [showAchievements, setShowAchievements] = useState(false);
  const [showProfile,      setShowProfile]      = useState(false);

  // ── Smart data ──────────────────────────────────────────────────────────────
  const aquariumFish = useMemo(() => {
    if (!selectedAquarium) return [];
    return selectedAquarium.fish.flatMap(entry => {
      const fishData = allFish.find(f => f.id === entry.fishId);
      return fishData ? [{ fishData, qty: entry.qty }] : [];
    });
  }, [selectedAquarium, allFish]);

  const aquariumFishList = useMemo(() => aquariumFish.map(f => f.fishData), [aquariumFish]);

  const latestRecord = useMemo(() => {
    if (!selectedAquarium) return null;
    const recs = recordsFor(selectedAquarium.id);
    return recs.length > 0 ? recs[recs.length - 1] : null;
  }, [selectedAquarium, recordsFor]);

  const smartAlerts = useMemo((): FishAlert[] => {
    const alerts: FishAlert[] = [];
    alerts.push(...getParameterAlerts(aquariumFishList, latestRecord));
    alerts.push(...getSchoolingAlerts(aquariumFish));
    alerts.push(...getDifficultyAlerts(aquariumFishList, profile.experience));
    alerts.push(...getHealthTips(aquariumFishList));
    return alerts.slice(0, 5);
  }, [aquariumFishList, aquariumFish, latestRecord, profile.experience]);

  const fishOfTheDay = useMemo(() => getFishOfTheDay(allFish), [allFish]);

  // ── Scroll-driven animations (Reanimated) ──────────────────────────────────
  const { scrollY, scrollHandler } = useScrollAnimations();
  const bannerParallax = useParallaxStyle(scrollY, 200, 280);

  const recentBadges = [...unlocked]
    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
    .slice(0, 4)
    .map(u => ACHIEVEMENTS.find(a => a.id === u.id)!)
    .filter(Boolean);

  const isLoading = aqLoading || fishLoading;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const firstName = profile.display_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Acuarista';
  const initials  = (profile.display_name || user?.full_name || 'A')
    .split(/\s+/).filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <HomeSkeleton />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <RAnimated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING.xxl }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      >

        {/* ── Header ── */}
        <RAnimated.View
          entering={FadeInDown.duration(500).springify().damping(18)}
          style={styles.header}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { fontSize: fs(24) }]}>Hola, {firstName}</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowProfile(true)}>
            {profile.avatar_uri
              ? <Image source={{ uri: profile.avatar_uri }} style={[styles.avatar, { width: s(44), height: s(44), borderRadius: s(22) }]} />
              : (
                <View style={[styles.avatarCircle, { width: s(44), height: s(44), borderRadius: s(22) }]}>
                  <Text style={[styles.avatarInitials, { fontSize: fs(16) }]}>{initials}</Text>
                </View>
              )}
          </TouchableOpacity>
        </RAnimated.View>

        {/* ── Search bar (Airbnb-style) ── */}
        <RAnimated.View
          entering={FadeInDown.delay(60).duration(450).springify().damping(18)}
          style={styles.searchWrap}
        >
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.searchPlaceholder}>Buscar peces, acuarios, parámetros…</Text>
          </View>
        </RAnimated.View>

        {/* ── Hero Banner (parallax on scroll) ── */}
        <RAnimated.View
          entering={FadeInUp.delay(120).duration(600).springify().damping(14)}
          style={[styles.bannerWrap, bannerParallax]}
        >
          <LinearGradient
            colors={['#004e92', '#00b4d8']}
            start={{ x: 0, y: 0.3 }}
            end={{ x: 1, y: 1 }}
            style={[styles.banner, { minHeight: s(180), padding: s(24) }]}
          >
            {/* Decorative circles */}
            <View style={[styles.bannerCircle1, { width: s(200), height: s(200), borderRadius: s(100) }]} />
            <View style={[styles.bannerCircle2, { width: s(120), height: s(120), borderRadius: s(60) }]} />

            {/* Swimming fish icon */}
            <View style={styles.bannerFish}>
              <Ionicons name="fish" size={s(64)} color="rgba(255,255,255,0.18)" />
            </View>

            <View style={styles.bannerBody}>
              <View style={styles.bannerTag}>
                <Ionicons name="cube-outline" size={11} color="rgba(255,255,255,0.9)" />
                <Text style={styles.bannerTagText}>
                  {selectedAquarium ? `${Math.round(getEffectiveVolume(selectedAquarium.volume_liters, selectedAquarium.displacement))}L · ${styleInfo?.label ?? 'Mi acuario'}` : 'Acuario Virtual'}
                </Text>
              </View>
              <Text style={[styles.bannerTitle, { fontSize: fs(26), lineHeight: fs(32) }]}>Gestiona tu{'\n'}ecosistema</Text>
              <TouchableOpacity style={styles.bannerBtn} onPress={() => navigation.navigate('Aquarium')}>
                <Text style={styles.bannerBtnText}>Ver mis acuarios</Text>
                <Ionicons name="arrow-forward" size={14} color="#004e92" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </RAnimated.View>

        {/* ── Mi Acuario card ── */}
        {styleInfo && (
          <RAnimated.View
            entering={FadeInDown.delay(200).duration(550).springify().damping(16)}
            style={styles.aquaCard}
          >
            <View style={styles.aquaCardHeader}>
              <View style={[styles.aquaCardEmojiWrap, { backgroundColor: styleInfo.color + '22', width: s(48), height: s(48) }]}>
                <Text style={[styles.aquaCardEmoji, { fontSize: fs(24) }]}>{styleInfo.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aquaCardName, { color: styleInfo.color }]}>{styleInfo.label}</Text>
                <Text style={styles.aquaCardDesc} numberOfLines={1}>{styleInfo.description}</Text>
              </View>
              <View style={styles.aquaCardBadge}>
                <Text style={styles.aquaCardBadgeText}>
                  {selectedAquarium ? `${Math.round(getEffectiveVolume(selectedAquarium.volume_liters, selectedAquarium.displacement))}L` : '—'}
                </Text>
              </View>
            </View>
            <View style={styles.aquaCardDivider} />
            <View style={styles.aquaParamsRow}>
              {([
                { label: 'Temp',  value: `${styleInfo.params.temp_min}–${styleInfo.params.temp_max}°C`, icon: 'thermometer-outline' },
                { label: 'pH',    value: `${styleInfo.params.ph_min}–${styleInfo.params.ph_max}`,        icon: 'flask-outline'       },
                { label: 'GH',    value: `${styleInfo.params.gh_min}–${styleInfo.params.gh_max} dH`,     icon: 'water-outline'       },
                { label: 'KH',    value: `${styleInfo.params.kh_min}–${styleInfo.params.kh_max} dH`,     icon: 'layers-outline'      },
              ] as const).map(p => (
                <View key={p.label} style={styles.aquaParam}>
                  <View style={[styles.aquaParamIconWrap, { backgroundColor: styleInfo.color + '15' }]}>
                    <Ionicons name={p.icon} size={14} color={styleInfo.color} />
                  </View>
                  <Text style={[styles.aquaParamValue, { color: styleInfo.color }]}>{p.value}</Text>
                  <Text style={styles.aquaParamLabel}>{p.label}</Text>
                </View>
              ))}
            </View>
          </RAnimated.View>
        )}

        {/* ── Cycling alert ── */}
        {profile.experience === 'beginner' && profile.knows_cycling === false && (
          <View style={styles.alertCard}>
            <Ionicons name="warning-outline" size={20} color={COLORS.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>¿Aún no has ciclado tu acuario?</Text>
              <Text style={styles.alertBody}>El ciclado es esencial antes de añadir peces. Revisa los parámetros semanalmente.</Text>
            </View>
          </View>
        )}

        {/* ── Tip del día ── */}
        <RAnimated.View entering={FadeInDown.delay(280).duration(500).springify().damping(16)}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Consejo del día</Text>
          </View>
          <View style={styles.tipCard}>
            <View style={styles.tipInner}>
              <View style={styles.tipIconWrap}>
                <Ionicons name="bulb-outline" size={22} color={COLORS.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>{dailyTip.title}</Text>
                <Text style={styles.tipBody}>{dailyTip.body}</Text>
              </View>
            </View>
          </View>
        </RAnimated.View>

        {/* ── Pez del día ── */}
        {fishOfTheDay && (
          <RAnimated.View entering={FadeInRight.delay(350).duration(550).springify().damping(14)}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Pez del día</Text>
            </View>
            <View style={styles.fotdCard}>
              <View style={[styles.fotdImageWrap, { width: s(100) }]}>
                {fishOfTheDay.fish.image_url ? (
                  <FishImage
                    source={{ uri: fishOfTheDay.fish.image_url }}
                    style={[styles.fotdImage, { width: s(100), height: s(100) }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.fotdImage, { width: s(100), height: s(100), backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="fish" size={s(32)} color={COLORS.primary} />
                  </View>
                )}
              </View>
              <View style={styles.fotdBody}>
                <Text style={styles.fotdName}>{fishOfTheDay.fish.common_name}</Text>
                <Text style={styles.fotdSci}>{fishOfTheDay.fish.scientific_name}</Text>
                <Text style={styles.fotdFact}>{fishOfTheDay.fact}</Text>
              </View>
            </View>
          </RAnimated.View>
        )}

        {/* ── Alertas inteligentes ── */}
        {smartAlerts.length > 0 && (
          <RAnimated.View entering={FadeInDown.delay(400).duration(500).springify().damping(16)}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Alertas de tu acuario</Text>
              <View style={styles.alertCountBadge}>
                <Text style={styles.alertCountText}>{smartAlerts.length}</Text>
              </View>
            </View>
            {smartAlerts.map((alert, i) => {
              const colorMap = { critical: COLORS.error, warning: COLORS.warning, info: COLORS.primary, success: COLORS.success };
              const c = colorMap[alert.type];
              return (
                <RAnimated.View
                  key={i}
                  entering={FadeInRight.delay(450 + i * 60).duration(400).springify().damping(16)}
                  style={[styles.smartAlert, { borderLeftColor: c }]}
                >
                  <Text style={styles.smartAlertIcon}>{alert.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.smartAlertTitle, { color: c }]}>{alert.title}</Text>
                    <Text style={styles.smartAlertBody}>{alert.body}</Text>
                  </View>
                </RAnimated.View>
              );
            })}
          </RAnimated.View>
        )}

        {/* ── Resumen ── */}
        <RAnimated.View entering={FadeInDown.delay(450).duration(500).springify().damping(16)}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Resumen</Text>
          </View>
          <View style={styles.statsRow}>
            <StatPill label="Acuarios" value={String(aquariums.length)} icon="cube-outline" color={COLORS.primary} index={0} />
            <StatPill label="Peces" value={totalFish > 0 ? String(totalFish) : '—'} icon="fish-outline" color={COLORS.success} index={1} />
            <TouchableOpacity onPress={() => navigation.navigate('Tasks')} activeOpacity={0.7}>
              <StatPill
                label="Tareas"
                value={overdueCount > 0 ? `! ${overdueCount}` : String(pendingCount)}
                icon={overdueCount > 0 ? 'warning-outline' : 'calendar-outline'}
                color={overdueCount > 0 ? COLORS.error : COLORS.warning}
                index={2}
              />
            </TouchableOpacity>
            <StatPill label="Logros" value={`${unlocked.length}/${ACHIEVEMENTS.length}`} icon="trophy-outline" color="#f59e0b" index={3} />
          </View>
        </RAnimated.View>

        {/* ── Logros ── */}
        <RAnimated.View entering={FadeInDown.delay(550).duration(500).springify().damping(16)}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Logros</Text>
            <TouchableOpacity style={styles.seeAllBtn} onPress={() => setShowAchievements(true)}>
              <Text style={styles.seeAllText}>Ver todos</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {recentBadges.length === 0 ? (
            <View style={styles.emptyBadges}>
              <Ionicons name="medal-outline" size={28} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyBadgesText}>Completa acciones para desbloquear logros</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
              {recentBadges.map((a, i) => {
                const rColor = RARITY_COLORS[a.rarity];
                return (
                  <RAnimated.View
                    key={a.id}
                    entering={FadeInRight.delay(600 + i * 70).duration(400).springify().damping(14)}
                  >
                    <TouchableOpacity
                      style={[styles.badgeCard, { borderColor: rColor + '55', width: s(110) }]}
                      onPress={() => setShowAchievements(true)}
                    >
                      <View style={[styles.badgeIconWrap, { backgroundColor: rColor + '18', width: s(52), height: s(52) }]}>
                        <Ionicons name={a.icon as any} size={s(26)} color={rColor} />
                      </View>
                      <Text style={[styles.badgeName, { color: rColor }]}>{a.title}</Text>
                      <View style={[styles.rarityPill, { backgroundColor: rColor + '22' }]}>
                        <Text style={[styles.rarityText, { color: rColor }]}>{a.rarity.toUpperCase()}</Text>
                      </View>
                    </TouchableOpacity>
                  </RAnimated.View>
                );
              })}
              <TouchableOpacity style={[styles.badgeMore, { width: s(90) }]} onPress={() => setShowAchievements(true)}>
                <Text style={styles.badgeMoreCount}>{unlocked.length}/{ACHIEVEMENTS.length}</Text>
                <Text style={styles.badgeMoreLabel}>Ver todos</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </RAnimated.View>

      </RAnimated.ScrollView>

      {/* Modals */}
      <Modal visible={showAchievements} animationType="slide">
        <AchievementsScreen onClose={() => setShowAchievements(false)} />
      </Modal>
      <Modal visible={showProfile} animationType="slide">
        <ProfileScreen onClose={() => setShowProfile(false)} />
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  greeting: { fontSize: 24, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text, letterSpacing: -0.3 },
  date: { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textMuted, marginTop: 1, textTransform: 'capitalize' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary + '18',
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 16, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.primary },

  // Search
  searchWrap: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  searchPlaceholder: { color: COLORS.textMuted, fontSize: 14, fontFamily: FONTS.sans },

  // Banner
  bannerWrap: { marginHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  banner: {
    borderRadius: 20,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    overflow: 'hidden',
    minHeight: 180,
    justifyContent: 'flex-end',
    shadowColor: '#004e92', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20, shadowRadius: 12, elevation: 5,
  },
  bannerCircle1: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60, right: -40,
  },
  bannerCircle2: {
    position: 'absolute', width: 120, height: 120,
    borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -30, left: 20,
  },
  bannerFish: { position: 'absolute', right: 20, top: 24, transform: [{ rotate: '12deg' }] },
  bannerBody: {},
  bannerTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: SPACING.sm,
  },
  bannerTagText: { fontSize: 11, fontFamily: FONTS.sansSb, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 },
  bannerTitle: { fontSize: 26, fontFamily: FONTS.sansEb, color: '#fff', lineHeight: 32, marginBottom: SPACING.md, letterSpacing: -0.5 },
  bannerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 9, paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  bannerBtnText: { color: '#004e92', fontFamily: FONTS.sansBd, fontSize: 13 },

  // Section header
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.sansEb, color: COLORS.text, letterSpacing: -0.2 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { color: COLORS.primary, fontSize: 14, fontFamily: FONTS.sansSb },

  // Aquarium card
  aquaCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 20,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  aquaCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  aquaCardEmojiWrap: {
    width: 48, height: 48,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  aquaCardEmoji: { fontSize: 24 },
  aquaCardName: { fontSize: 16, fontFamily: FONTS.sansBd, color: COLORS.text, marginBottom: 2 },
  aquaCardDesc: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted },
  aquaCardBadge: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  aquaCardBadgeText: { color: COLORS.textSecondary, fontSize: 12, fontFamily: FONTS.sansBd },
  aquaCardDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  aquaParamsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  aquaParam: { alignItems: 'center', gap: 4 },
  aquaParamIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  aquaParamValue: { fontSize: 12, fontFamily: FONTS.sansBd },
  aquaParamLabel: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted },

  // Alert
  alertCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.warning + '0f',
    borderRadius: 16, padding: SPACING.md,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.warning + '30',
  },
  alertTitle: { color: COLORS.warning, fontFamily: FONTS.sansBd, fontSize: 13, marginBottom: 2 },
  alertBody: { color: COLORS.textSecondary, fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18 },

  // Tip card
  tipCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.backgroundCard,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  tipInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  tipIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.success + '15',
    borderWidth: 1, borderColor: COLORS.success + '30',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  tipTitle: { color: COLORS.text, fontFamily: FONTS.sansBd, fontSize: 14, marginBottom: 4 },
  tipBody: { color: COLORS.textSecondary, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statPill: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statPillIcon: {
    width: 34, height: 34,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  statPillValue: { fontSize: 17, fontFamily: FONTS.sansEb, textAlign: 'center', color: COLORS.text },
  statPillLabel: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted, textAlign: 'center' },

  // Badges
  badgesScroll: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.sm },
  badgeCard: {
    width: 110,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  badgeIconWrap: {
    width: 52, height: 52,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeName: { fontSize: 11, fontFamily: FONTS.sansBd, color: COLORS.text, textAlign: 'center' },
  rarityPill: {
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  rarityText: { fontSize: 9, fontFamily: FONTS.sansEb, letterSpacing: 0.5 },
  badgeMore: {
    width: 90,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    padding: SPACING.md,
    gap: 4,
  },
  badgeMoreCount: { fontSize: 20, fontFamily: FONTS.sansEb, color: COLORS.textSecondary },
  badgeMoreLabel: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted },
  emptyBadges: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    marginHorizontal: SPACING.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  emptyBadgesText: { color: COLORS.textMuted, fontFamily: FONTS.sans, fontSize: 13, textAlign: 'center' },

  // Fish of the day
  fotdCard: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  fotdImageWrap: { width: 100, alignSelf: 'stretch' },
  fotdImage: { width: 100, height: 100 },
  fotdBody: { flex: 1, padding: SPACING.md, gap: 3 },
  fotdName: { fontSize: 15, fontFamily: FONTS.sansBd, color: COLORS.text },
  fotdSci: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, fontStyle: 'italic' },
  fotdFact: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textSecondary, lineHeight: 18, marginTop: 4 },

  // Smart alerts
  alertCountBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  alertCountText: { color: '#fff', fontSize: 11, fontFamily: FONTS.sansBd },
  smartAlert: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
    borderLeftWidth: 3,
  },
  smartAlertIcon: { fontSize: 18, marginTop: 1 },
  smartAlertTitle: { fontSize: 13, fontFamily: FONTS.sansBd, marginBottom: 2 },
  smartAlertBody: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textSecondary, lineHeight: 17 },
});
