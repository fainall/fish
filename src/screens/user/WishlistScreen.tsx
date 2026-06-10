/**
 * WishlistScreen (#18 + #19)
 *  - Tab "Wishlist": fish the user wants. Shows compatibility with current aquarium.
 *  - Tab "Historial": added/removed fish log per aquarium.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FishImage as Image } from '../../components/FishImage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, FadeOutLeft, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useFishDatabase } from '../../hooks/useFishDatabase';
import { useAquariums } from '../../hooks/useAquariums';
import { useWishlist } from '../../hooks/useWishlist';
import { useFishHistory, REMOVAL_REASON_LABELS, RemovalReason } from '../../hooks/useFishHistory';
import { confirmAction } from '../../utils/confirm';
import { Fish } from '../../types';
import { getEffectiveVolume } from '../../utils/stocking';

type Tab = 'wishlist' | 'history';

// Smart compatibility check using expert data
function quickCompat(fish: Fish, currentFish: Fish[], tankLiters?: number): { score: number; warnings: string[]; bonuses: string[] } {
  if (currentFish.length === 0) return { score: 100, warnings: [], bonuses: [] };
  const warnings: string[] = [];
  const bonuses: string[] = [];

  // Water type mismatch — fatal
  for (const f of currentFish) {
    if (f.water_type !== fish.water_type) {
      warnings.push(`Tipo de agua incompatible con ${f.common_name}`);
    }
  }
  if (warnings.length > 0) return { score: 0, warnings, bonuses };

  // Expert: compatible_with / avoid_with
  for (const f of currentFish) {
    if (fish.avoid_with?.includes(f.scientific_name) || f.avoid_with?.includes(fish.scientific_name)) {
      warnings.push(`⛔ Expertos desaconsejan juntar con ${f.common_name}`);
    }
    if (fish.compatible_with?.includes(f.scientific_name) || f.compatible_with?.includes(fish.scientific_name)) {
      bonuses.push(`✅ Compañero ideal con ${f.common_name}`);
    }
  }

  // Temp/pH overlap check
  for (const f of currentFish) {
    if (fish.temp_max < f.temp_min || fish.temp_min > f.temp_max)
      warnings.push(`Temp incompatible con ${f.common_name}`);
    if (fish.ph_max < f.ph_min || fish.ph_min > f.ph_max)
      warnings.push(`pH incompatible con ${f.common_name}`);
  }

  // Aggression
  for (const f of currentFish) {
    if (Math.abs(f.aggression - fish.aggression) >= 3)
      warnings.push(`Diferencia agresividad notable con ${f.common_name}`);
  }

  // Tank size check
  if (tankLiters && fish.min_tank_liters > tankLiters)
    warnings.push(`Necesita ≥${fish.min_tank_liters}L, tu acuario tiene ${tankLiters}L`);

  // Difficulty badge
  if (fish.difficulty === 'expert')
    warnings.push(`Pez de nivel experto — requiere experiencia avanzada`);

  const score = Math.max(0, Math.min(100, 100 - warnings.length * 18 + bonuses.length * 10));
  return { score, warnings, bonuses };
}

export default function WishlistScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('wishlist');
  const { fish: db } = useFishDatabase();
  const { items: wlItems, remove: removeWl } = useWishlist();
  const { history, remove: removeHist } = useFishHistory();
  const { aquariums, selectedAquarium } = useAquariums();

  // Fish currently in the active aquarium
  const currentAquariumFish = useMemo(() => {
    if (!selectedAquarium) return [];
    return selectedAquarium.fish.flatMap(entry => {
      const fishData = db.find(f => f.id === entry.fishId);
      return fishData ? [fishData] : [];
    });
  }, [selectedAquarium, db]);

  const tankLiters = selectedAquarium
    ? getEffectiveVolume(selectedAquarium.volume_liters, selectedAquarium.displacement)
    : undefined;

  // Hydrate wishlist items with full Fish data + compatibility score
  const enrichedWishlist = useMemo(() => {
    return wlItems
      .map(w => {
        const fish = db.find(f => f.id === w.fish_id);
        if (!fish) return null;
        const compat = quickCompat(fish, currentAquariumFish, tankLiters);
        return { ...w, fish, ...compat };
      })
      .filter(Boolean) as Array<typeof wlItems[number] & { fish: Fish; score: number; warnings: string[]; bonuses: string[] }>;
  }, [wlItems, db, currentAquariumFish, tankLiters]);

  // Group history by date
  const historySorted = useMemo(
    () => [...history].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [history],
  );

  function aquariumName(id: string): string {
    return aquariums.find(a => a.id === id)?.name ?? 'Acuario';
  }

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={S.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* Top bar */}
      <View style={S.topBar}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={S.title}>Mi colección</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={S.tabs}>
        <TouchableOpacity
          style={[S.tab, tab === 'wishlist' && S.tabOn]}
          onPress={() => setTab('wishlist')}
        >
          <Ionicons name={tab === 'wishlist' ? 'heart' : 'heart-outline'} size={16}
            color={tab === 'wishlist' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[S.tabText, tab === 'wishlist' && S.tabTextOn]}>
            Wishlist ({enrichedWishlist.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[S.tab, tab === 'history' && S.tabOn]}
          onPress={() => setTab('history')}
        >
          <Ionicons name={tab === 'history' ? 'time' : 'time-outline'} size={16}
            color={tab === 'history' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[S.tabText, tab === 'history' && S.tabTextOn]}>
            Historial ({historySorted.length})
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'wishlist' ? (
        enrichedWishlist.length === 0 ? (
          <View style={S.empty}>
            <Ionicons name="heart-outline" size={56} color={COLORS.textMuted} />
            <Text style={S.emptyTitle}>Wishlist vacía</Text>
            <Text style={S.emptyText}>
              Toca el ❤️ en cualquier pez del catálogo para añadirlo aquí.
            </Text>
          </View>
        ) : (
          <FlatList
            data={enrichedWishlist}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: SPACING.md, paddingBottom: 80 }}
            renderItem={({ item, index }) => {
              const compatColor = item.score >= 75 ? COLORS.success : item.score >= 40 ? COLORS.warning : COLORS.error;
              return (
                <Animated.View
                  entering={FadeInRight.delay(Math.min(index, 6) * 50).duration(280)}
                  exiting={FadeOutLeft.duration(200)}
                  layout={Layout.springify()}
                  style={S.card}>
                  {item.fish.image_url ? (
                    <Image source={{ uri: item.fish.image_url }} style={S.cardImg} />
                  ) : (
                    <View style={[S.cardImg, S.cardImgEmpty]}>
                      <Ionicons name="fish" size={26} color={COLORS.primary} />
                    </View>
                  )}
                  <View style={S.cardBody}>
                    <Text style={S.cardName}>{item.fish.common_name}</Text>
                    <Text style={S.cardSci}>{item.fish.scientific_name}</Text>
                    {selectedAquarium && (
                      <View style={[S.compatBadge, { backgroundColor: compatColor + '22' }]}>
                        <Text style={[S.compatText, { color: compatColor }]}>
                          {item.score}% compatible con "{selectedAquarium.name}"
                        </Text>
                      </View>
                    )}
                    {item.bonuses && item.bonuses.length > 0 && (
                      <Text style={S.bonusText} numberOfLines={2}>{item.bonuses[0]}</Text>
                    )}
                    {item.warnings.length > 0 && (
                      <Text style={S.warnText} numberOfLines={2}>⚠️ {item.warnings[0]}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmAction('Quitar de wishlist', `¿Quitar ${item.fish.common_name} de tu lista?`, () => removeWl(item.fish_id), 'Quitar')}
                    style={S.removeBtn}
                  >
                    <Ionicons name="close" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </Animated.View>
              );
            }}
          />
        )
      ) : historySorted.length === 0 ? (
        <View style={S.empty}>
          <Ionicons name="time-outline" size={56} color={COLORS.textMuted} />
          <Text style={S.emptyTitle}>Sin historial aún</Text>
          <Text style={S.emptyText}>
            Cada vez que añadas o quites peces de un acuario aparecerán aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={historySorted}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 80 }}
          renderItem={({ item }) => {
            const isAdded = item.action === 'added';
            const color   = isAdded ? COLORS.success : COLORS.error;
            const reason  = item.reason ? REMOVAL_REASON_LABELS[item.reason] : null;
            return (
              <View style={[S.card, S.histCard]}>
                <View style={[S.histIcon, { backgroundColor: color + '22' }]}>
                  <Ionicons
                    name={isAdded ? 'add-circle' : 'remove-circle'}
                    size={20}
                    color={color}
                  />
                </View>
                <View style={S.cardBody}>
                  <Text style={S.cardName}>
                    {isAdded ? '+' : '−'}{item.qty} {item.fish_name}
                  </Text>
                  <Text style={S.cardSci}>📦 {aquariumName(item.aquarium_id)}</Text>
                  {reason && <Text style={[S.cardSci, { color }]}>{reason}</Text>}
                  <Text style={S.histDate}>
                    {new Date(item.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => confirmAction('Eliminar registro', '¿Eliminar este registro del historial?', () => removeHist(item.id), 'Eliminar')}
                  style={S.removeBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },

  tabs: {
    flexDirection: 'row', marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 6, borderRadius: BORDER_RADIUS.lg,
  },
  tabOn:    { backgroundColor: COLORS.primary + '14' },
  tabText:  { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.sans },
  tabTextOn:{ color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansEb },
  emptyText:  { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, fontFamily: FONTS.sans, paddingHorizontal: SPACING.lg },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardImg: { width: 60, height: 60, borderRadius: BORDER_RADIUS.lg },
  cardImgEmpty: { backgroundColor: COLORS.backgroundLight, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  cardSci:  { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 2, fontFamily: FONTS.sans },
  compatBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  compatText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.sansBd },
  bonusText:  { fontSize: 11, color: COLORS.success, marginTop: 2, fontFamily: FONTS.sansBd },
  warnText:   { fontSize: 11, color: COLORS.warning, marginTop: 2, fontFamily: FONTS.sans },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  histCard: { gap: SPACING.md },
  histIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  histDate: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, fontFamily: FONTS.sans },
});
