import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, Platform, useWindowDimensions,
} from 'react-native';
import RAnimated, { FadeInRight, FadeOutLeft, Layout, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { FishImage as Image } from '../../components/FishImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useFishDatabase } from '../../hooks/useFishDatabase';
import { useAquariums } from '../../hooks/useAquariums';
import { useUserProfile } from '../../hooks/useUserProfile';
import { checkAquariumCompatibility } from '../../utils/compatibility';
import { Fish, WaterType, AquariumStyle, CompatibilityResult, AquariumEntry } from '../../types';
import { getStyleInfo, styleFitScore } from '../../data/aquariumStyles';
import Aquarium3D from '../../components/aquarium/Aquarium3D';
import { confirmAction } from '../../utils/confirm';
import { useFishHistory, REMOVAL_REASON_LABELS, RemovalReason } from '../../hooks/useFishHistory';

// Calcula o estima dimensiones del tanque a partir del volumen (ratio típico 2.5:1:0.75)
function getDims(aq: AquariumEntry) {
  if (aq.length_cm && aq.width_cm && aq.height_cm) {
    return { lengthCm: aq.length_cm, widthCm: aq.width_cm, heightCm: aq.height_cm };
  }
  const x = Math.cbrt((aq.volume_liters * 1000) / 1.875);
  return {
    lengthCm: Math.max(20, Math.round(x * 2.5)),
    widthCm:  Math.max(10, Math.round(x)),
    heightCm: Math.max(10, Math.round(x * 0.75)),
  };
}

// ── Compat config ─────────────────────────────────────────────────────────────
const COMPAT_COLORS: Record<CompatibilityResult, string> = {
  compatible:   COLORS.success,
  caution:      COLORS.warning,
  incompatible: COLORS.error,
};
const COMPAT_ICONS: Record<CompatibilityResult, string> = {
  compatible:   'checkmark-circle',
  caution:      'warning',
  incompatible: 'close-circle',
};

// ── Fish row card (Card Type C — dynamic glow) ────────────────────────────────
function FishCard({ fishData, qty, onChangeQty, onRemove, aquariumStyle }: {
  fishData: Fish;
  qty: number;
  onChangeQty: (delta: number) => void;
  onRemove: () => void;
  aquariumStyle?: AquariumStyle;
}) {
  const { width: screenW } = useWindowDimensions();
  const imgSize = Math.round(Math.min(1.4, Math.max(0.85, screenW / 375)) * 82);
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn  = () => { scale.value = withSpring(0.97, { damping: 20, stiffness: 300 }); };
  const onPressOut = () => { scale.value = withSpring(1,    { damping: 15, stiffness: 200 }); };

  const schoolingWarn  = fishData.is_schooling && qty < (fishData.schooling_min ?? 6);
  const fitCategory    = getFitCategory(fishData, aquariumStyle);
  const paramConflicts = aquariumStyle ? getParamConflicts(fishData, aquariumStyle) : [];

  return (
    <RAnimated.View style={[styles.fishCard, scaleStyle]}>
      <TouchableOpacity activeOpacity={1} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.fishCardInner}>

        {/* Imagen flush izquierda */}
        {fishData.image_url ? (
          <Image source={{ uri: fishData.image_url }} style={[styles.fishCardImage, { width: imgSize }]} resizeMode="cover" />
        ) : (
          <View style={styles.fishCardIconWrap}>
            <Text style={styles.fishCardEmoji}>🐠</Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.fishCardBody}>
          <Text style={styles.fishCardName}>{fishData.common_name}</Text>
          <Text style={styles.fishCardSci}>{fishData.scientific_name}</Text>
          <View style={styles.fishCardMeta}>
            <View style={styles.fishMetaPill}>
              <Text style={styles.fishMetaText}>{fishData.temp_min}–{fishData.temp_max}°C</Text>
            </View>
            <View style={styles.fishMetaPill}>
              <Text style={styles.fishMetaText}>{fishData.adult_size_cm} cm</Text>
            </View>
            <View style={styles.fishMetaPill}>
              <Text style={styles.fishMetaText}>≥{fishData.min_tank_liters} L</Text>
            </View>
            {schoolingWarn && (
              <View style={[styles.fishMetaPill, { backgroundColor: COLORS.warning + '20' }]}>
                <Text style={[styles.fishMetaText, { color: COLORS.warning }]}>
                  ⚠ cardumen mín {fishData.schooling_min ?? 6}
                </Text>
              </View>
            )}
          </View>
          {paramConflicts.length > 0 && (
            <View style={[styles.fishTempWarn, fitCategory === 'incompatible' && { backgroundColor: COLORS.error + '15' }]}>
              <Ionicons
                name={fitCategory === 'incompatible' ? 'close-circle-outline' : 'warning-outline'}
                size={11}
                color={fitCategory === 'incompatible' ? COLORS.error : COLORS.warning}
              />
              <View style={{ flex: 1 }}>
                {paramConflicts.map((c, i) => (
                  <Text key={i} style={[styles.fishTempWarnText, fitCategory === 'incompatible' && { color: COLORS.error }]}>
                    {c}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Qty + delete */}
        <View style={styles.fishCardQty}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => onChangeQty(-1)}>
            <Ionicons name="remove" size={12} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.qtyNum}>{qty}</Text>
          <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={() => onChangeQty(1)}>
            <Ionicons name="add" size={12} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} style={styles.fishCardDelete}>
            <Ionicons name="trash-outline" size={12} color={COLORS.error} />
          </TouchableOpacity>
        </View>

      </TouchableOpacity>
    </RAnimated.View>
  );
}

// ── Stock calculator ──────────────────────────────────────────────────────────
function StockCalc({ volumeLiters, fishList }: { volumeLiters: number; fishList: { fishData: Fish; qty: number }[] }) {
  const totalCm = fishList.reduce((s, { fishData, qty }) => s + fishData.adult_size_cm * qty, 0);
  const bioload  = volumeLiters > 0 ? Math.min(100, Math.round((totalCm / volumeLiters) * 100)) : 0;
  const color    = bioload < 50 ? COLORS.success : bioload < 80 ? COLORS.warning : COLORS.error;
  const label    = bioload < 50 ? 'Espacio disponible' : bioload < 80 ? 'Tanque moderado' : 'Sobrepoblación';
  const schoolingIssues = fishList.filter(({ fishData, qty }) => fishData.is_schooling && qty < (fishData.schooling_min ?? 6));

  return (
    <View style={styles.stockCard}>
      <View style={styles.stockRow}>
        {[
          { label: 'Volumen', value: `${volumeLiters}L`, color: COLORS.primary },
          { label: 'Total cm', value: `${totalCm}cm`, color: COLORS.textSecondary },
          { label: 'Carga', value: `${bioload}%`, color },
        ].map(s => (
          <View key={s.label} style={styles.stockStat}>
            <Text style={[styles.stockStatValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.stockStatLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bioloadTrack}>
        <View style={[styles.bioloadFill, { width: `${bioload}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.bioloadLabel, { color }]}>{label}</Text>

      {schoolingIssues.map(({ fishData, qty }) => (
        <View key={fishData.id} style={styles.schoolingRow}>
          <Ionicons name="people-outline" size={12} color={COLORS.warning} />
          <Text style={styles.schoolingRowText}>
            {fishData.common_name}: tienes {qty}, necesita mín. {fishData.schooling_min ?? 6}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Concordancia pez ↔ estilo de acuario ─────────────────────────────────────
// Usa aquariumStyles.ts como fuente única de verdad para rangos de parámetros.

type FitCategory = 'ideal' | 'marginal' | 'incompatible';

/** Score 0-100 de qué tan bien encaja el pez en el estilo */
function getFitScore(fish: Fish, style?: AquariumStyle): number {
  if (!style) return 100;
  const info = getStyleInfo(style);
  if (!info) return 100;
  if (fish.water_type !== info.waterType) return 0;
  return styleFitScore(style, fish);
}

function getFitCategory(fish: Fish, style?: AquariumStyle): FitCategory {
  const score = getFitScore(fish, style);
  if (score >= 65) return 'ideal';
  if (score >= 25) return 'marginal';
  return 'incompatible';
}

/**
 * Devuelve los parámetros que NO solapan entre el pez y el estilo.
 * Solapamiento = los rangos se tocan aunque sea en un punto.
 */
function getParamConflicts(fish: Fish, style: AquariumStyle): string[] {
  const info = getStyleInfo(style);
  if (!info) return [];
  const p = info.params;
  const issues: string[] = [];

  const noOverlap = (fMin: number, fMax: number, sMin: number, sMax: number) =>
    fMin > sMax || fMax < sMin;

  if (noOverlap(fish.temp_min, fish.temp_max, p.temp_min, p.temp_max))
    issues.push(`Temperatura: pez ${fish.temp_min}–${fish.temp_max}°C / acuario ${p.temp_min}–${p.temp_max}°C`);

  if (noOverlap(fish.ph_min, fish.ph_max, p.ph_min, p.ph_max))
    issues.push(`pH: pez ${fish.ph_min}–${fish.ph_max} / acuario ${p.ph_min}–${p.ph_max}`);

  if (noOverlap(fish.gh_min, fish.gh_max, p.gh_min, p.gh_max))
    issues.push(`Dureza GH: pez ${fish.gh_min}–${fish.gh_max}°dH / acuario ${p.gh_min}–${p.gh_max}°dH`);

  return issues;
}

// ── Setup recommendations from expert fish data ────────────────────────────
function getSetupRecs(fish: Fish[]): { icon: string; text: string }[] {
  const recs: { icon: string; text: string }[] = [];
  const needHiding = fish.filter(f => f.needs_hiding);
  const needDriftwood = fish.filter(f => f.needs_driftwood);
  const plantCompat = fish.filter(f => f.plant_compatible === false);
  const flows = fish.map(f => f.flow_preference).filter(Boolean) as string[];
  const lights = fish.map(f => f.light_preference).filter(Boolean) as string[];
  const substrates = fish.map(f => f.substrate_preference).filter(Boolean) as string[];

  if (needHiding.length > 0)
    recs.push({ icon: '🪨', text: `${needHiding.length} pez${needHiding.length > 1 ? 'ces necesitan' : ' necesita'} escondites (cuevas, rocas, tubos)` });
  if (needDriftwood.length > 0)
    recs.push({ icon: '🪵', text: `${needDriftwood.length} pez${needDriftwood.length > 1 ? 'ces necesitan' : ' necesita'} troncos/madera` });
  if (plantCompat.length > 0)
    recs.push({ icon: '🌿', text: `${plantCompat.length} pez${plantCompat.length > 1 ? 'ces pueden dañar' : ' puede dañar'} las plantas` });

  if (flows.length > 0) {
    const hasStill = flows.includes('still') || flows.includes('gentle');
    const hasStrong = flows.includes('strong');
    if (hasStill && hasStrong)
      recs.push({ icon: '🌊', text: 'Conflicto de flujo: algunos prefieren corriente suave y otros fuerte' });
    else if (hasStill)
      recs.push({ icon: '💧', text: 'Flujo suave recomendado para tus peces' });
    else if (hasStrong)
      recs.push({ icon: '🌊', text: 'Flujo fuerte recomendado para tus peces' });
  }

  if (lights.length > 0) {
    const hasDim = lights.includes('dim');
    const hasBright = lights.includes('bright');
    if (hasDim && hasBright)
      recs.push({ icon: '💡', text: 'Conflicto de luz: usa zonas sombreadas para los peces sensibles' });
    else if (hasDim)
      recs.push({ icon: '🌑', text: 'Iluminación tenue preferida — evita luces intensas' });
  }

  if (substrates.length > 0) {
    const unique = [...new Set(substrates)];
    if (unique.length === 1)
      recs.push({ icon: '⬇️', text: `Sustrato recomendado: ${unique[0]}` });
    else if (unique.length <= 3)
      recs.push({ icon: '⬇️', text: `Sustratos recomendados: ${unique.join(', ')}` });
  }

  return recs;
}

// ── Style options ─────────────────────────────────────────────────────────────
const STYLE_OPTIONS: { value: AquariumStyle; label: string; emoji: string }[] = [
  { value: 'amazonico',   label: 'Amazónico',  emoji: '🌿' },
  { value: 'tropical',    label: 'Tropical',   emoji: '🌴' },
  { value: 'agua_fria',   label: 'Agua fría',  emoji: '❄️' },
  { value: 'plantado',    label: 'Plantado',   emoji: '🌱' },
  { value: 'africano',    label: 'Africano',   emoji: '🏔️' },
  { value: 'comunitario', label: 'Comunitario',emoji: '🐟' },
  { value: 'biotopico',   label: 'Biotópico',  emoji: '🏞️' },
  { value: 'marino',      label: 'Marino',     emoji: '🌊' },
  { value: 'arrecife',    label: 'Arrecife',   emoji: '🪸' },
  { value: 'salobre',     label: 'Salobre',    emoji: '🌅' },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function AquariumScreen({ navigation }: any) {
  const { s, fs, isTablet } = useResponsive();
  const { fish: fishDatabase } = useFishDatabase();
  const {
    aquariums, selectedAquarium, selectedId,
    selectAquarium, addAquarium, deleteAquarium,
    setFishQty, removeFish: removeFishRaw,
    loading: aquariumsLoading,
  } = useAquariums();
  const { profile } = useUserProfile();
  const { log: logHistory } = useFishHistory();

  // Removal-reason modal state (#19)
  const [removingFish, setRemovingFish] = useState<{ id: string; name: string; qty: number } | null>(null);

  // Wraps removeFish so we log to history with a chosen reason.
  const removeFish = useCallback(async (aqId: string, fishId: string) => {
    if (!selectedAquarium) return;
    const entry = selectedAquarium.fish.find(f => f.fishId === fishId);
    const fishData = fishDatabase.find(f => f.id === fishId);
    if (!entry || !fishData) {
      await removeFishRaw(aqId, fishId);
      return;
    }
    setRemovingFish({ id: fishId, name: fishData.common_name, qty: entry.qty });
  }, [selectedAquarium, fishDatabase, removeFishRaw]);

  const confirmRemoval = useCallback(async (reason: RemovalReason) => {
    if (!removingFish || !selectedAquarium) return;
    await removeFishRaw(selectedAquarium.id, removingFish.id);
    await logHistory({
      aquarium_id: selectedAquarium.id,
      fish_id:     removingFish.id,
      fish_name:   removingFish.name,
      action:      'removed',
      qty:         removingFish.qty,
      reason,
    });
    setRemovingFish(null);
  }, [removingFish, selectedAquarium, removeFishRaw, logHistory]);

  // Single-shot auto-create: only fires once even if aquariums becomes [] later
  const autoCreatedRef = useRef(false);
  useEffect(() => {
    if (autoCreatedRef.current) return;
    if (!aquariumsLoading && aquariums.length === 0 && profile.aquarium) {
      autoCreatedRef.current = true;
      addAquarium({
        name: 'Mi acuario',
        volume_liters: profile.aquarium.volume_liters,
        water_type: profile.aquarium.water_type,
        aquarium_style: profile.aquarium.aquarium_style,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aquariumsLoading, aquariums.length, profile.aquarium]);

  const [showCreateModal, setShowCreateModal]   = useState(false);
  const [showAddFishModal, setShowAddFishModal] = useState(false);
  const [showStockCalc, setShowStockCalc]       = useState(false);

  const [newName,      setNewName]      = useState('');
  const [newLength,    setNewLength]    = useState('');
  const [newWidth,     setNewWidth]     = useState('');
  const [newHeight,    setNewHeight]    = useState('');
  const [newWaterType, setNewWaterType] = useState<WaterType>('freshwater');
  const [newStyle,     setNewStyle]     = useState<AquariumStyle | undefined>();
  const [fishSearch,   setFishSearch]   = useState('');
  const [pendingQty,   setPendingQty]   = useState<Record<string, number>>({});

  const fishList = useMemo(() => {
    if (!selectedAquarium) return [];
    return selectedAquarium.fish.flatMap(entry => {
      const fishData = fishDatabase.find(f => f.id === entry.fishId);
      return fishData ? [{ fishData, qty: entry.qty }] : [];
    });
  }, [selectedAquarium, fishDatabase]);

  const compatResult = useMemo(() => {
    if (fishList.length < 2) return null;
    return checkAquariumCompatibility(fishList.map(({ fishData }) => fishData));
  }, [fishList]);

  const totalFishCount = fishList.reduce((s, { qty }) => s + qty, 0);

  // Use shared confirmAction helper (utils/confirm.ts)
  const webConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Confirmar') =>
    confirmAction(title, message, onConfirm, confirmText);

  const createAquarium = async () => {
    if (!newName || !newLength || !newWidth || !newHeight) {
      Alert.alert('Error', 'Completa el nombre y las dimensiones.'); return;
    }
    const l = parseInt(newLength, 10), w = parseInt(newWidth, 10), h = parseInt(newHeight, 10);
    if (!Number.isFinite(l) || !Number.isFinite(w) || !Number.isFinite(h) || l <= 0 || w <= 0 || h <= 0) {
      Alert.alert('Error', 'Las dimensiones deben ser números mayores que 0.'); return;
    }
    const volume = Math.round(l * w * h / 1000);
    await addAquarium({
      name: newName, volume_liters: volume, water_type: newWaterType, aquarium_style: newStyle,
      length_cm: l, width_cm: w, height_cm: h,
    });
    setShowCreateModal(false);
    setNewName(''); setNewLength(''); setNewWidth(''); setNewHeight(''); setNewStyle(undefined);
  };

  const confirmAddFish = async (fishId: string, qty: number) => {
    if (!selectedAquarium || qty < 1) return;
    const fishData = fishDatabase.find(f => f.id === fishId);
    if (!fishData) return;

    // 1. Tipo de agua — bloqueo
    if (fishData.water_type !== selectedAquarium.water_type) {
      Alert.alert('Agua incompatible', `Este pez necesita agua ${fishData.water_type}.`); return;
    }

    // 2. Concordancia con el estilo del acuario (temp + pH + GH)
    if (selectedAquarium.aquarium_style) {
      const conflicts = getParamConflicts(fishData, selectedAquarium.aquarium_style);
      if (conflicts.length > 0) {
        const styleInfo = getStyleInfo(selectedAquarium.aquarium_style);
        const styleLabel = styleInfo?.label ?? selectedAquarium.aquarium_style;
        const msg = `${fishData.common_name} no es compatible con el estilo "${styleLabel}":\n\n${conflicts.map(c => `• ${c}`).join('\n')}\n\n¿Añadir de todas formas?`;
        webConfirm('⚠️ Parámetros incompatibles', msg, () => {
          if (fishData.min_tank_liters > selectedAquarium.volume_liters) {
            webConfirm('Tanque pequeño', `${fishData.common_name} necesita ≥${fishData.min_tank_liters}L. ¿Añadir igual?`, () => doAdd(fishId, qty), 'Añadir igual');
          } else {
            doAdd(fishId, qty);
          }
        }, 'Añadir igual');
        return;
      }
    }

    // 3. Litros — advertencia
    if (fishData.min_tank_liters > selectedAquarium.volume_liters) {
      webConfirm('Tanque pequeño', `${fishData.common_name} necesita ≥${fishData.min_tank_liters}L. ¿Añadir igual?`, () => doAdd(fishId, qty), 'Añadir igual');
      return;
    }

    doAdd(fishId, qty);
  };

  const doAdd = async (fishId: string, qty: number) => {
    if (!selectedAquarium) return;
    const existing = selectedAquarium.fish.find(f => f.fishId === fishId);
    const fishData = fishDatabase.find(f => f.id === fishId);
    await setFishQty(selectedAquarium.id, fishId, (existing?.qty ?? 0) + qty);
    if (fishData) {
      // Log "added" to history (#19)
      await logHistory({
        aquarium_id: selectedAquarium.id,
        fish_id:     fishId,
        fish_name:   fishData.common_name,
        action:      'added',
        qty,
      });
    }
    setPendingQty({}); setShowAddFishModal(false);
  };

  const changeQty = async (fishId: string, delta: number) => {
    if (!selectedAquarium) return;
    const entry = selectedAquarium.fish.find(f => f.fishId === fishId);
    if (!entry) return;
    const next = entry.qty + delta;
    if (next <= 0) {
      webConfirm('Quitar pez', '¿Eliminar este pez del acuario?', () => removeFish(selectedAquarium.id, fishId), 'Quitar');
      return;
    }
    await setFishQty(selectedAquarium.id, fishId, next);
  };

  const handleDeleteAquarium = () => {
    if (!selectedAquarium) return;
    webConfirm('Eliminar acuario', `¿Eliminar "${selectedAquarium.name}"? Esta acción no se puede deshacer.`, () => deleteAquarium(selectedAquarium.id), 'Eliminar');
  };

  const filteredFish = useMemo(() => {
    const base = fishDatabase.filter(f =>
      f.common_name.toLowerCase().includes(fishSearch.toLowerCase()) &&
      f.water_type === (selectedAquarium?.water_type ?? 'freshwater')
    );
    // Ordenar por fit score descendente: ideales primero, incompatibles al final
    return [...base].sort((a, b) =>
      getFitScore(b, selectedAquarium?.aquarium_style) -
      getFitScore(a, selectedAquarium?.aquarium_style)
    );
  }, [fishDatabase, fishSearch, selectedAquarium?.water_type, selectedAquarium?.aquarium_style]);

  return (
    <LinearGradient colors={[COLORS.abyss, COLORS.background]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING.xxl }}>

        {/* ── Empty state ── */}
        {aquariums.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🪣</Text>
            <Text style={styles.emptyTitle}>Sin acuarios</Text>
            <Text style={styles.emptySub}>Crea tu primer acuario virtual para gestionar tu ecosistema.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Crear acuario</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Aquarium tabs ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {aquariums.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.tab, selectedId === a.id && styles.tabActive]}
                  onPress={() => selectAquarium(a.id)}
                >
                  <Ionicons name="cube-outline" size={13}
                    color={selectedId === a.id ? COLORS.primary : COLORS.textMuted} />
                  <Text style={[styles.tabText, selectedId === a.id && styles.tabTextActive]}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.tabAdd} onPress={() => setShowCreateModal(true)}>
                <Ionicons name="add" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </ScrollView>

            {selectedAquarium && (
              <>
                {/* ── Tank 3D visual ── */}
                <View style={styles.heroWrap}>
                  <Aquarium3D
                    {...getDims(selectedAquarium)}
                    fishCount={totalFishCount}
                    waterType={selectedAquarium.water_type}
                  />
                </View>

                {/* ── Aquarium info card ── */}
                <View style={styles.aquaInfoCard}>
                  {/* Name + delete */}
                  <View style={styles.aquaInfoHeader}>
                    <Text style={styles.aquaInfoName}>{selectedAquarium.name}</Text>
                    <TouchableOpacity onPress={handleDeleteAquarium} style={styles.heroDeleteBtn}>
                      <Ionicons name="trash-outline" size={13} color={COLORS.error} />
                      <Text style={styles.heroDeleteBtnText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Stats row */}
                  <View style={styles.aquaStatsRow}>
                    <View style={styles.aquaStat}>
                      <Text style={styles.aquaStatValue}>{selectedAquarium.volume_liters} L</Text>
                      <Text style={styles.aquaStatLabel}>Volumen</Text>
                    </View>
                    <View style={styles.aquaStatDivider} />
                    <View style={styles.aquaStat}>
                      <Text style={styles.aquaStatValue}>{totalFishCount}</Text>
                      <Text style={styles.aquaStatLabel}>Peces</Text>
                    </View>
                    <View style={styles.aquaStatDivider} />
                    <View style={styles.aquaStat}>
                      <Text style={styles.aquaStatValue}>{fishList.length}</Text>
                      <Text style={styles.aquaStatLabel}>Especies</Text>
                    </View>
                  </View>

                  {/* Tags row */}
                  <View style={styles.aquaTagsRow}>
                    <View style={styles.aquaTag}>
                      <Text style={styles.aquaTagText}>
                        {{ freshwater: '💧 Dulce', saltwater: '🌊 Salada', brackish: '🌅 Salobre' }[selectedAquarium.water_type]}
                      </Text>
                    </View>
                    {selectedAquarium.aquarium_style && (
                      <View style={styles.aquaTag}>
                        <Text style={styles.aquaTagText}>
                          {STYLE_OPTIONS.find(s => s.value === selectedAquarium.aquarium_style)?.emoji}{' '}
                          {STYLE_OPTIONS.find(s => s.value === selectedAquarium.aquarium_style)?.label}
                        </Text>
                      </View>
                    )}
                    {compatResult && (
                      <View style={[styles.aquaTag, {
                        backgroundColor: (compatResult.hasIssues ? COLORS.warning : COLORS.success) + '15',
                        borderColor: (compatResult.hasIssues ? COLORS.warning : COLORS.success) + '40',
                      }]}>
                        <Ionicons
                          name={compatResult.hasIssues ? 'warning' : 'checkmark-circle'}
                          size={11}
                          color={compatResult.hasIssues ? COLORS.warning : COLORS.success}
                        />
                        <Text style={[styles.aquaTagText, { color: compatResult.hasIssues ? COLORS.warning : COLORS.success }]}>
                          {compatResult.hasIssues ? 'Revisar compatibilidad' : 'Compatible'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* ── Compat warnings ── */}
                {compatResult && compatResult.checks.length > 0 && (() => {
                  const issues = compatResult.checks.filter(c => c.result !== 'compatible');
                  const allOk  = issues.length === 0;
                  const score  = compatResult.worstScore;
                  const scoreColor = score >= 75 ? COLORS.success : score >= 45 ? COLORS.warning : COLORS.error;
                  return (
                    <>
                      {/* Score summary bar */}
                      <View style={styles.compatSummary}>
                        <View style={styles.compatScoreWrap}>
                          <Text style={[styles.compatScoreNum, { color: scoreColor }]}>{score}</Text>
                          <Text style={styles.compatScoreLabel}>/ 100</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.compatScoreTitle}>
                            {allOk ? '✅ Todos compatibles' : `⚠️ ${issues.length} par${issues.length > 1 ? 'es' : ''} con problemas`}
                          </Text>
                          <View style={styles.compatBar}>
                            <View style={[styles.compatBarFill, { width: `${score}%` as any, backgroundColor: scoreColor }]} />
                          </View>
                        </View>
                      </View>

                      {/* Per-pair cards */}
                      {issues.map((check, i) => (
                        <View key={i} style={[styles.warnCard, { borderLeftColor: COMPAT_COLORS[check.result] }]}>
                          <View style={styles.warnTop}>
                            <Ionicons name={COMPAT_ICONS[check.result] as any} size={14} color={COMPAT_COLORS[check.result]} />
                            <Text style={[styles.warnTitle, { color: COMPAT_COLORS[check.result] }]}>
                              {check.fish_a.common_name} + {check.fish_b.common_name}
                            </Text>
                            <Text style={[styles.warnScore, { color: scoreColor }]}>{check.paramScore}%</Text>
                          </View>

                          {/* Parameter badges */}
                          <View style={styles.paramBadges}>
                            {([
                              { key: 'temp',  label: 'Temp' },
                              { key: 'ph',    label: 'pH'   },
                              { key: 'gh',    label: 'GH'   },
                              { key: 'water', label: 'Agua' },
                              { key: 'size',  label: 'Tamaño' },
                              { key: 'aggr',  label: 'Carácter' },
                            ] as const).map(({ key, label }) => {
                              const flag = check.params[key];
                              const col  = flag === 'ok' ? COLORS.success : flag === 'narrow' || flag === 'caution' ? COLORS.warning : COLORS.error;
                              const icon = flag === 'ok' ? 'checkmark' : flag === 'narrow' || flag === 'caution' ? 'alert' : 'close';
                              return (
                                <View key={key} style={[styles.paramBadge, { borderColor: col + '88' }]}>
                                  <Ionicons name={icon as any} size={10} color={col} />
                                  <Text style={[styles.paramBadgeText, { color: col }]}>{label}</Text>
                                </View>
                              );
                            })}
                          </View>

                          {check.reasons.map((r, ri) => (
                            <Text key={ri} style={styles.warnReason}>• {r}</Text>
                          ))}
                        </View>
                      ))}
                    </>
                  );
                })()}

                {/* ── Setup recommendations ── */}
                {fishList.length > 0 && (() => {
                  const recs = getSetupRecs(fishList.map(f => f.fishData));
                  if (recs.length === 0) return null;
                  return (
                    <View style={styles.setupRecsCard}>
                      <View style={styles.setupRecsHeader}>
                        <Ionicons name="build-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.setupRecsTitle}>Setup recomendado</Text>
                      </View>
                      {recs.map((r, i) => (
                        <View key={i} style={styles.setupRecRow}>
                          <Text style={styles.setupRecIcon}>{r.icon}</Text>
                          <Text style={styles.setupRecText}>{r.text}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })()}

                {/* ── Quick actions row ── */}
                {navigation && (
                  <View style={styles.quickActions}>
                    {[
                      { label: 'Agua', icon: 'water', color: COLORS.primary, screen: 'Parameters' },
                      { label: 'Salud', icon: 'medkit', color: COLORS.error, screen: 'Health' },
                      { label: 'Calc.', icon: 'calculator', color: '#7209b7', screen: 'Calculator' },
                      { label: 'Crianza', icon: 'egg', color: COLORS.warning, screen: 'Breeding' },
                    ].map(({ label, icon, color, screen }) => (
                      <TouchableOpacity
                        key={screen}
                        style={styles.quickAction}
                        onPress={() => navigation.navigate(screen)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.quickActionIcon, { backgroundColor: color + '15', width: s(46), height: s(46), borderRadius: s(23) }]}>
                          <Ionicons name={icon as any} size={s(18)} color={color} />
                        </View>
                        <Text style={[styles.quickActionLabel, { color, fontSize: fs(11) }]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* ── Stock calculator ── */}
                <TouchableOpacity
                  style={styles.stockToggle}
                  onPress={() => setShowStockCalc(v => !v)}
                >
                  <View style={styles.stockToggleIcon}>
                    <Ionicons name="calculator-outline" size={16} color={COLORS.primary} />
                  </View>
                  <Text style={styles.stockToggleText}>Calculadora de stock</Text>
                  <Ionicons name={showStockCalc ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
                {showStockCalc && <StockCalc volumeLiters={selectedAquarium.volume_liters} fishList={fishList} />}

                {/* ── Fish list header ── */}
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Habitantes</Text>
                  {fishList.length > 0 && (
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>{fishList.length} esp · {totalFishCount} peces</Text>
                    </View>
                  )}
                </View>

                {/* ── Fish cards ── */}
                {fishList.length === 0 ? (
                  <View style={styles.emptyFish}>
                    <Text style={styles.emptyFishEmoji}>🐠</Text>
                    <Text style={styles.emptyFishText}>Tu tanque espera sus primeros habitantes</Text>
                  </View>
                ) : (
                  fishList.map(({ fishData, qty }) => (
                    <FishCard
                      key={fishData.id}
                      fishData={fishData}
                      qty={qty}
                      aquariumStyle={selectedAquarium.aquarium_style}
                      onChangeQty={delta => changeQty(fishData.id, delta)}
                      onRemove={() => webConfirm('Quitar pez', `¿Eliminar ${fishData.common_name} del acuario?`, () => removeFish(selectedAquarium.id, fishData.id), 'Quitar')}
                    />
                  ))
                )}

                {/* ── Add fish button ── */}
                <TouchableOpacity
                  style={styles.addFishBtn}
                  onPress={() => setShowAddFishModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.addFishBtnText}>Añadir habitante</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Create Aquarium modal (bottom sheet) ── */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { maxHeight: '90%' }]}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nuevo Acuario</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.sheetClose}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TextInput style={styles.input} value={newName} onChangeText={setNewName}
                placeholder="Nombre del acuario" placeholderTextColor={COLORS.textMuted} />

              <Text style={styles.formLabel}>Dimensiones (cm)</Text>
              <View style={styles.dimsRow}>
                {[
                  { label: 'Largo', val: newLength, set: setNewLength },
                  { label: 'Ancho', val: newWidth,  set: setNewWidth  },
                  { label: 'Alto',  val: newHeight, set: setNewHeight },
                ].map(({ label, val, set }) => (
                  <View key={label} style={styles.dimField}>
                    <Text style={styles.dimLabel}>{label}</Text>
                    <TextInput
                      style={styles.dimInput} value={val} onChangeText={set}
                      placeholder="cm" placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad" maxLength={4}
                    />
                  </View>
                ))}
              </View>

              {newLength && newWidth && newHeight && (
                <View style={styles.volumePreview}>
                  <Ionicons name="cube-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.volumePreviewText}>
                    {Math.round(parseInt(newLength || '0') * parseInt(newWidth || '0') * parseInt(newHeight || '0') / 1000)} litros
                  </Text>
                </View>
              )}

              <Text style={styles.formLabel}>Tipo de agua</Text>
              <View style={styles.waterRow}>
                {(['freshwater', 'saltwater', 'brackish'] as WaterType[]).map(wt => (
                  <TouchableOpacity
                    key={wt}
                    style={[styles.waterBtn, newWaterType === wt && styles.waterBtnOn]}
                    onPress={() => setNewWaterType(wt)}
                  >
                    <Text style={[styles.waterBtnText, newWaterType === wt && styles.waterBtnTextOn]}>
                      {wt === 'freshwater' ? '💧 Dulce' : wt === 'saltwater' ? '🌊 Salada' : '🌅 Salobre'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Estilo (opcional)</Text>
              <View style={styles.styleGrid}>
                {STYLE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.styleBtn, newStyle === opt.value && styles.styleBtnOn]}
                    onPress={() => setNewStyle(prev => prev === opt.value ? undefined : opt.value)}
                  >
                    <Text style={styles.styleBtnEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.styleBtnLabel, newStyle === opt.value && styles.styleBtnLabelOn]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ height: SPACING.md }} />
            </ScrollView>

            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={createAquarium}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add Fish modal (bottom sheet) ── */}
      <Modal visible={showAddFishModal} animationType="slide" transparent
        onDismiss={() => { setPendingQty({}); setFishSearch(''); }}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { maxHeight: '85%' }]}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Añadir peces</Text>
              <TouchableOpacity
                onPress={() => { setShowAddFishModal(false); setPendingQty({}); setFishSearch(''); }}
                style={styles.sheetClose}
              >
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.fishSearchBar}>
              <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.fishSearchInput}
                value={fishSearch}
                onChangeText={setFishSearch}
                placeholder="Buscar por nombre..."
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {Object.keys(pendingQty).filter(id => pendingQty[id] > 0).length > 0 && (
              <TouchableOpacity
                style={styles.pendingConfirm}
                onPress={() => {
                  Object.entries(pendingQty)
                    .filter(([, qty]) => qty > 0)
                    .forEach(([fishId, qty]) => confirmAddFish(fishId, qty));
                }}
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.pendingConfirmText}>
                  Confirmar · {Object.values(pendingQty).reduce((a, b) => a + b, 0)} peces
                </Text>
              </TouchableOpacity>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Banner de parámetros del estilo */}
              {selectedAquarium?.aquarium_style && (() => {
                const info = getStyleInfo(selectedAquarium.aquarium_style);
                if (!info) return null;
                const p = info.params;
                return (
                  <View style={styles.tempBanner}>
                    <Text style={styles.tempBannerIcon}>{info.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tempBannerText, { fontFamily: FONTS.sansBd, marginBottom: 2 }]}>
                        {info.label} — parámetros objetivo
                      </Text>
                      <Text style={styles.tempBannerText}>
                        {p.temp_min}–{p.temp_max}°C · pH {p.ph_min}–{p.ph_max} · GH {p.gh_min}–{p.gh_max}°dH · KH {p.kh_min}–{p.kh_max}°dH
                      </Text>
                      <Text style={[styles.tempBannerText, { marginTop: 2, color: COLORS.textMuted }]}>
                        Peces ordenados por concordancia de parámetros
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {filteredFish.map((fish, idx) => {
                const qty         = pendingQty[fish.id] ?? 0;
                const alreadyIn   = selectedAquarium?.fish.find(f => f.fishId === fish.id);
                const waterOk     = fish.water_type === selectedAquarium?.water_type;
                const tankOk      = fish.min_tank_liters <= (selectedAquarium?.volume_liters ?? 0);
                const totalQty    = qty + (alreadyIn?.qty ?? 0);
                const schoolingOk = !fish.is_schooling || totalQty >= (fish.schooling_min ?? 6);
                const fitScore    = getFitScore(fish, selectedAquarium?.aquarium_style);
                const fitCat      = getFitCategory(fish, selectedAquarium?.aquarium_style);
                const conflicts   = selectedAquarium?.aquarium_style
                  ? getParamConflicts(fish, selectedAquarium.aquarium_style)
                  : [];

                // Separador entre secciones
                const prevScore = idx > 0
                  ? getFitScore(filteredFish[idx - 1], selectedAquarium?.aquarium_style)
                  : 101;
                const showIdealDivider    = idx === 0 && fitScore >= 65 && selectedAquarium?.aquarium_style;
                const showMarginalDivider = prevScore >= 65 && fitScore < 65 && fitScore >= 25 && selectedAquarium?.aquarium_style;
                const showIncompDivider   = prevScore >= 25 && fitScore < 25 && selectedAquarium?.aquarium_style;

                const scoreColor = fitScore >= 65 ? COLORS.success : fitScore >= 25 ? COLORS.warning : COLORS.error;

                return (
                  <React.Fragment key={fish.id}>
                    {showIdealDivider && (
                      <View style={styles.pickerDivider}>
                        <View style={[styles.pickerDividerLine, { backgroundColor: COLORS.success + '55' }]} />
                        <Text style={[styles.pickerDividerText, { color: COLORS.success }]}>✓ Compatibles con este acuario</Text>
                        <View style={[styles.pickerDividerLine, { backgroundColor: COLORS.success + '55' }]} />
                      </View>
                    )}
                    {showMarginalDivider && (
                      <View style={styles.pickerDivider}>
                        <View style={styles.pickerDividerLine} />
                        <Text style={styles.pickerDividerText}>⚠ Compatibilidad parcial</Text>
                        <View style={styles.pickerDividerLine} />
                      </View>
                    )}
                    {showIncompDivider && (
                      <View style={styles.pickerDivider}>
                        <View style={[styles.pickerDividerLine, { backgroundColor: COLORS.error + '55' }]} />
                        <Text style={[styles.pickerDividerText, { color: COLORS.error }]}>✗ Parámetros incompatibles</Text>
                        <View style={[styles.pickerDividerLine, { backgroundColor: COLORS.error + '55' }]} />
                      </View>
                    )}
                    <View style={[styles.pickerItem, fitCat === 'incompatible' && { opacity: 0.55 }]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                          <Text style={styles.pickerName}>{fish.common_name}</Text>
                          {/* Score badge */}
                          {selectedAquarium?.aquarium_style && (
                            <View style={[styles.fitBadge, { backgroundColor: scoreColor + '20', borderColor: scoreColor + '50' }]}>
                              <Text style={[styles.fitBadgeText, { color: scoreColor }]}>{fitScore}%</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.pickerSci}>{fish.scientific_name}</Text>
                        <View style={styles.pickerTags}>
                          <Text style={styles.pickerTag}>🌡 {fish.temp_min}–{fish.temp_max}°C</Text>
                          <Text style={styles.pickerTag}>pH {fish.ph_min}–{fish.ph_max}</Text>
                          <Text style={styles.pickerTag}>GH {fish.gh_min}–{fish.gh_max}</Text>
                          <Text style={styles.pickerTag}>{fish.adult_size_cm}cm</Text>
                          <Text style={styles.pickerTag}>≥{fish.min_tank_liters}L</Text>
                          {!waterOk && <Text style={[styles.pickerTag, { color: COLORS.error }]}>⚠ Agua diferente</Text>}
                          {!tankOk  && <Text style={[styles.pickerTag, { color: COLORS.warning }]}>⚡ Tanque pequeño</Text>}
                          {fish.is_schooling && (
                            <Text style={[styles.pickerTag, !schoolingOk && qty > 0 && { color: COLORS.warning }]}>
                              👥 mín {fish.schooling_min ?? 6}{alreadyIn ? ` (tienes ${alreadyIn.qty})` : ''}
                            </Text>
                          )}
                        </View>
                        {/* Conflictos detallados */}
                        {conflicts.map((c, i) => (
                          <Text key={i} style={styles.pickerConflict}>• {c}</Text>
                        ))}
                      </View>
                      <View style={styles.pickerQty}>
                        {alreadyIn && <Text style={styles.pickerAlready}>ya: {alreadyIn.qty}</Text>}
                        <View style={styles.pickerQtyRow}>
                          <TouchableOpacity
                            style={[styles.pickerQtyBtn, qty === 0 && { opacity: 0.35 }]}
                            onPress={() => setPendingQty(p => ({ ...p, [fish.id]: Math.max(0, (p[fish.id] ?? 0) - 1) }))}
                            disabled={qty === 0}
                          >
                            <Ionicons name="remove" size={14} color={COLORS.text} />
                          </TouchableOpacity>
                          <Text style={[styles.pickerQtyNum, qty > 0 && { color: COLORS.primary }]}>{qty}</Text>
                          <TouchableOpacity
                            style={[styles.pickerQtyBtn, styles.pickerQtyBtnAdd]}
                            onPress={() => setPendingQty(p => ({ ...p, [fish.id]: (p[fish.id] ?? 0) + 1 }))}
                          >
                            <Ionicons name="add" size={14} color={COLORS.primary} />
                          </TouchableOpacity>
                        </View>
                        {qty > 0 && (
                          <TouchableOpacity style={styles.pickerAddNow} onPress={() => confirmAddFish(fish.id, qty)}>
                            <Text style={styles.pickerAddNowText}>Añadir</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </React.Fragment>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Removal reason modal (#19) ─────────────────────────────────────── */}
      <Modal visible={!!removingFish} animationType="fade" transparent onRequestClose={() => setRemovingFish(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACING.lg }}>
          <View style={{
            backgroundColor: COLORS.backgroundCard, borderRadius: 18,
            padding: SPACING.lg, gap: SPACING.sm,
          }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.text, fontFamily: FONTS.sansEb }}>
              ¿Por qué quitas {removingFish?.name}?
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.sm, fontFamily: FONTS.sans }}>
              Esto se registra en tu historial.
            </Text>
            {(['death', 'sale', 'gift', 'rehome', 'other'] as RemovalReason[]).map(reason => (
              <TouchableOpacity
                key={reason}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  padding: SPACING.md, borderRadius: 12,
                  backgroundColor: COLORS.backgroundLight,
                  borderWidth: 1, borderColor: COLORS.border,
                }}
                onPress={() => confirmRemoval(reason)}
              >
                <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: FONTS.sansSb }}>
                  {REMOVAL_REASON_LABELS[reason]}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={{ padding: SPACING.md, alignItems: 'center', marginTop: 4 }}
              onPress={() => setRemovingFish(null)}
            >
              <Text style={{ color: COLORS.textMuted, fontFamily: FONTS.sansSb }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: SPACING.xl },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 24, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.xs, letterSpacing: -0.5 },
  emptySub:   { fontSize: 14, fontFamily: FONTS.sans, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full,
    paddingVertical: 13, paddingHorizontal: 24,
  },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontFamily: FONTS.sansEb, fontSize: 15 },

  // Tabs
  tabs: { paddingHorizontal: SPACING.screen, gap: SPACING.xs, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  tabText:       { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.sans },
  tabTextActive: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },
  tabAdd: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.backgroundCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.primary + '44', borderStyle: 'dashed',
  },

  // Tank hero wrapper
  heroWrap: { marginHorizontal: SPACING.screen, marginBottom: SPACING.md, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', ...SHADOWS.md },

  // Aquarium info card (below visual)
  aquaInfoCard: {
    marginHorizontal: SPACING.screen, marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  aquaInfoHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  aquaInfoName: {
    fontSize: 20, fontWeight: '800', fontFamily: FONTS.sansEb,
    color: COLORS.text, letterSpacing: -0.4, flex: 1,
  },
  aquaStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  aquaStat: { flex: 1, alignItems: 'center' },
  aquaStatValue: { fontSize: 20, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.primary },
  aquaStatLabel: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, marginTop: 2 },
  aquaStatDivider: { width: 1, height: 32, backgroundColor: COLORS.border },
  aquaTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aquaTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  aquaTagText: { fontSize: 12, fontFamily: FONTS.sansMd, color: COLORS.textSecondary, fontWeight: '500' },
  heroDeleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.error + '12',
    borderWidth: 1, borderColor: COLORS.error + '30',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  heroDeleteBtnText: { color: COLORS.error, fontSize: 12, fontWeight: '700', fontFamily: FONTS.sansBd },

  // Compat summary bar
  compatSummary: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.screen, marginBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  compatScoreWrap: { alignItems: 'center', minWidth: 44 },
  compatScoreNum: { fontSize: 22, fontWeight: '800', fontFamily: FONTS.sansBd },
  compatScoreLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.sans },
  compatScoreTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb, marginBottom: 4 },
  compatBar: { height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  compatBarFill: { height: '100%', borderRadius: 3 },

  // Per-pair param badges
  paramBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6, marginLeft: 20 },
  paramBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
    backgroundColor: COLORS.background,
  },
  paramBadgeText: { fontSize: 10, fontFamily: FONTS.sans },
  warnScore: { marginLeft: 'auto' as any, fontSize: 12, fontWeight: '700', fontFamily: FONTS.sansBd },

  // Compat warnings
  warnCard: {
    marginHorizontal: SPACING.screen, marginBottom: SPACING.xs,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: COLORS.warning,
    borderWidth: 1, borderColor: COLORS.border,
  },
  warnTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  warnTitle: { fontSize: 13, fontWeight: '700', fontFamily: FONTS.sansBd },
  warnReason: { color: COLORS.textSecondary, fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18, marginLeft: 20 },

  // Stock calculator
  stockToggle: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.screen, marginBottom: SPACING.xs,
    padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  stockToggleIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  stockToggleText: { flex: 1, color: COLORS.text, fontWeight: '700', fontFamily: FONTS.sansBd, fontSize: 14 },
  stockCard: {
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.screen, marginBottom: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  stockRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.sm },
  stockStat: { alignItems: 'center' },
  stockStatValue: { fontSize: 20, fontWeight: '800', fontFamily: FONTS.sansEb },
  stockStatLabel: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted, marginTop: 2 },
  bioloadTrack: { height: 6, backgroundColor: COLORS.abyss, borderRadius: 3, overflow: 'hidden', marginBottom: SPACING.xs },
  bioloadFill: { height: '100%', borderRadius: 3 },
  bioloadLabel: { fontSize: 12, fontWeight: '700', fontFamily: FONTS.sansBd, marginBottom: SPACING.xs },
  schoolingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  schoolingRowText: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.warning, flex: 1 },

  // Section header
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.screen, marginBottom: SPACING.sm, marginTop: SPACING.md,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text, flex: 1, letterSpacing: -0.3 },
  sectionBadge: {
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  sectionBadgeText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', fontFamily: FONTS.sansSb },

  // Fish cards
  fishCard: {
    marginHorizontal: SPACING.screen, marginBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  fishCardInner: { flexDirection: 'row', alignItems: 'stretch' },
  fishCardImage: { width: 82, alignSelf: 'stretch' },
  fishCardIconWrap: {
    width: 82, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  fishCardEmoji: { fontSize: 30 },
  fishCardBody: { flex: 1, paddingVertical: 12, paddingHorizontal: SPACING.sm },
  fishCardName: { fontSize: 15, fontWeight: '700', fontFamily: FONTS.sansBd, color: COLORS.text, marginBottom: 1 },
  fishCardSci:  { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 6 },
  fishCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  fishMetaPill: {
    backgroundColor: COLORS.backgroundLight, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  fishMetaText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500', fontFamily: FONTS.sansMd },
  schoolingWarn: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.warning, marginTop: 4 },
  fishTempWarn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 5,
    backgroundColor: COLORS.warning + '15',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 7, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  fishTempWarnText: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.warning, flexShrink: 1 },
  fishCardQty: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingRight: SPACING.sm,
  },
  qtyBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.backgroundLight },
  qtyBtnAdd: { backgroundColor: COLORS.primary + '18' },
  qtyNum: { fontSize: 13, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text, minWidth: 20, textAlign: 'center' },
  fishCardDelete: { marginLeft: 4, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.error + '12' },

  // Empty fish
  emptyFish: {
    alignItems: 'center', paddingVertical: SPACING.xl,
    marginHorizontal: SPACING.screen,
  },
  emptyFishEmoji: { fontSize: 40, marginBottom: SPACING.sm },
  emptyFishText:  { color: COLORS.textMuted, fontSize: 14, fontFamily: FONTS.sans, textAlign: 'center' },

  // Add fish button
  addFishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: SPACING.screen, marginTop: SPACING.sm,
    padding: SPACING.md, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5, borderColor: COLORS.primary + '55', borderStyle: 'dashed',
  },
  addFishBtnText: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd, fontSize: 14 },

  // ── Modals (bottom sheets) ────────────────────────────────────────────────
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.backgroundLight,
    borderTopLeftRadius: BORDER_RADIUS.xxl, borderTopRightRadius: BORDER_RADIUS.xxl,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl,
    flexDirection: 'column',
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center',
    marginTop: 12, marginBottom: 16,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  sheetTitle: { fontSize: 20, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text },
  sheetClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.border + '44',
    alignItems: 'center', justifyContent: 'center',
  },
  formLabel: {
    fontSize: 11, fontWeight: '700', fontFamily: FONTS.sansBd, color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: SPACING.xs, marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background, borderRadius: 14,
    padding: 14, color: COLORS.text, fontSize: 15, fontFamily: FONTS.sans,
    borderWidth: 1, borderColor: COLORS.border,
  },
  dimsRow: { flexDirection: 'row', gap: SPACING.sm },
  dimField: { flex: 1, alignItems: 'center' },
  dimLabel: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.sans, marginBottom: 4 },
  dimInput: {
    width: '100%', backgroundColor: COLORS.background,
    borderRadius: 12, padding: 10, color: COLORS.text,
    textAlign: 'center', fontSize: 17, fontWeight: '800', fontFamily: FONTS.sansEb,
    borderWidth: 1, borderColor: COLORS.border,
  },
  volumePreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary + '18', borderRadius: 12,
    padding: SPACING.sm, marginTop: SPACING.sm,
  },
  volumePreviewText: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd, fontSize: 14 },
  waterRow: { flexDirection: 'row', gap: SPACING.sm },
  waterBtn: {
    flex: 1, padding: 10, borderRadius: 14,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center',
  },
  waterBtnOn: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  waterBtnText:   { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.sans },
  waterBtnTextOn: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  styleBtn: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: COLORS.background, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.border, minWidth: 76,
  },
  styleBtnOn: { backgroundColor: COLORS.primary + '18', borderColor: COLORS.primary },
  styleBtnEmoji: { fontSize: 20, marginBottom: 2 },
  styleBtnLabel:   { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, textAlign: 'center' },
  styleBtnLabelOn: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },
  sheetBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 16, backgroundColor: COLORS.border + '44', alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontFamily: FONTS.sansSb, fontSize: 15 },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 15, borderRadius: 16, backgroundColor: COLORS.primary,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontFamily: FONTS.sansEb, fontSize: 15 },

  // Fish search modal
  fishSearchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.background, borderRadius: 14,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  fishSearchInput: { flex: 1, color: COLORS.text, fontSize: 15, fontFamily: FONTS.sans },
  pendingConfirm: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14,
    padding: 12, marginBottom: SPACING.sm,
  },
  pendingConfirmText: { color: '#fff', fontWeight: '800', fontFamily: FONTS.sansEb, fontSize: 14 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  pickerName: { fontSize: 14, fontWeight: '700', fontFamily: FONTS.sansBd, color: COLORS.text },
  pickerSci:  { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 4 },
  pickerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pickerTag:  { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  pickerTagWarn: { color: COLORS.warning, backgroundColor: COLORS.warning + '15' },
  pickerDivider: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: SPACING.sm,
  },
  pickerDividerLine: { flex: 1, height: 1, backgroundColor: COLORS.warning + '55' },
  pickerDividerText: { fontSize: 11, fontFamily: FONTS.sansMd, color: COLORS.warning, flexShrink: 1 },
  tempBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  tempBannerIcon: { fontSize: 20, marginTop: 1 },
  tempBannerText: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textSecondary, lineHeight: 17 },
  fitBadge: {
    borderRadius: BORDER_RADIUS.full, borderWidth: 1,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  fitBadgeText: { fontSize: 10, fontFamily: FONTS.sansBd },
  pickerConflict: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.error, marginTop: 2, lineHeight: 15 },
  pickerQty: { alignItems: 'center', gap: 4 },
  pickerAlready: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted, fontStyle: 'italic' },
  pickerQtyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 4, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pickerQtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.backgroundCard,
  },
  pickerQtyBtnAdd: { backgroundColor: COLORS.primary + '22' },
  pickerQtyNum: { fontSize: 15, fontWeight: '700', fontFamily: FONTS.sansBd, color: COLORS.text, minWidth: 22, textAlign: 'center' },
  pickerAddNow: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  pickerAddNowText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: FONTS.sansBd },

  // Setup recommendations
  setupRecsCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.primary + '25',
  },
  setupRecsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: SPACING.sm,
  },
  setupRecsTitle: { fontSize: 14, fontFamily: FONTS.sansBd, color: COLORS.text },
  setupRecRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingVertical: 5,
  },
  setupRecIcon: { fontSize: 16, marginTop: 1 },
  setupRecText: { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textSecondary, flex: 1, lineHeight: 18 },

  // Quick actions
  quickActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginHorizontal: SPACING.screen, marginBottom: SPACING.md,
  },
  quickAction: { alignItems: 'center', gap: 5 },
  quickActionIcon: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  quickActionLabel: { fontSize: 11, fontFamily: FONTS.sansSb, textAlign: 'center' },
});
