import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Image, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import RAnimated, { FadeInDown, FadeInUp, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Updates from 'expo-updates';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAuth } from '../../hooks/useAuth';
import { useAquariums } from '../../hooks/useAquariums';
import { useAchievements, ACHIEVEMENTS, AQUARIST_LEVELS } from '../../hooks/useAchievements';
import { ExperienceLevel } from '../../constants/tips';
import { useScalePress } from '../../utils/animations';

// ── Config ────────────────────────────────────────────────────────────────────

const EXPERIENCE_OPTIONS: {
  value: ExperienceLevel; label: string; desc: string; icon: string; color: string;
}[] = [
  { value: 'beginner',     label: 'Principiante', desc: 'Menos de 1 año en el hobby',     icon: 'leaf',   color: COLORS.success  },
  { value: 'intermediate', label: 'Intermedio',   desc: '1–3 años, varios acuarios',       icon: 'flame',  color: COLORS.primary  },
  { value: 'advanced',     label: 'Avanzado',     desc: 'Más de 3 años, criador experto', icon: 'trophy', color: COLORS.warning  },
];

const RARITY_CONFIG: Record<string, { color: string; label: string }> = {
  bronze:   { color: '#cd7f32', label: 'Bronce'   },
  silver:   { color: '#a8a8a8', label: 'Plata'    },
  gold:     { color: '#ffd700', label: 'Oro'      },
  platinum: { color: '#a78bfa', label: 'Platino'  },
};

interface Props { onClose: () => void; navigation?: any }

