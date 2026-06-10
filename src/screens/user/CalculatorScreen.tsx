/**
 * CalculatorScreen (#17) — Aquarium dose calculators.
 *
 * Tabs:
 *  - 🧂 Sal: salt mass for marine/brackish targeted SG
 *  - 💧 Agua: how much water to change for a target nitrate reduction
 *  - 🌿 Fertilizante: macro/micro doses by EI / standard ratio
 *  - 🛡 Acondicionador: water dechlorinator (Seachem Prime ratio)
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useAquariums } from '../../hooks/useAquariums';
import { getEffectiveVolume } from '../../utils/stocking';

type Tab = 'salt' | 'water' | 'dechlor';

function num(v: string, fallback = 0): number {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

export default function CalculatorScreen({ navigation }: any) {
  const { s, fs } = useResponsive();
  const { selectedAquarium } = useAquariums();
  const defaultLiters = selectedAquarium
    ? Math.round(getEffectiveVolume(selectedAquarium.volume_liters, selectedAquarium.displacement))
    : 100;
  const isSaltwater = selectedAquarium?.water_type === 'saltwater' || selectedAquarium?.water_type === 'brackish';

  const TABS: { id: Tab; label: string; icon: string }[] = [
    ...(isSaltwater ? [{ id: 'salt' as Tab, label: 'Sal', icon: '🧂' }] : []),
    { id: 'water',   label: 'Agua',  icon: '💧' },
    { id: 'dechlor', label: 'Cloro', icon: '🛡' },
  ];

  const [tab, setTab] = useState<Tab>('water');

  // Common
  const [liters, setLiters] = useState(String(defaultLiters));
  const litersN = useMemo(() => num(liters, 0), [liters]);

  // Salt
  const [targetSG, setTargetSG] = useState('1.025');
  const [currentSG, setCurrentSG] = useState('1.000');
  const targetSalt = useMemo(() => {
    const target = num(targetSG, 1.025);
    const cur    = num(currentSG, 1.000);
    if (litersN <= 0) return 0;
    // ~37g/L at SG 1.025; linear approximation between current and target
    const gramsPerLiterAtTarget  = (target - 1) * 1500;  // approx
    const gramsPerLiterAtCurrent = (cur - 1)    * 1500;
    return Math.max(0, (gramsPerLiterAtTarget - gramsPerLiterAtCurrent) * litersN);
  }, [targetSG, currentSG, litersN]);

  // Water change
  const [currentNO3, setCurrentNO3] = useState('40');
  const [targetNO3, setTargetNO3]   = useState('20');
  const waterPercent = useMemo(() => {
    const cur    = num(currentNO3, 0);
    const target = num(targetNO3,  0);
    if (cur <= 0 || target >= cur) return 0;
    // Standard: % = (1 - target/current) × 100
    return Math.min(100, (1 - target / cur) * 100);
  }, [currentNO3, targetNO3]);
  const waterLiters = useMemo(() => Math.round(litersN * waterPercent / 100), [litersN, waterPercent]);

  // Dechlorinator (Seachem Prime, dosage 1ml per 40L)
  const primeML = useMemo(() => Math.round(litersN / 40 * 10) / 10, [litersN]);
  const allInOneML = useMemo(() => Math.round(litersN / 50 * 10) / 10, [litersN]);

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={S.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* Top bar */}
      <View style={S.topBar}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={S.title}>Calculadora</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={S.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id}
            style={[S.tab, tab === t.id && S.tabOn]}
            onPress={() => setTab(t.id)}>
            <Text style={[S.tabText, tab === t.id && S.tabTextOn]}>
              {t.icon} {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 80 }}>
        {/* Common: aquarium volume */}
        <View style={S.card}>
          <Text style={S.label}>📦 Volumen del acuario (L)</Text>
          <TextInput
            style={S.input}
            value={liters}
            onChangeText={setLiters}
            placeholder="100"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
          />
          {selectedAquarium && (
            <Text style={S.hint}>De "{selectedAquarium.name}". Cambia si calculas otro tanque.</Text>
          )}
        </View>

        {/* Salt */}
        {tab === 'salt' && (
          <>
            <View style={S.card}>
              <Text style={S.label}>🌊 Densidad actual (SG)</Text>
              <TextInput style={S.input} value={currentSG} onChangeText={setCurrentSG}
                keyboardType="decimal-pad" placeholderTextColor={COLORS.textMuted} placeholder="1.000" />
            </View>
            <View style={S.card}>
              <Text style={S.label}>🎯 Densidad objetivo (SG)</Text>
              <TextInput style={S.input} value={targetSG} onChangeText={setTargetSG}
                keyboardType="decimal-pad" placeholderTextColor={COLORS.textMuted} placeholder="1.025" />
              <View style={S.chipsRow}>
                {['1.005', '1.015', '1.020', '1.025'].map(v => (
                  <TouchableOpacity key={v} style={[S.chip, targetSG === v && S.chipOn]} onPress={() => setTargetSG(v)}>
                    <Text style={[S.chipText, targetSG === v && S.chipTextOn]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <ResultCard
              title="Sal a añadir"
              value={`${(targetSalt / 1000).toFixed(2)} kg`}
              sub={`= ${Math.round(targetSalt)} g`}
              tip="Sal marina sintética (Instant Ocean / Red Sea)."
            />
          </>
        )}

        {/* Water change */}
        {tab === 'water' && (
          <>
            <View style={S.card}>
              <Text style={S.label}>📊 NO3 actual (ppm)</Text>
              <TextInput style={S.input} value={currentNO3} onChangeText={setCurrentNO3}
                keyboardType="decimal-pad" placeholderTextColor={COLORS.textMuted} placeholder="40" />
            </View>
            <View style={S.card}>
              <Text style={S.label}>🎯 NO3 objetivo (ppm)</Text>
              <TextInput style={S.input} value={targetNO3} onChangeText={setTargetNO3}
                keyboardType="decimal-pad" placeholderTextColor={COLORS.textMuted} placeholder="20" />
              <View style={S.chipsRow}>
                {['5', '10', '20'].map(v => (
                  <TouchableOpacity key={v} style={[S.chip, targetNO3 === v && S.chipOn]} onPress={() => setTargetNO3(v)}>
                    <Text style={[S.chipText, targetNO3 === v && S.chipTextOn]}>≤ {v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <ResultCard
              title="Cambio recomendado"
              value={`${Math.round(waterPercent)}%`}
              sub={`= ${waterLiters} litros`}
              tip="No excedas 50% en un solo cambio para evitar shock osmótico."
            />
          </>
        )}

        {/* Dechlorinator */}
        {tab === 'dechlor' && (
          <>
            <ResultCard
              title="Seachem Prime"
              value={`${primeML} ml`}
              sub="(1 ml por 40L tratados)"
              tip="Para todo el cambio de agua. No exceder 5x la dosis."
            />
            <ResultCard
              title="API Tap Water Conditioner"
              value={`${(litersN / 35).toFixed(1)} ml`}
              sub="(1 ml por 35L)"
            />
            <ResultCard
              title="Tetra AquaSafe"
              value={`${(litersN / 20).toFixed(1)} ml`}
              sub="(1 ml por 20L)"
            />
            <ResultCard
              title="Acondicionador genérico"
              value={`${allInOneML} ml`}
              sub="(1 ml por 50L)"
              tip="Verifica las instrucciones de tu marca específica."
            />
          </>
        )}

        <Text style={S.disclaimer}>
          ⚠️ Estos cálculos son aproximaciones basadas en valores estándar.
          Siempre verifica las instrucciones de tu producto específico.
        </Text>
      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Result card ──────────────────────────────────────────────────────────────
function ResultCard({ title, value, sub, tip }: { title: string; value: string; sub?: string; tip?: string }) {
  const { fs: fsc } = useResponsive();
  return (
    <View style={S.resultCard}>
      <Text style={[S.resultTitle, { fontSize: fsc(12) }]}>{title}</Text>
      <Text style={[S.resultValue, { fontSize: fsc(28) }]}>{value}</Text>
      {sub && <Text style={S.resultSub}>{sub}</Text>}
      {tip && (
        <View style={S.tipBox}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
          <Text style={S.tipText}>{tip}</Text>
        </View>
      )}
    </View>
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
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 4, borderRadius: BORDER_RADIUS.lg,
  },
  tabOn:    { backgroundColor: COLORS.primary + '14' },
  tabText:  { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.sans, textAlign: 'center' },
  tabTextOn:{ color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },

  card: {
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.sm, gap: 6,
  },
  label: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.sansSb },
  hint:  { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 4, fontFamily: FONTS.sans },
  input: {
    backgroundColor: COLORS.backgroundLight, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    color: COLORS.text, fontSize: 16, fontFamily: FONTS.sansSb,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.sans },
  chipTextOn: { color: '#fff', fontWeight: '700', fontFamily: FONTS.sansBd },

  resultCard: {
    backgroundColor: COLORS.primary + '14', borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.primary + '33',
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  resultTitle: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4, fontFamily: FONTS.sans, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultValue: { fontSize: 28, fontWeight: '800', color: COLORS.primary, fontFamily: FONTS.sansEb },
  resultSub:   { fontSize: 13, color: COLORS.text, marginTop: 2, fontFamily: FONTS.sansSb },
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: SPACING.sm, paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.primary + '22',
  },
  tipText: { flex: 1, fontSize: 11, color: COLORS.textMuted, lineHeight: 16, fontFamily: FONTS.sans },

  disclaimer: {
    fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic',
    textAlign: 'center', padding: SPACING.md, lineHeight: 16, fontFamily: FONTS.sans,
  },
});