// ── Clean avatar ──────────────────────────────────────────────────────────────
function AvatarHero({
  avatarUri, initials, onPress,
}: { avatarUri: string | null; initials: string; onPress: () => void }) {
  const { width: screenW } = useWindowDimensions();
  const factor = Math.min(1.4, Math.max(0.85, screenW / 375));
  const avatarSize = Math.round(108 * factor);
  const camSize    = Math.round(28 * factor);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.avatarWrap}>
      <View style={[styles.avatarCircle, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
        ) : (
          <Text style={[styles.avatarInitials, { fontSize: Math.round(40 * factor) }]}>{initials}</Text>
        )}
      </View>
      <View style={[styles.cameraBadge, { width: camSize, height: camSize, borderRadius: camSize / 2 }]}>
        <Ionicons name="camera" size={Math.round(13 * factor)} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen({ onClose, navigation }: Props) {
  const { s, fs } = useResponsive();
  const { user, signOut } = useAuth();
  const { profile, updateProfile, resetOnboarding } = useUserProfile();
  const { clearAllAquariums } = useAquariums();
  const { unlocked, level, nextLevel } = useAchievements();

  const [displayName, setDisplayName] = useState(profile.display_name || user?.full_name || '');
  const [experience, setExperience] = useState<ExperienceLevel>(profile.experience);
  const [avatarUri, setAvatarUri] = useState<string | null>(profile.avatar_uri ?? null);
  const [saving, setSaving] = useState(false);

  const initials = (displayName || user?.full_name || 'A')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const totalBadges = unlocked.length;
  const daysActive = profile.completed_at
    ? Math.floor((Date.now() - new Date(profile.completed_at).getTime()) / 86400000)
    : 0;
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ display_name: displayName.trim() || undefined, avatar_uri: avatarUri ?? undefined, experience });
      Alert.alert('✅ Guardado', 'Tu perfil ha sido actualizado.');
      onClose();
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Inténtalo de nuevo.');
    } finally { setSaving(false); }
  };

  const doFullReset = async () => {
    await clearAllAquariums();
    await resetOnboarding();
  };

  const confirmReset = () => {
    const msg = 'Se borrarán tus preferencias y todos tus acuarios. Esta acción no se puede deshacer.';
    if (Platform.OS === 'web') {
      if ((window as any).confirm(`¿Reiniciar onboarding?\n\n${msg}`)) doFullReset();
      return;
    }
    Alert.alert('Reiniciar onboarding', msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reiniciar todo', style: 'destructive', onPress: doFullReset },
    ]);
  };

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      // Alert.alert no ejecuta callbacks correctamente en web
      if ((window as any).confirm('¿Seguro que quieres cerrar sesión?')) signOut();
      return;
    }
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' }, { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  // Sort achievements by unlock date desc
  const recentBadges = [...unlocked]
    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
    .slice(0, 8)
    .map(u => ({ ...u, ach: ACHIEVEMENTS.find(a => a.id === u.id) }))
    .filter(u => !!u.ach);

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={styles.container}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Mi perfil</Text>
        <TouchableOpacity onPress={save} style={styles.saveTopBtn} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveTopBtnText}>Guardar</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Hero block ──────────────────────────────────────────────────────── */}
        <RAnimated.View
          entering={FadeInDown.duration(550).springify().damping(16)}
          style={styles.heroBlock}
        >
          <AvatarHero avatarUri={avatarUri} initials={initials} onPress={pickAvatar} />

          <Text style={[styles.heroName, { fontSize: fs(22) }]}>
            {displayName || user?.full_name || 'Acuarista'}
          </Text>
          <Text style={[styles.heroEmail, { fontSize: fs(13) }]}>{user?.email}</Text>

          {/* Aquarist level badge */}
          <View style={[styles.expBadge, { backgroundColor: level.color + '18', borderColor: level.color + '40' }]}>
            <Text style={{ fontSize: 13 }}>{level.icon}</Text>
            <Text style={[styles.expBadgeText, { color: level.color }]}>{level.label}</Text>
          </View>
        </RAnimated.View>

        {/* ── Stats row ───────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {([
            { icon: 'trophy',   color: COLORS.accent,  value: String(totalBadges), label: 'Logros' },
            { icon: 'calendar', color: COLORS.primary,  value: String(daysActive),  label: 'Días activo' },
            { icon: 'star',     color: level.color,     value: level.label.split(' ')[0], label: 'Nivel' },
          ] as const).map((stat, i) => (
            <RAnimated.View
              key={stat.label}
              entering={FadeInDown.delay(150 + i * 80).duration(450).springify().damping(14)}
              style={styles.statCard}
            >
              <View style={[styles.statIcon, { backgroundColor: stat.color + '20', width: s(36), height: s(36), borderRadius: s(10) }]}>
                <Ionicons name={stat.icon as any} size={s(18)} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: stat.color, fontSize: fs(18) }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { fontSize: fs(10) }]}>{stat.label}</Text>
            </RAnimated.View>
          ))}
        </View>

        {/* ── Name input ──────────────────────────────────────────────────────── */}
        <RAnimated.View
          entering={FadeInDown.delay(350).duration(450).springify().damping(16)}
          style={styles.sectionWrap}
        >
          <Text style={styles.formLabel}>Nombre mostrado</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Tu nombre o apodo"
            placeholderTextColor={COLORS.textMuted}
            maxLength={40}
          />
        </RAnimated.View>

        {/* ── Aquarist level (based on achievements) ───────────────────────── */}
        <RAnimated.View
          entering={FadeInDown.delay(420).duration(450).springify().damping(16)}
          style={styles.sectionWrap}
        >
          <Text style={styles.formLabel}>Nivel de acuarista</Text>
          <View style={[styles.levelDetailCard, { borderColor: level.color + '44' }]}>
            <View style={styles.levelDetailTop}>
              <View style={[styles.levelDetailIcon, { backgroundColor: level.color + '18' }]}>
                <Text style={{ fontSize: 28 }}>{level.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.levelDetailName, { color: level.color }]}>{level.label}</Text>
                <Text style={styles.levelDetailSub}>
                  {totalBadges} logro{totalBadges !== 1 ? 's' : ''} desbloqueado{totalBadges !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            {nextLevel && (
              <View style={styles.levelDetailProgress}>
                <View style={styles.levelDetailBarBg}>
                  <View style={[
                    styles.levelDetailBarFill,
                    {
                      backgroundColor: level.color,
                      width: `${Math.round(((totalBadges - level.minAchievements) / (nextLevel.minAchievements - level.minAchievements)) * 100)}%`,
                    },
                  ]} />
                </View>
                <Text style={[styles.levelDetailNext, { color: nextLevel.color }]}>
                  {nextLevel.icon} {nextLevel.label} — {nextLevel.minAchievements - totalBadges} logro{(nextLevel.minAchievements - totalBadges) !== 1 ? 's' : ''} más
                </Text>
              </View>
            )}
            {!nextLevel && (
              <Text style={[styles.levelDetailNext, { color: level.color, marginTop: 8, textAlign: 'center' }]}>
                🏆 ¡Nivel máximo alcanzado!
              </Text>
            )}
          </View>

          {/* All levels preview */}
          <View style={styles.allLevelsRow}>
            {AQUARIST_LEVELS.map(lv => {
              const reached = totalBadges >= lv.minAchievements;
              const isCurrent = lv.id === level.id;
              return (
                <View key={lv.id} style={[
                  styles.levelPill,
                  reached && { backgroundColor: lv.color + '18', borderColor: lv.color + '44' },
                  isCurrent && { backgroundColor: lv.color + '28', borderColor: lv.color },
                ]}>
                  <Text style={{ fontSize: 14 }}>{reached ? lv.icon : '🔒'}</Text>
                  <Text style={[
                    styles.levelPillText,
                    reached && { color: lv.color },
                    !reached && { color: COLORS.textMuted },
                  ]}>{lv.minAchievements}</Text>
                </View>
              );
            })}
          </View>
        </RAnimated.View>

        {/* ── Recent achievements ─────────────────────────────────────────────── */}
        {recentBadges.length > 0 && (
          <RAnimated.View
            entering={FadeInDown.delay(500).duration(450).springify().damping(16)}
            style={styles.sectionWrap}
          >
            <View style={styles.sectionRow}>
              <Text style={styles.formLabel}>Últimos logros</Text>
              <View style={styles.badgeCountPill}>
                <Text style={styles.badgeCountText}>{totalBadges}</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievScroll}
            >
              {recentBadges.map((u, i) => {
                const rarity = RARITY_CONFIG[u.ach!.rarity] ?? RARITY_CONFIG.bronze;
                return (
                  <RAnimated.View
                    key={u.id}
                    entering={FadeInRight.delay(550 + i * 60).duration(380).springify().damping(14)}
                    style={[styles.achievCard, { borderColor: rarity.color + '44' }]}
                  >
                    <View style={[styles.achievIconWrap, { backgroundColor: rarity.color + '18' }]}>
                      <Ionicons name={u.ach!.icon as any} size={26} color={rarity.color} />
                    </View>
                    <Text style={styles.achievName} numberOfLines={2}>{u.ach!.title}</Text>
                    <View style={[styles.rarityPill, { backgroundColor: rarity.color + '28' }]}>
                      <Text style={[styles.rarityText, { color: rarity.color }]}>{rarity.label}</Text>
                    </View>
                  </RAnimated.View>
                );
              })}
            </ScrollView>
          </RAnimated.View>
        )}

        {/* ── More sections ────────────────────────────────────────────────────── */}
        {navigation && (
          <RAnimated.View
            entering={FadeInDown.delay(570).duration(450).springify().damping(16)}
            style={styles.sectionWrap}
          >
            <Text style={styles.formLabel}>Más secciones</Text>
            <View style={styles.actionsCard}>
              {[
                { label: 'Galería', icon: 'images-outline', color: COLORS.accent, screen: 'Gallery' },
                { label: 'Comunidad', icon: 'people-outline', color: COLORS.primary, screen: 'Community' },
                { label: 'Chat de soporte', icon: 'chatbubble-outline', color: COLORS.success, screen: 'Chat' },
              ].map(({ label, icon, color, screen }, i, arr) => (
                <React.Fragment key={screen}>
                  <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate(screen)}>
                    <View style={[styles.actionIcon, { backgroundColor: color + '20' }]}>
                      <Ionicons name={icon as any} size={18} color={color} />
                    </View>
                    <Text style={styles.actionText}>{label}</Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  {i < arr.length - 1 && <View style={styles.actionDivider} />}
                </React.Fragment>
              ))}
            </View>
          </RAnimated.View>
        )}

        {/* ── Legal ─────────────────────────────────────────────────────────────── */}
        {navigation && (
          <View style={styles.sectionWrap}>
            <Text style={styles.formLabel}>Legal</Text>
            <View style={styles.actionsCard}>
              <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Legal', { tab: 'privacy' })}>
                <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.actionText}>Política de privacidad</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Legal', { tab: 'terms' })}>
                <View style={[styles.actionIcon, { backgroundColor: COLORS.accent + '20' }]}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.accent} />
                </View>
                <Text style={styles.actionText}>Términos de uso</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Account actions ─────────────────────────────────────────────────── */}
        <RAnimated.View
          entering={FadeInDown.delay(650).duration(450).springify().damping(16)}
          style={styles.sectionWrap}
        >
          <Text style={styles.formLabel}>Cuenta</Text>
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionRow} onPress={confirmReset}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '20' }]}>
                <Ionicons name="refresh-outline" size={18} color={COLORS.warning} />
              </View>
              <Text style={[styles.actionText, { color: COLORS.text }]}>Reiniciar onboarding</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity style={styles.actionRow} onPress={async () => {
              if (__DEV__) {
                Alert.alert('Modo desarrollo', 'Las actualizaciones OTA solo están disponibles en la app publicada.');
                return;
              }
              try {
                Alert.alert('Buscando actualización…', 'Espera un momento');
                const result = await Updates.checkForUpdateAsync();
                if (result.isAvailable) {
                  await Updates.fetchUpdateAsync();
                  Alert.alert('✅ Actualización descargada', 'La app se reiniciará ahora con los cambios.', [
                    { text: 'OK', onPress: () => Updates.reloadAsync().catch(() => {}) },
                  ]);
                } else {
                  Alert.alert('Al día', 'Ya tienes la última versión instalada.');
                }
              } catch (e: any) {
                // checkForUpdateAsync puede fallar por red intermitente o por
                // una comprobación concurrente al arrancar. Mensaje amable +
                // opción de reiniciar (por si ya se descargó al abrir la app).
                Alert.alert(
                  'No se pudo verificar ahora',
                  'Revisa tu conexión e inténtalo de nuevo. Si ya se descargó una actualización al abrir la app, reiniciar la aplicará.',
                  [
                    { text: 'Cerrar', style: 'cancel' },
                    { text: 'Reiniciar app', onPress: () => Updates.reloadAsync().catch(() => {}) },
                  ],
                );
              }
            }}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="cloud-download-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={[styles.actionText, { color: COLORS.text }]}>Buscar actualizaciones</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity style={styles.actionRow} onPress={confirmSignOut}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.error + '20' }]}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
              </View>
              <Text style={[styles.actionText, { color: COLORS.error }]}>Cerrar sesión</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </RAnimated.View>

        {/* Build / Update version info */}
        <Text style={{
          color: COLORS.textMuted, fontSize: 10, textAlign: 'center',
          marginTop: SPACING.md, paddingBottom: SPACING.lg,
        }}>
          v1.0.0 · Update {(Updates.updateId ?? 'embedded').slice(0, 8)}
        </Text>

      </ScrollView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  topBarTitle: { fontSize: 17, fontFamily: FONTS.sansSb, color: COLORS.text },
  saveTopBtn: {
    paddingVertical: 8, paddingHorizontal: 18,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  saveTopBtnText: { color: '#fff', fontFamily: FONTS.sansBd, fontSize: 14 },

  // Hero block
  heroBlock: { alignItems: 'center', paddingTop: SPACING.xl, paddingBottom: SPACING.xl },

  avatarWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },

  avatarCircle: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: COLORS.primary + '15',
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10, shadowRadius: 8, elevation: 4,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: { fontSize: 40, fontFamily: FONTS.sansEb, color: COLORS.primary },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 3, elevation: 3,
  },

  heroName: { fontSize: 22, fontFamily: FONTS.sansEb, color: COLORS.text, letterSpacing: -0.4, marginBottom: 4 },
  heroEmail: { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textMuted, marginBottom: SPACING.md },

  expBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  expBadgeText: { fontSize: 13, fontFamily: FONTS.sansSb },

  // Stats row
  statsRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1, backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl, padding: SPACING.md,
    alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontFamily: FONTS.sansEb },
  statLabel: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted, textAlign: 'center' },

  // Sections
  sectionWrap: { marginHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  formLabel: {
    fontSize: 11, fontFamily: FONTS.sansBd, color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },

  // Input
  input: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    color: COLORS.text, fontSize: 15, fontFamily: FONTS.sans,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },

  // Experience cards
  expCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.sm, gap: 12,
    // No elevation/shadow — on Android new arch, elevation+borderColor+
    // semi-transparent background renders as a glitch band. The border alone
    // provides enough emphasis.
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04, shadowRadius: 3,
    } : {}),
  },
  expIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  expBody: { flex: 1 },
  expLabel: { fontSize: 15, fontFamily: FONTS.sansBd, color: COLORS.text, marginBottom: 2 },
  expDesc:  { fontSize: 12, fontFamily: FONTS.sans,   color: COLORS.textMuted },

  // Achievements horizontal scroll
  badgeCountPill: {
    backgroundColor: COLORS.primary + '18', borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.primary + '33',
  },
  badgeCountText: { color: COLORS.primary, fontFamily: FONTS.sansBd, fontSize: 12 },
  achievScroll: { gap: SPACING.sm, paddingBottom: SPACING.xs },
  achievCard: {
    width: 110, backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl, padding: SPACING.sm,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  achievIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  achievName:  { fontSize: 11, fontFamily: FONTS.sansBd, color: COLORS.text, textAlign: 'center' },
  rarityPill:  { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  rarityText:  { fontSize: 9, fontFamily: FONTS.sansEb, letterSpacing: 0.4 },

  // Actions card
  actionsCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.md,
  },
  actionDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  actionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { flex: 1, fontSize: 15, fontFamily: FONTS.sansMd },

  // Aquarist level detail card
  levelDetailCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl, borderWidth: 1,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  levelDetailTop: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4,
  },
  levelDetailIcon: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  levelDetailName: { fontSize: 20, fontFamily: FONTS.sansEb, marginBottom: 2 },
  levelDetailSub: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted },
  levelDetailProgress: { marginTop: SPACING.sm },
  levelDetailBarBg: {
    height: 8, backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden',
    marginBottom: 6,
  },
  levelDetailBarFill: { height: '100%', borderRadius: 4, minWidth: 4 },
  levelDetailNext: { fontSize: 12, fontFamily: FONTS.sansBd },

  allLevelsRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 4,
  },
  levelPill: {
    flex: 1, alignItems: 'center', paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.backgroundCard,
  },
  levelPillText: { fontSize: 9, fontFamily: FONTS.sansBd, marginTop: 2 },
});
