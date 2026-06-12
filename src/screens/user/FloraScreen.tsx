import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Image, FlatList, Switch, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useAquariums } from '../../hooks/useAquariums';
import { getEffectiveVolume } from '../../utils/stocking';
import {
  PLANT_DATABASE, AquaticPlant,
  DIFFICULTY_LABELS, DIFFICULTY_COLORS,
  LIGHT_LABELS, PLACEMENT_LABELS, PLACEMENT_ICONS,
  PlantDifficulty, PlantPlacement,
} from '../../data/plantDatabase';
import { useFertReminders } from '../../hooks/useFertReminders';

// ── Tech level ────────────────────────────────────────────────────────────────
type TechLevel = 'low' | 'medium' | 'high';

interface TechConfig {
  label: string;
  desc: string;
  icon: string;
  color: string;
  lux_min: number;
  lux_max: number;
  lux_per_liter: string;
  hours: string;
  lamp_type: string;
  lamp_brands: string;
  co2_mode: 'none' | 'diy' | 'liquid' | 'pressurized';
  co2_note: string;
  macro_ml_per_100l: number;
  micro_ml_per_100l: number;
  freq_per_week: number;
  root_tabs_note: string;
}

const TECH_CONFIG: Record<TechLevel, TechConfig> = {
  low: {
    label: 'Baja tecnología',
    desc: 'Plantas resistentes, sin CO2, luz básica',
    icon: 'leaf-outline',
    color: '#388e3c',
    lux_min: 10,
    lux_max: 20,
    lux_per_liter: '10–20 lm/L',
    hours: '8–10 h/día',
    lamp_type: 'LED blanco cálido/neutro',
    lamp_brands: 'Aquael Leddy, Sera LED, NICREW BasicLED, tiras LED genéricas 6000–6500K',
    co2_mode: 'none',
    co2_note: 'No necesario. Las plantas seleccionadas prosperan con el CO2 disuelto naturalmente en el agua.',
    macro_ml_per_100l: 1,
    micro_ml_per_100l: 1,
    freq_per_week: 2,
    root_tabs_note: 'Opcional. 1 tableta por cada 15–20 cm de sustrato, renovar cada 3 meses.',
  },
  medium: {
    label: 'Tecnología media',
    desc: 'Más plantas, CO2 líquido o DIY, buena luz',
    icon: 'partly-sunny-outline',
    color: '#f57c00',
    lux_min: 25,
    lux_max: 40,
    lux_per_liter: '25–40 lm/L',
    hours: '8 h/día',
    lamp_type: 'LED plantado full-spectrum',
    lamp_brands: 'Aquael Leddy Plant, Chihiros A-series, Fluval Plant Nano, Sera plantcolor',
    co2_mode: 'liquid',
    co2_note: 'CO2 líquido (Seachem Excel, Easy-Carbo) o sistema DIY de levadura. Dosificar diario con cambio de agua.',
    macro_ml_per_100l: 2,
    micro_ml_per_100l: 2,
    freq_per_week: 3,
    root_tabs_note: '1 tableta por cada 10–15 cm de sustrato, renovar cada 2–3 meses.',
  },
  high: {
    label: 'Alta tecnología',
    desc: 'Aquascape exigente, CO2 inyectado, luz alta',
    icon: 'flash-outline',
    color: '#1565c0',
    lux_min: 40,
    lux_max: 80,
    lux_per_liter: '40–80 lm/L',
    hours: '6–8 h/día (siesta al mediodía para evitar algas)',
    lamp_type: 'LED de alto rendimiento plantado',
    lamp_brands: 'Chihiros C/RGB, Twinstar E/S, ADA Solar RGB, Fluval Plant 3.0, ONF Flat One',
    co2_mode: 'pressurized',
    co2_note: 'CO2 inyectado con difusor a 20–30 ppm. Comprobar con indicador (drop checker verde). Apagar 1h antes de que se apague la luz.',
    macro_ml_per_100l: 4,
    micro_ml_per_100l: 3,
    freq_per_week: 5,
    root_tabs_note: '1 tableta por cada 10 cm de sustrato, renovar cada 1–2 meses.',
  },
};

// ── NPK Science ───────────────────────────────────────────────────────────────

/** Target parameters in mg/L (ppm) */
const NPK_TARGETS = {
  no3_ppm:  10,    // Nitrato / Nitrógeno
  po4_ppm:  1,     // Fosfato / Fósforo
  k_min:    10,    // Potasio mínimo
  k_max:    15,    // Potasio máximo
  fe_min:   0.1,   // Hierro mínimo
  fe_max:   0.5,   // Hierro máximo
};

/**
 * Plant uptake in ppm/week per nutrient for each tech level.
 * Low = slow growers, High = EI/heavy planters.
 */
const PLANT_UPTAKE: Record<TechLevel, { no3: number; po4: number; k: number }> = {
  low:    { no3: 1.5, po4: 0.15, k: 2.0  },
  medium: { no3: 3.5, po4: 0.35, k: 5.0  },
  high:   { no3: 7.0, po4: 0.70, k: 10.0 },
};

/**
 * Reference concentrations for popular liquid fertilizers.
 * ppm added per 1 ml per 100 L of tank water.
 * Based on Seachem NPK line as industry reference.
 */
const ML_TO_PPM: Record<string, number> = {
  no3: 1.5,   // Seachem Nitrogen:    ~1.5 ppm NO3 per ml/100L
  po4: 0.6,   // Seachem Phosphorus:  ~0.6 ppm PO4 per ml/100L
  k:   10.0,  // Seachem Potassium:   ~10 ppm K   per ml/100L
  fe:  0.1,   // Seachem Fe Iron:     ~0.1 ppm Fe per ml/100L
  mic: 1.0,   // Micro/Trace (generic): 1 dosis = 1 ml/100L
};

// ── Corrective-dose products ──────────────────────────────────────────────────
// Formula (same as "Rutina abonado Fertiliza" Excel):
//   ml = (target_ppm − current_ppm) / ppmPerMlPer100L × (vol / 100)
// Each entry lists reference brands and their concentration.
export interface CorrProduct {
  id:    string;
  label: string;         // nutrient display name
  unit:  string;         // ppm | mg/L
  color: string;
  icon:  string;
  idealMin: number;
  idealMax: number;
  brands: { name: string; ppmPerMlPer100L: number }[];
}

export const CORR_PRODUCTS: CorrProduct[] = [
  {
    id: 'no3', label: 'Nitrógeno (NO₃)', unit: 'ppm', color: '#43a047', icon: 'leaf-outline',
    idealMin: 5, idealMax: 15,
    brands: [
      { name: 'Seachem Nitrogen',      ppmPerMlPer100L: 1.5  },
      { name: 'Easy-Life Nitro',       ppmPerMlPer100L: 1.0  },
      { name: 'TNC Macro N',           ppmPerMlPer100L: 1.2  },
      { name: 'Fertiliza NO3',         ppmPerMlPer100L: 0.5  },
    ],
  },
  {
    id: 'po4', label: 'Fosfato (PO₄)', unit: 'ppm', color: '#fb8c00', icon: 'water-outline',
    idealMin: 0.5, idealMax: 2,
    brands: [
      { name: 'Seachem Phosphorus',    ppmPerMlPer100L: 0.6   },
      { name: 'Easy-Life Fosfo',       ppmPerMlPer100L: 0.5   },
      { name: 'Fertiliza PO4 (conc.)', ppmPerMlPer100L: 0.125 },
      { name: 'Fertiliza PO4 (diluido)', ppmPerMlPer100L: 0.05 },
    ],
  },
  {
    id: 'k', label: 'Potasio (K)', unit: 'ppm', color: '#7b1fa2', icon: 'flash-outline',
    idealMin: 10, idealMax: 20,
    brands: [
      { name: 'Seachem Potassium',     ppmPerMlPer100L: 10.0 },
      { name: 'Easy-Life Kalium',      ppmPerMlPer100L: 5.0  },
      { name: 'TNC Macro K',           ppmPerMlPer100L: 4.0  },
      { name: 'Fertiliza K',           ppmPerMlPer100L: 0.5  },
    ],
  },
  {
    id: 'fe', label: 'Hierro quelado (Fe)', unit: 'ppm', color: '#c62828', icon: 'flask-outline',
    idealMin: 0.05, idealMax: 0.3,
    brands: [
      { name: 'Seachem Iron',          ppmPerMlPer100L: 0.1   },
      { name: 'Tropica Fe',            ppmPerMlPer100L: 0.07  },
      { name: 'Fertiliza Fe (conc.)',  ppmPerMlPer100L: 0.025 },
      { name: 'Fertiliza Fe (diluido)',ppmPerMlPer100L: 0.01  },
    ],
  },
];

// ── CO2 product cards ─────────────────────────────────────────────────────────
interface Co2Card {
  title: string;
  desc: string;
  icon: string;
  color: string;
  pros: string[];
  cons: string[];
}

const CO2_CARDS: Record<string, Co2Card> = {
  none: {
    title: 'Sin CO2 adicional',
    desc: 'El CO2 del ambiente se disuelve naturalmente en el agua.',
    icon: 'checkmark-circle-outline',
    color: '#388e3c',
    pros: ['Sin costo adicional', 'Sin mantenimiento', 'Apto para principiantes'],
    cons: ['Solo plantas de baja demanda', 'Crecimiento más lento'],
  },
  liquid: {
    title: 'CO2 líquido / DIY',
    desc: 'Suplemento de carbono líquido (Excel, Easy-Carbo) o reactor de levadura casero.',
    icon: 'beaker-outline',
    color: '#f57c00',
    pros: ['Económico', 'Sin equipamiento complejo', 'Mejora crecimiento notablemente'],
    cons: ['Menos efectivo que CO2 presurizado', 'Dosificación diaria manual', 'Excel puede dañar Vallisneria'],
  },
  pressurized: {
    title: 'CO2 inyectado (presurizado)',
    desc: 'Sistema con botella de CO2, regulador, difusor y solenoid con temporizador.',
    icon: 'speedometer-outline',
    color: '#1565c0',
    pros: ['Control preciso de ppm', 'Crecimiento máximo', 'Apto para cualquier planta'],
    cons: ['Mayor inversión inicial', 'Requiere mantenimiento del equipo', 'Riesgo de sobredosis si falla el solenoid'],
  },
};

/** Weekly Fe uptake in ppm per tech level (chelated iron). */
const FE_UPTAKE: Record<TechLevel, number> = { low: 0.05, medium: 0.15, high: 0.30 };

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (n: number) =>
  n < 0.1 ? n.toFixed(2) : n < 1 ? n.toFixed(1) : n < 10 ? n.toFixed(1) : Math.round(n).toString();

// ── Reef / marine dosing targets (Ca/Mg/KH) ──────────────────────────────────
interface ReefDose { label: string; target: string; unit: string; mlPer100L: number; brands: string; color: string; icon: string }
const REEF_DOSES: ReefDose[] = [
  { label: 'Calcio (Ca)',      target: '380–450',  unit: 'ppm',  mlPer100L: 2,   brands: 'Seachem Reef Advantage Calcium, Red Sea Calcium, Brightwell CoralAmino', color: '#0288d1', icon: 'water-outline'       },
  { label: 'Magnesio (Mg)',    target: '1250–1350', unit: 'ppm', mlPer100L: 1,   brands: 'Seachem Reef Advantage Magnesium, Red Sea Magnesium, Tropic Marin Mg',   color: '#00838f', icon: 'beaker-outline'      },
  { label: 'Alcalinidad (KH)', target: '8–12',     unit: 'dKH', mlPer100L: 1.5, brands: 'Seachem Reef Builder, Red Sea KH/Alkalinity, Brightwell Alkalin8.3',    color: '#6a1b9a', icon: 'flask-outline'       },
  { label: 'Fosfato (PO₄)',    target: '< 0.03',   unit: 'ppm', mlPer100L: 0,   brands: 'Adsorbente GFO, Rowaphos, Seachem PhosGuard — retirar, no añadir',      color: '#c62828', icon: 'trash-outline'       },
];

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function FloraScreen({ embedded }: { embedded?: boolean } = {}) {
  const { aquariums, selectedAquarium } = useAquariums();
  const { reminders, toggleReminder, setTime, pushAvailable } = useFertReminders();

  const [activeTab, setActiveTab]   = useState<'calc' | 'corr' | 'plants'>('calc');
  const [techLevel, setTechLevel]   = useState<TechLevel>('medium');
  const [aquariumId, setAquariumId] = useState<string>(selectedAquarium?.id ?? aquariums[0]?.id ?? '');

  // Corrective-dose calculator state
  const [corrValues, setCorrValues] = useState<Record<string, { current: string; target: string; brandIdx: number }>>(() =>
    Object.fromEntries(CORR_PRODUCTS.map(p => [p.id, { current: '', target: '', brandIdx: 0 }]))
  );

  // Plant catalog filters
  const [search,    setSearch]    = useState('');
  const [diffFilter, setDiffFilter] = useState<PlantDifficulty | 'all'>('all');
  const [placeFilter, setPlaceFilter] = useState<PlantPlacement | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const aquarium = aquariums.find(a => a.id === aquariumId) ?? aquariums[0];
  const vol = aquarium ? getEffectiveVolume(aquarium.volume_liters, aquarium.displacement) : 100;
  const tech = TECH_CONFIG[techLevel];

  // ── Marine / saltwater guard ───────────────────────────────────────────────
  const isSaltwater = aquarium?.water_type === 'saltwater';

  // ── Filtered plants ────────────────────────────────────────────────────────
  const filteredPlants = useMemo(() => {
    return PLANT_DATABASE.filter(p => {
      const matchDiff  = diffFilter  === 'all' || p.difficulty  === diffFilter;
      const matchPlace = placeFilter === 'all' || p.placement   === placeFilter;
      const q = search.toLowerCase();
      const matchSearch = !q
        || p.common_name.toLowerCase().includes(q)
        || p.scientific_name.toLowerCase().includes(q)
        || p.tags.some(t => t.includes(q));
      return matchDiff && matchPlace && matchSearch;
    });
  }, [search, diffFilter, placeFilter]);

  // ── NPK dose calculation (freshwater planted only) ────────────────────────
  // Formula: weeklyPpm = 25% water-change replenishment + plant uptake
  // mlPerDose = (weeklyPpm / freq_per_week × vol/100) / (ppm per ml per 100L)
  function calcNpkDose(targetPpm: number, uptakePpm: number, mlToPpm: number) {
    const weeklyPpm  = 0.25 * targetPpm + uptakePpm;
    const perDosePpm = weeklyPpm / tech.freq_per_week;
    const mlPerDose  = (perDosePpm * vol / 100) / mlToPpm;
    const mlPerWeek  = mlPerDose * tech.freq_per_week;
    return { weeklyPpm, perDosePpm, mlPerDose, mlPerWeek };
  }

  const uptake  = PLANT_UPTAKE[techLevel];
  const no3Dose = calcNpkDose(NPK_TARGETS.no3_ppm, uptake.no3,            ML_TO_PPM.no3);
  const po4Dose = calcNpkDose(NPK_TARGETS.po4_ppm, uptake.po4,            ML_TO_PPM.po4);
  const kDose   = calcNpkDose(NPK_TARGETS.k_min,   uptake.k,              ML_TO_PPM.k);
  const feDose  = calcNpkDose(NPK_TARGETS.fe_min,  FE_UPTAKE[techLevel],  ML_TO_PPM.fe);
  const microMl  = vol / 100;  // 1 ml per 100L per dose

  // ── Volume cross-check ────────────────────────────────────────────────────
  // Geometric volume from dimensions (before substracting substrate/decor)
  const hasDimensions = !!(aquarium?.length_cm && aquarium?.width_cm && aquarium?.height_cm);
  const geoVolL = hasDimensions
    ? Math.round((aquarium!.length_cm! * aquarium!.width_cm! * aquarium!.height_cm!) / 1000)
    : null;
  // Effective water volume ≈ 85% of geometric (substrate + glass + decor)
  const effVolL = geoVolL ? Math.round(geoVolL * 0.85) : null;
  // Warn if stored volume differs >15% from calculated effective volume
  const volMismatch = effVolL !== null && Math.abs(effVolL - vol) / Math.max(effVolL, vol) > 0.15;

  // ── Lighting: surface area (L×W cm²) → lm/m² is more accurate than lm/L ──
  // Surface area in m² for W/m² calcs
  const surfaceCm2   = hasDimensions ? aquarium!.length_cm! * aquarium!.width_cm! : null;
  const surfaceM2    = surfaceCm2 ? surfaceCm2 / 10000 : null;

  // lm/L approximation (always available, used as primary metric)
  const lumenMin = Math.round(tech.lux_min * vol);
  const lumenMax = Math.round(tech.lux_max * vol);

  // If surface area known, also compute recommended W/m² for LEDs
  // LED planted: low ~20W/m², medium ~35W/m², high ~60W/m²
  const LED_W_PER_M2: Record<TechLevel, { min: number; max: number }> = {
    low:    { min: 15, max: 25 },
    medium: { min: 30, max: 45 },
    high:   { min: 50, max: 80 },
  };
  const wPerM2Range = LED_W_PER_M2[techLevel];
  const wattMin = surfaceM2 ? Math.round(wPerM2Range.min * surfaceM2) : null;
  const wattMax = surfaceM2 ? Math.round(wPerM2Range.max * surfaceM2) : null;

  return (
    <View style={styles.container}>

      {/* ── Header (hidden when embedded in ExploreScreen) ─────────────── */}
      {!embedded && (
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="leaf" size={22} color={COLORS.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Flora y abonado</Text>
            <Text style={styles.headerSub}>Fertilización · Luz · CO2 · Catálogo</Text>
          </View>
        </View>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <View style={[styles.tabs, embedded && { marginTop: SPACING.sm }]}>
        {([
          { key: 'calc',   label: 'Rutina',     icon: 'calculator-outline' },
          { key: 'corr',   label: 'Por testeo', icon: 'beaker-outline'     },
          { key: 'plants', label: 'Plantas',    icon: 'leaf-outline'       },
        ] as const).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons name={t.icon} size={16} color={activeTab === t.key ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: FERTILIZACIÓN
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'calc' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Aquarium selector ────────────────────────────────────────── */}
          {aquariums.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Acuario</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: SPACING.sm }}>
                {aquariums.map(aq => (
                  <TouchableOpacity
                    key={aq.id}
                    style={[styles.aqChip, aquariumId === aq.id && styles.aqChipActive]}
                    onPress={() => setAquariumId(aq.id)}
                  >
                    <Ionicons name="cube-outline" size={13} color={aquariumId === aq.id ? COLORS.primary : COLORS.textMuted} />
                    <Text style={[styles.aqChipText, aquariumId === aq.id && styles.aqChipTextActive]}>
                      {aq.name} · {aq.volume_liters}L
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {aquariums.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Sin acuarios</Text>
              <Text style={styles.emptyBody}>Crea un acuario en la pestaña Acuario para ver las recomendaciones personalizadas.</Text>
            </View>
          )}

          {/* ── Tech level picker ───────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Nivel de tecnología</Text>
            {(['low', 'medium', 'high'] as TechLevel[]).map(lv => {
              const cfg = TECH_CONFIG[lv];
              const active = techLevel === lv;
              return (
                <TouchableOpacity
                  key={lv}
                  style={[styles.techCard, active && { borderColor: cfg.color + '55', backgroundColor: cfg.color + '14' }]}
                  onPress={() => setTechLevel(lv)}
                >
                  <View style={[styles.techIcon, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '33', borderWidth: 1 }]}>
                    <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.techLabel, active && { color: cfg.color }]}>{cfg.label}</Text>
                    <Text style={styles.techDesc}>{cfg.desc}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color={cfg.color} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Resumen del acuario ─────────────────────────────────────── */}
          {aquarium && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Resumen del acuario</Text>
              <View style={styles.summaryCard}>

                {/* Fila 1: volumen efectivo · dimensiones o lúmenes · dosis */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="cube-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.summaryValue}>{vol} L</Text>
                    <Text style={styles.summaryKey}>Vol. efectivo</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  {hasDimensions ? (
                    <View style={styles.summaryItem}>
                      <Ionicons name="resize-outline" size={18} color="#7b1fa2" />
                      <Text style={styles.summaryValue} numberOfLines={1}>
                        {aquarium.length_cm}×{aquarium.width_cm}×{aquarium.height_cm}
                      </Text>
                      <Text style={styles.summaryKey}>L×A×H (cm)</Text>
                    </View>
                  ) : (
                    <View style={styles.summaryItem}>
                      <Ionicons name="sunny-outline" size={18} color="#f57c00" />
                      <Text style={styles.summaryValue}>{lumenMin.toLocaleString()}–{lumenMax.toLocaleString()}</Text>
                      <Text style={styles.summaryKey}>Lúmenes totales</Text>
                    </View>
                  )}
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Ionicons name={isSaltwater ? 'water' : 'time-outline'} size={18}
                      color={isSaltwater ? '#0288d1' : COLORS.success} />
                    <Text style={[styles.summaryValue, isSaltwater && { color: '#0288d1', fontSize: 11 }]}>
                      {isSaltwater ? 'Marino' : `${tech.freq_per_week}×`}
                    </Text>
                    <Text style={styles.summaryKey}>{isSaltwater ? 'Tipo de agua' : 'Dosis/semana'}</Text>
                  </View>
                </View>

                {/* Fila 2: valores derivados de las dimensiones */}
                {hasDimensions && (
                  <View style={[styles.summaryRow, {
                    marginTop: SPACING.sm, paddingTop: SPACING.sm,
                    borderTopWidth: 1, borderTopColor: COLORS.border,
                  }]}>
                    <View style={styles.summaryItem}>
                      <Ionicons name="calculator-outline" size={16} color="#43a047" />
                      <Text style={styles.summaryValue}>{geoVolL} L</Text>
                      <Text style={styles.summaryKey}>Vol. geométrico</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Ionicons name="expand-outline" size={16} color="#6a1b9a" />
                      <Text style={styles.summaryValue}>{surfaceCm2} cm²</Text>
                      <Text style={styles.summaryKey}>Superficie</Text>
                    </View>
                    {!isSaltwater && wattMin !== null && <>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryItem}>
                        <Ionicons name="flash-outline" size={16} color="#f57c00" />
                        <Text style={styles.summaryValue}>{wattMin}–{wattMax} W</Text>
                        <Text style={styles.summaryKey}>Potencia LED</Text>
                      </View>
                    </>}
                    {!isSaltwater && wattMin === null && <>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryItem}>
                        <Ionicons name="sunny-outline" size={16} color="#f57c00" />
                        <Text style={styles.summaryValue}>{lumenMin.toLocaleString()}–{lumenMax.toLocaleString()}</Text>
                        <Text style={styles.summaryKey}>Lúmenes totales</Text>
                      </View>
                    </>}
                  </View>
                )}

                {/* Alerta si el volumen registrado difiere mucho del geométrico */}
                {volMismatch && (
                  <View style={styles.volWarning}>
                    <Ionicons name="warning-outline" size={14} color="#e65100" />
                    <Text style={styles.volWarningText}>
                      El volumen registrado ({vol} L) difiere del calculado por dimensiones (~{effVolL} L).
                      Las dosis usan el volumen registrado. Revisa el dato del acuario si hay discrepancia.
                    </Text>
                  </View>
                )}
              </View>

              {/* Pie explicativo: base del cálculo */}
              <View style={styles.calcBasisBox}>
                <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.calcBasisText}>
                  {'Dosis calculadas sobre '}
                  <Text style={styles.calcBasisBold}>{vol} L</Text>
                  {hasDimensions
                    ? ` (volumen efectivo ≈ 85% de los ${geoVolL} L geométricos).`
                    : ' (volumen registrado en el acuario).'}
                  {!isSaltwater && wattMin !== null
                    ? ` Iluminación calculada sobre superficie ${surfaceCm2} cm².`
                    : ''}
                </Text>
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SECCIÓN MARINA — solo si el acuario es saltwater
          ══════════════════════════════════════════════════════════════ */}
          {isSaltwater && (
            <View style={styles.section}>
              {/* Banner informativo */}
              <View style={[styles.infoCard, { borderColor: '#0288d155', backgroundColor: '#e1f5fe' }]}>
                <View style={styles.infoCardHeader}>
                  <View style={[styles.infoCardIcon, { backgroundColor: '#0288d118' }]}>
                    <Ionicons name="water" size={20} color="#0277bd" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoCardTitle, { color: '#0277bd' }]}>Acuario marino / arrecife</Text>
                    <Text style={styles.infoCardSub}>
                      Los fertilizantes NPK no aplican. Se dosifica Ca, Mg y KH para corales y organismos calcificantes.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Reef dosing cards */}
              <Text style={[styles.subSectionLabel, { marginTop: SPACING.md }]}>
                Dosificación marina · {vol} L
              </Text>
              {REEF_DOSES.map(rd => {
                const mlDose  = rd.mlPer100L > 0 ? fmt(rd.mlPer100L * vol / 100) : '—';
                const mlWeek  = rd.mlPer100L > 0 ? fmt(rd.mlPer100L * vol / 100 * 3) : '—';
                return (
                  <View key={rd.label} style={styles.fertCard}>
                    <View style={[styles.fertIcon, { backgroundColor: rd.color + '18', borderColor: rd.color + '33', borderWidth: 1 }]}>
                      <Ionicons name={rd.icon as any} size={18} color={rd.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.fertNameRow}>
                        <Text style={styles.fertName}>{rd.label}</Text>
                        <View style={[styles.npkPill, { borderColor: rd.color + '44', backgroundColor: rd.color + '10', paddingVertical: 2 }]}>
                          <Text style={[styles.npkPillKey, { color: rd.color }]}>{rd.target} {rd.unit}</Text>
                        </View>
                      </View>
                      <Text style={styles.fertFunc}>{rd.brands}</Text>
                    </View>
                    {rd.mlPer100L > 0 ? (
                      <View style={styles.fertDose}>
                        <Text style={[styles.fertDoseValue, { color: rd.color }]}>{mlDose}</Text>
                        <Text style={styles.fertDoseLabel}>ml/dosis</Text>
                        <Text style={styles.fertDoseWeekly}>{mlWeek} ml/sem</Text>
                      </View>
                    ) : (
                      <View style={styles.fertDose}>
                        <Ionicons name="ban-outline" size={22} color={rd.color} />
                        <Text style={[styles.fertDoseLabel, { color: rd.color, textAlign: 'center' }]}>No añadir</Text>
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={styles.fertTip}>
                <Ionicons name="information-circle-outline" size={16} color="#0288d1" />
                <Text style={[styles.fertTipText, { color: '#0277bd' }]}>
                  Estas son dosis de mantenimiento orientativas basadas en 1 ml/100 L. Ajustar según
                  los resultados del test. Dosificar preferiblemente por la noche con las luces apagadas.
                </Text>
              </View>
            </View>
          )}

          {/* ── Iluminación ─────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Iluminación recomendada</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={[styles.infoCardIcon, { backgroundColor: '#fff9c4' }]}>
                  <Ionicons name="sunny" size={20} color="#f9a825" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoCardTitle}>{tech.lamp_type}</Text>
                  <Text style={styles.infoCardSub}>{tech.hours}</Text>
                </View>
              </View>
              <View style={styles.infoCardDivider} />
              <View style={styles.metricRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Densidad</Text>
                  <Text style={styles.metricValue}>{tech.lux_per_liter}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Lúmenes totales</Text>
                  <Text style={styles.metricValue}>{lumenMin.toLocaleString()}–{lumenMax.toLocaleString()} lm</Text>
                </View>
              </View>
              {/* Si hay dimensiones, mostrar W/m² desde superficie real */}
              {wattMin !== null && surfaceM2 !== null && (
                <View style={[styles.metricRow, { marginTop: SPACING.xs }]}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Superficie del acuario</Text>
                    <Text style={styles.metricValue}>{surfaceCm2} cm² ({surfaceM2.toFixed(2)} m²)</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Potencia LED recomendada</Text>
                    <Text style={[styles.metricValue, { color: '#f57c00' }]}>{wattMin}–{wattMax} W</Text>
                  </View>
                </View>
              )}
              <View style={styles.brandsBox}>
                <Text style={styles.brandsLabel}>Marcas recomendadas</Text>
                <Text style={styles.brandsText}>{tech.lamp_brands}</Text>
              </View>
            </View>
          </View>

          {/* ── CO2 ─────────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CO₂</Text>
            {(() => {
              const co2 = CO2_CARDS[tech.co2_mode];
              return (
                <View style={[styles.infoCard, { borderColor: co2.color + '44' }]}>
                  <View style={styles.infoCardHeader}>
                    <View style={[styles.infoCardIcon, { backgroundColor: co2.color + '18' }]}>
                      <Ionicons name={co2.icon as any} size={20} color={co2.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoCardTitle, { color: co2.color }]}>{co2.title}</Text>
                      <Text style={styles.infoCardSub}>{co2.desc}</Text>
                    </View>
                  </View>
                  <View style={styles.infoCardDivider} />
                  <Text style={styles.co2Note}>{tech.co2_note}</Text>
                  <View style={styles.prosConsRow}>
                    <View style={styles.prosBox}>
                      <Text style={styles.prosConsTitle}>✓ Ventajas</Text>
                      {co2.pros.map((p, i) => (
                        <View key={i} style={styles.prosConsItem}>
                          <View style={[styles.bullet, { backgroundColor: COLORS.success }]} />
                          <Text style={styles.prosConsText}>{p}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.consBox}>
                      <Text style={[styles.prosConsTitle, { color: COLORS.error }]}>✗ Desventajas</Text>
                      {co2.cons.map((c, i) => (
                        <View key={i} style={styles.prosConsItem}>
                          <View style={[styles.bullet, { backgroundColor: COLORS.error }]} />
                          <Text style={styles.prosConsText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              );
            })()}
          </View>

          {/* ── Fertilizantes NPK ── solo agua dulce ─────────────────────── */}
          {!isSaltwater && <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Equilibrio NPK · {vol} L · {tech.freq_per_week}×/semana
            </Text>

            {/* NPK Balance card */}
            <View style={styles.npkCard}>
              <View style={styles.infoCardHeader}>
                <View style={[styles.infoCardIcon, { backgroundColor: '#e8f5e9' }]}>
                  <Ionicons name="analytics-outline" size={20} color="#2e7d32" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoCardTitle}>Ratio N · P · K</Text>
                  <Text style={styles.infoCardSub}>Equilibrio óptimo 10 : 1 : 15</Text>
                </View>
              </View>

              {/* Proportional bar */}
              <View style={styles.npkBarWrap}>
                <View style={[styles.npkBarSeg, { flex: 10, backgroundColor: '#43a047' }]} />
                <View style={[styles.npkBarSeg, { flex: 1,  backgroundColor: '#fb8c00' }]} />
                <View style={[styles.npkBarSeg, { flex: 15, backgroundColor: '#7b1fa2' }]} />
              </View>
              <View style={styles.npkLabelRow}>
                <Text style={[styles.npkLabelText, { color: '#43a047', flex: 10 }]}>N · 10</Text>
                <Text style={[styles.npkLabelText, { color: '#fb8c00', flex: 1, textAlign: 'center' }]}>P·1</Text>
                <Text style={[styles.npkLabelText, { color: '#7b1fa2', flex: 15, textAlign: 'right' }]}>K · 15</Text>
              </View>

              {/* Target ppm pills */}
              <View style={styles.npkPillRow}>
                {([
                  { key: 'NO₃', val: '10 ppm',       color: '#43a047' },
                  { key: 'PO₄', val: '1 ppm',        color: '#fb8c00' },
                  { key: 'K',   val: '10–15 ppm',    color: '#7b1fa2' },
                  { key: 'Fe',  val: '0.1–0.5 ppm',  color: '#c62828' },
                ] as const).map(p => (
                  <View key={p.key} style={[styles.npkPill, { borderColor: p.color + '44', backgroundColor: p.color + '10' }]}>
                    <Text style={[styles.npkPillKey, { color: p.color }]}>{p.key}</Text>
                    <Text style={[styles.npkPillVal, { color: p.color }]}>{p.val}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Macronutrientes ── */}
            <Text style={styles.subSectionLabel}>Macronutrientes</Text>

            {([
              {
                id: 'no3', label: 'Nitrógeno', formula: 'NO₃',
                color: '#43a047', icon: 'leaf-outline',
                brand: 'Seachem Nitrogen · Easy Life Fosfo · TNC Macro',
                dose: no3Dose, target: `${NPK_TARGETS.no3_ppm} ppm`,
              },
              {
                id: 'po4', label: 'Fósforo', formula: 'PO₄',
                color: '#fb8c00', icon: 'water-outline',
                brand: 'Seachem Phosphorus · Easy Life Fosfo · TNC Macro',
                dose: po4Dose, target: `${NPK_TARGETS.po4_ppm} ppm`,
              },
              {
                id: 'k', label: 'Potasio', formula: 'K',
                color: '#7b1fa2', icon: 'flash-outline',
                brand: 'Seachem Potassium · Easy Life Kalium · TNC Macro',
                dose: kDose, target: `${NPK_TARGETS.k_min}–${NPK_TARGETS.k_max} ppm`,
              },
            ] as const).map(n => (
              <View key={n.id} style={styles.fertCard}>
                <View style={[styles.fertIcon, { backgroundColor: n.color + '18', borderColor: n.color + '33', borderWidth: 1 }]}>
                  <Ionicons name={n.icon as any} size={18} color={n.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.fertNameRow}>
                    <Text style={styles.fertName}>{n.label}</Text>
                    <View style={[styles.npkPill, { borderColor: n.color + '44', backgroundColor: n.color + '10', paddingVertical: 2 }]}>
                      <Text style={[styles.npkPillKey, { color: n.color }]}>{n.formula}</Text>
                    </View>
                  </View>
                  <Text style={styles.fertFunc}>{n.brand}</Text>
                  <View style={styles.fertPpmRow}>
                    <Text style={styles.fertPpmText}>Obj: <Text style={[styles.fertPpmBold, { color: n.color }]}>{n.target}</Text></Text>
                    <Text style={styles.fertPpmText}>Sem: <Text style={[styles.fertPpmBold, { color: n.color }]}>{n.dose.weeklyPpm.toFixed(1)} ppm</Text></Text>
                  </View>
                </View>
                <View style={styles.fertDose}>
                  <Text style={[styles.fertDoseValue, { color: n.color }]}>{fmt(n.dose.mlPerDose)}</Text>
                  <Text style={styles.fertDoseLabel}>ml/dosis</Text>
                  <Text style={styles.fertDoseWeekly}>{fmt(n.dose.mlPerWeek)} ml/sem</Text>
                </View>
              </View>
            ))}

            {/* ── Micronutrientes ── */}
            <Text style={styles.subSectionLabel}>Micronutrientes</Text>

            {/* Hierro quelado */}
            <View style={styles.fertCard}>
              <View style={[styles.fertIcon, { backgroundColor: '#ffebee', borderColor: '#ef9a9a', borderWidth: 1 }]}>
                <Ionicons name="flask-outline" size={18} color="#c62828" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.fertNameRow}>
                  <Text style={styles.fertName}>Hierro quelado</Text>
                  <View style={[styles.npkPill, { borderColor: '#c6282844', backgroundColor: '#c6282810', paddingVertical: 2 }]}>
                    <Text style={[styles.npkPillKey, { color: '#c62828' }]}>Fe</Text>
                  </View>
                </View>
                <Text style={styles.fertFunc}>Seachem Iron · Tropica Fe · Aquaflora Fe</Text>
                <View style={styles.fertPpmRow}>
                  <Text style={styles.fertPpmText}>Obj: <Text style={[styles.fertPpmBold, { color: '#c62828' }]}>0.1–0.5 ppm</Text></Text>
                  <Text style={styles.fertPpmText}>Sem: <Text style={[styles.fertPpmBold, { color: '#c62828' }]}>{feDose.weeklyPpm.toFixed(2)} ppm</Text></Text>
                </View>
              </View>
              <View style={styles.fertDose}>
                <Text style={[styles.fertDoseValue, { color: '#c62828' }]}>{fmt(feDose.mlPerDose)}</Text>
                <Text style={styles.fertDoseLabel}>ml/dosis</Text>
                <Text style={styles.fertDoseWeekly}>{fmt(feDose.mlPerWeek)} ml/sem</Text>
              </View>
            </View>

            {/* Oligoelementos */}
            <View style={styles.fertCard}>
              <View style={[styles.fertIcon, { backgroundColor: '#f3e5f5', borderColor: '#ce93d8', borderWidth: 1 }]}>
                <Ionicons name="star-outline" size={18} color="#7b1fa2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fertName}>Oligoelementos (Micro)</Text>
                <Text style={styles.fertFunc}>Seachem Flourish · TNC Complete · Aquaflora</Text>
                <Text style={styles.fertNote}>Mn, Zn, B, Cu, Mo · 1 ml / 100 L / dosis</Text>
              </View>
              <View style={styles.fertDose}>
                <Text style={[styles.fertDoseValue, { color: '#7b1fa2' }]}>{fmt(vol / 100)}</Text>
                <Text style={styles.fertDoseLabel}>ml/dosis</Text>
                <Text style={styles.fertDoseWeekly}>{fmt((vol / 100) * tech.freq_per_week)} ml/sem</Text>
              </View>
            </View>

            <View style={styles.fertTip}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.fertTipText}>
                Dosis calculadas con equilibrio NPK 10:1:15. El cambio semanal del 25% repone ~25% del objetivo; el resto compensa el consumo de las plantas. Ajustar según el crecimiento real y la coloración.
              </Text>
            </View>
          </View>}

          {/* ── Tabletas radiculares ── solo agua dulce ───────────────────── */}
          {!isSaltwater && <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tabletas radiculares</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={[styles.infoCardIcon, { backgroundColor: '#efebe9' }]}>
                  <Ionicons name="earth-outline" size={20} color="#6d4c41" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoCardTitle}>Plantas de raíz profunda</Text>
                  <Text style={styles.infoCardSub}>Echinodorus, Cryptocoryne, Vallisneria, Hairgrass</Text>
                </View>
              </View>
              <View style={styles.infoCardDivider} />
              <Text style={styles.brandsText}>{tech.root_tabs_note}</Text>
              <Text style={[styles.brandsLabel, { marginTop: SPACING.sm }]}>Marcas populares</Text>
              <Text style={styles.brandsText}>Seachem Flourish Tabs, JBL Ferropol Root, Prodibio Root, Dennerle Crypto</Text>
            </View>
          </View>}

          {/* ── Calendario semanal + Recordatorios ──────────────────────── */}
          <View style={styles.section}>
            <View style={styles.calHeaderRow}>
              <Text style={styles.sectionLabel}>Calendario semanal</Text>
              {!pushAvailable && (
                <View style={styles.webNotifBadge}>
                  <Ionicons name="phone-portrait-outline" size={11} color={COLORS.textMuted} />
                  <Text style={styles.webNotifText}>Push solo en app móvil</Text>
                </View>
              )}
            </View>

            <View style={styles.calendarCard}>
              {((() => {
                // Build calculated action strings with real ml amounts
                const microStr = `Micro — ${fmt(microMl)} ml`;
                const macroStr = `Macro N:${fmt(no3Dose.mlPerDose)} P:${fmt(po4Dose.mlPerDose)} K:${fmt(kDose.mlPerDose)} ml`;
                const feStr    = `Fe quelado — ${fmt(feDose.mlPerDose)} ml`;
                return [
                  {
                    dayIndex: 0,
                    day: 'Lunes',
                    actions: isSaltwater
                      ? ['Verificar Ca, Mg, KH · Dosificar según test']
                      : techLevel === 'low'
                        ? [microStr]
                        : techLevel === 'medium'
                          ? [microStr, macroStr]
                          : [microStr, macroStr, feStr],
                    isFert: true,
                  },
                  {
                    dayIndex: 1,
                    day: 'Miércoles',
                    actions: isSaltwater
                      ? ['Cambio agua parcial 10–15%']
                      : techLevel === 'low'
                        ? [macroStr]
                        : techLevel === 'medium'
                          ? [microStr, macroStr]
                          : [microStr, macroStr, feStr],
                    isFert: !isSaltwater,
                  },
                  {
                    dayIndex: 2,
                    day: 'Viernes',
                    actions: isSaltwater
                      ? ['Verificar salinidad 1.023–1.025 SG']
                      : techLevel === 'low'
                        ? []
                        : techLevel === 'medium'
                          ? [microStr, macroStr]
                          : [microStr, macroStr, feStr],
                    isFert: !isSaltwater && techLevel !== 'low',
                  },
                  {
                    dayIndex: 3,
                    day: 'Domingo',
                    actions: isSaltwater
                      ? ['Cambio agua parcial 10–15% · Medir parámetros']
                      : ['Cambio de agua 20–30%'],
                    isFert: false,
                  },
                ];
              })()).map((item, i, arr) => {
                const rem = reminders.find(r => r.dayIndex === item.dayIndex)!;
                return (
                  <React.Fragment key={item.day}>
                    <View style={styles.calRow}>
                      {/* Day + actions */}
                      <View style={{ flex: 1 }}>
                        <View style={styles.calTopRow}>
                          <View style={styles.calDay}>
                            <Text style={styles.calDayText}>{item.day}</Text>
                          </View>
                          <View style={{ flex: 1, gap: 3 }}>
                            {item.actions.length === 0
                              ? <Text style={styles.calNoAction}>Sin fertilización</Text>
                              : item.actions.map((a, j) => (
                                <View key={j} style={styles.calActionRow}>
                                  <View style={[styles.bullet, { backgroundColor: item.isFert ? COLORS.success : COLORS.primary, marginTop: 5 }]} />
                                  <Text style={styles.calAction}>{a}</Text>
                                </View>
                              ))
                            }
                          </View>
                        </View>

                        {/* Reminder row */}
                        <View style={styles.reminderRow}>
                          <Ionicons
                            name={rem?.enabled ? 'notifications' : 'notifications-outline'}
                            size={14}
                            color={rem?.enabled ? COLORS.primary : COLORS.textMuted}
                          />
                          <Text style={[styles.reminderLabel, rem?.enabled && { color: COLORS.primary }]}>
                            {rem?.enabled ? `Recordatorio ${pad(rem.hour)}:${pad(rem.minute)}` : 'Sin recordatorio'}
                          </Text>
                          <Switch
                            value={rem?.enabled ?? false}
                            onValueChange={() => toggleReminder(item.dayIndex)}
                            trackColor={{ false: COLORS.border, true: COLORS.primary + '55' }}
                            thumbColor={rem?.enabled ? COLORS.primary : '#ccc'}
                            style={styles.reminderSwitch}
                          />
                        </View>

                        {/* Time picker (visible when enabled) */}
                        {rem?.enabled && (
                          <View style={styles.timePicker}>
                            <Text style={styles.timePickerLabel}>Hora del recordatorio</Text>
                            <View style={styles.timePickerRow}>
                              {/* Hour */}
                              <View style={styles.timeUnit}>
                                <TouchableOpacity style={styles.timeBtn} onPress={() => setTime(item.dayIndex, (rem.hour + 1) % 24, rem.minute)}>
                                  <Ionicons name="chevron-up" size={16} color={COLORS.primary} />
                                </TouchableOpacity>
                                <View style={styles.timeDisplay}>
                                  <Text style={styles.timeValue}>{pad(rem.hour)}</Text>
                                </View>
                                <TouchableOpacity style={styles.timeBtn} onPress={() => setTime(item.dayIndex, (rem.hour - 1 + 24) % 24, rem.minute)}>
                                  <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                                </TouchableOpacity>
                              </View>

                              <Text style={styles.timeSep}>:</Text>

                              {/* Minute */}
                              <View style={styles.timeUnit}>
                                <TouchableOpacity style={styles.timeBtn} onPress={() => setTime(item.dayIndex, rem.hour, (rem.minute + 15) % 60)}>
                                  <Ionicons name="chevron-up" size={16} color={COLORS.primary} />
                                </TouchableOpacity>
                                <View style={styles.timeDisplay}>
                                  <Text style={styles.timeValue}>{pad(rem.minute)}</Text>
                                </View>
                                <TouchableOpacity style={styles.timeBtn} onPress={() => setTime(item.dayIndex, rem.hour, (rem.minute - 15 + 60) % 60)}>
                                  <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                                </TouchableOpacity>
                              </View>

                              <Text style={styles.timeAmPm}>
                                {rem.hour < 12 ? 'AM' : 'PM'}
                              </Text>
                            </View>
                            <Text style={styles.timePickerHint}>
                              {pushAvailable
                                ? `Notificación semanal cada ${item.day.toLowerCase()} a las ${pad(rem.hour)}:${pad(rem.minute)}`
                                : `Horario guardado · Las notificaciones push se envían solo en la app móvil`
                              }
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {i < arr.length - 1 && <View style={styles.calDivider} />}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: CORRECCIÓN POR TESTEO
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'corr' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Selector de acuario */}
          {aquariums.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Acuario</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: SPACING.sm }}>
                {aquariums.map(aq => (
                  <TouchableOpacity
                    key={aq.id}
                    style={[styles.aqChip, aquariumId === aq.id && styles.aqChipActive]}
                    onPress={() => setAquariumId(aq.id)}
                  >
                    <Ionicons name="cube-outline" size={13} color={aquariumId === aq.id ? COLORS.primary : COLORS.textMuted} />
                    <Text style={[styles.aqChipText, aquariumId === aq.id && styles.aqChipTextActive]}>
                      {aq.name} · {aq.volume_liters}L
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Explicación */}
          <View style={[styles.section, { paddingBottom: 0 }]}>
            <View style={styles.calcBasisBox}>
              <Ionicons name="beaker-outline" size={14} color={COLORS.primary} />
              <Text style={styles.calcBasisText}>
                Ingresa el valor medido en tu test y el objetivo. La app calcula los ml exactos a añadir para corregir la diferencia en{' '}
                <Text style={styles.calcBasisBold}>{vol} L</Text>.
                Fórmula: <Text style={styles.calcBasisBold}>ml = (objetivo − actual) / concentración × (litros/100)</Text>
              </Text>
            </View>
          </View>

          {/* Cards por nutriente */}
          {CORR_PRODUCTS.map(prod => {
            const state   = corrValues[prod.id];
            // Normalizar coma decimal (teclado es-ES da "0,5") antes de parsear,
            // si no parseFloat("0,5")=0 → recomienda sobredosis de fertilizante.
            const current = parseFloat((state.current || '').replace(',', '.'));
            const target  = parseFloat((state.target  || '').replace(',', '.'));
            const brand   = prod.brands[state.brandIdx];
            const diff    = (!isNaN(current) && !isNaN(target)) ? target - current : null;
            const mlNeeded = (diff !== null && diff > 0 && brand)
              ? (diff / brand.ppmPerMlPer100L) * (vol / 100)
              : null;
            const isLow  = !isNaN(current) && current < prod.idealMin;
            const isHigh = !isNaN(current) && current > prod.idealMax;
            const statusColor = isLow ? '#e65100' : isHigh ? '#c62828' : COLORS.success;
            const statusLabel = isLow ? 'Por debajo del óptimo' : isHigh ? 'Por encima del óptimo' : !isNaN(current) ? 'En rango óptimo' : '';

            return (
              <View key={prod.id} style={styles.section}>
                <View style={[styles.corrCard, { borderColor: prod.color + '44' }]}>
                  {/* Header */}
                  <View style={styles.corrCardHeader}>
                    <View style={[styles.infoCardIcon, { backgroundColor: prod.color + '15', width: 36, height: 36, borderRadius: 10 }]}>
                      <Ionicons name={prod.icon as any} size={18} color={prod.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fertName, { color: prod.color }]}>{prod.label}</Text>
                      <Text style={styles.fertFunc}>Rango óptimo: {prod.idealMin}–{prod.idealMax} {prod.unit}</Text>
                    </View>
                    {statusLabel !== '' && (
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '44' }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    )}
                  </View>

                  {/* Inputs: actual + objetivo */}
                  <View style={styles.corrInputRow}>
                    <View style={styles.corrInputWrap}>
                      <Text style={styles.corrInputLabel}>Valor actual (test)</Text>
                      <View style={[styles.corrInputBox, isLow && { borderColor: '#e65100' }, isHigh && { borderColor: '#c62828' }]}>
                        <TextInput
                          style={styles.corrInput}
                          value={state.current}
                          onChangeText={v => setCorrValues(prev => ({ ...prev, [prod.id]: { ...prev[prod.id], current: v } }))}
                          keyboardType="decimal-pad"
                          placeholder={`0.0 ${prod.unit}`}
                          placeholderTextColor={COLORS.textMuted}
                        />
                      </View>
                    </View>
                    <Ionicons name="arrow-forward-outline" size={18} color={COLORS.textMuted} style={{ marginTop: 26 }} />
                    <View style={styles.corrInputWrap}>
                      <Text style={styles.corrInputLabel}>Objetivo</Text>
                      <View style={styles.corrInputBox}>
                        <TextInput
                          style={styles.corrInput}
                          value={state.target}
                          onChangeText={v => setCorrValues(prev => ({ ...prev, [prod.id]: { ...prev[prod.id], target: v } }))}
                          keyboardType="decimal-pad"
                          placeholder={`${prod.idealMin} ${prod.unit}`}
                          placeholderTextColor={COLORS.textMuted}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Selector de marca/producto */}
                  <Text style={[styles.corrInputLabel, { marginTop: SPACING.sm }]}>Producto</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
                    {prod.brands.map((b, i) => (
                      <TouchableOpacity
                        key={b.name}
                        style={[styles.brandChip, state.brandIdx === i && { borderColor: prod.color + '66', backgroundColor: prod.color + '10' }]}
                        onPress={() => setCorrValues(prev => ({ ...prev, [prod.id]: { ...prev[prod.id], brandIdx: i } }))}
                      >
                        <Text style={[styles.brandChipText, state.brandIdx === i && { color: prod.color, fontFamily: FONTS.sansBd }]}>
                          {b.name}
                        </Text>
                        <Text style={[styles.brandChipConc, state.brandIdx === i && { color: prod.color }]}>
                          {b.ppmPerMlPer100L} ppm/ml/100L
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Resultado */}
                  {mlNeeded !== null && (
                    <View style={[styles.corrResult, { backgroundColor: prod.color + '0c', borderColor: prod.color + '33' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.corrResultLabel}>Añadir ahora a {vol} L</Text>
                        <Text style={[styles.corrResultFormula, { color: COLORS.textMuted }]}>
                          ({fmt(diff!)} {prod.unit} diferencia)
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.corrResultValue, { color: prod.color }]}>{fmt(mlNeeded)}</Text>
                        <Text style={styles.corrResultUnit}>ml de {brand.name.split(' ').slice(0, 2).join(' ')}</Text>
                      </View>
                    </View>
                  )}

                  {diff !== null && diff <= 0 && (
                    <View style={[styles.corrResult, { backgroundColor: COLORS.success + '0c', borderColor: COLORS.success + '33' }]}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
                      <Text style={[styles.corrResultLabel, { color: COLORS.success, flex: 1, marginLeft: 8 }]}>
                        {diff === 0 ? 'Ya en el objetivo — no añadir' : 'Por encima del objetivo — realizar cambio parcial de agua'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          <View style={[styles.section, { paddingTop: 0 }]}>
            <View style={styles.fertTip}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.fertTipText}>
                Añade el fertilizante cerca del filtro con la bomba encendida para distribuirlo uniformemente. Espera 24h antes de volver a testear.
              </Text>
            </View>
          </View>

        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: PLANTAS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'plants' && (
        <View style={{ flex: 1 }}>

          {/* Search */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar planta…"
                placeholderTextColor={COLORS.textMuted}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter rows */}
          <View style={styles.filterBlock}>
            {/* Row 1: Difficulty */}
            <View style={styles.filterRow}>
              {([
                { key: 'all',    label: 'Todas',   icon: 'apps-outline'         },
                { key: 'easy',   label: 'Fácil',   icon: 'checkmark-outline'    },
                { key: 'medium', label: 'Media',   icon: 'remove-outline'       },
                { key: 'hard',   label: 'Difícil', icon: 'alert-circle-outline' },
              ] as const).map(f => {
                const active = diffFilter === f.key;
                const color  = f.key === 'easy' ? '#2e7d32' : f.key === 'medium' ? '#f57c00' : f.key === 'hard' ? '#c62828' : COLORS.primary;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterChip, active && { borderColor: color + '55', backgroundColor: color + '10' }]}
                    onPress={() => setDiffFilter(f.key)}
                  >
                    <Ionicons name={f.icon as any} size={12} color={active ? color : COLORS.textMuted} />
                    <Text style={[styles.filterChipText, active && { color, fontFamily: FONTS.sansBd }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Row 2: Placement */}
            <View style={styles.filterRow}>
              {([
                { key: 'all',        label: 'Todos',      icon: 'grid-outline'         },
                { key: 'foreground', label: '1.er plano', icon: 'arrow-down-outline'   },
                { key: 'midground',  label: 'Medio',      icon: 'remove-outline'       },
                { key: 'background', label: 'Fondo',      icon: 'arrow-up-outline'     },
                { key: 'floating',   label: 'Flotante',   icon: 'water-outline'        },
              ] as const).map(f => {
                const active = placeFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setPlaceFilter(f.key)}
                  >
                    <Ionicons name={f.icon as any} size={12} color={active ? COLORS.primary : COLORS.textMuted} />
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Counter */}
          <Text style={styles.plantCount}>{filteredPlants.length} plantas</Text>

          {/* Plant list */}
          <FlatList
            data={filteredPlants}
            keyExtractor={p => p.id}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 40, gap: SPACING.sm }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: p }) => <PlantCard plant={p} expanded={expandedId === p.id} onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)} />}
          />
        </View>
      )}
    </View>
  );
}

// ── Plant Card ────────────────────────────────────────────────────────────────
function PlantCard({ plant: p, expanded, onToggle }: { plant: AquaticPlant; expanded: boolean; onToggle: () => void }) {
  const diffColor = DIFFICULTY_COLORS[p.difficulty];

  return (
    <TouchableOpacity style={styles.plantCard} onPress={onToggle} activeOpacity={0.85}>
      {/* Main row */}
      <View style={styles.plantRow}>
        {/* Photo */}
        <View style={styles.plantImgWrap}>
          {p.image_url ? (
            <Image source={{ uri: p.image_url }} style={styles.plantImg} />
          ) : (
            <View style={[styles.plantImgPlaceholder, { backgroundColor: diffColor + '12' }]}>
              <Ionicons name="leaf" size={26} color={diffColor} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.plantName}>{p.common_name}</Text>
          <Text style={styles.plantSci}>{p.scientific_name}</Text>
          <View style={styles.plantBadgeRow}>
            {/* Difficulty */}
            <View style={[styles.badge, { backgroundColor: diffColor + '18', borderColor: diffColor + '44', borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: diffColor }]}>{DIFFICULTY_LABELS[p.difficulty]}</Text>
            </View>
            {/* Light */}
            <View style={styles.badge}>
              <Ionicons name="sunny-outline" size={10} color={COLORS.textMuted} />
              <Text style={styles.badgeText}>{LIGHT_LABELS[p.light]}</Text>
            </View>
            {/* CO2 */}
            {p.co2_required && (
              <View style={[styles.badge, { backgroundColor: '#e3f2fd', borderColor: '#90caf9', borderWidth: 1 }]}>
                <Text style={[styles.badgeText, { color: '#1565c0' }]}>CO₂</Text>
              </View>
            )}
          </View>
        </View>

        {/* Placement + chevron */}
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Ionicons name={PLACEMENT_ICONS[p.placement] as any} size={16} color={COLORS.textMuted} />
          <Text style={styles.placementText}>{PLACEMENT_LABELS[p.placement]}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.textMuted} />
        </View>
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={styles.plantDetail}>
          <View style={styles.plantDivider} />
          <Text style={styles.plantDesc}>{p.description}</Text>

          <View style={styles.plantParamsGrid}>
            {[
              { icon: 'thermometer-outline', label: 'Temperatura', value: `${p.temp_min}–${p.temp_max} °C`, color: '#ef6c00' },
              { icon: 'flask-outline',       label: 'pH',          value: `${p.ph_min}–${p.ph_max}`,         color: '#0288d1' },
              { icon: 'trending-up-outline', label: 'Crecimiento', value: p.growth_rate === 'slow' ? 'Lento' : p.growth_rate === 'medium' ? 'Medio' : 'Rápido', color: COLORS.success },
              { icon: 'resize-outline',      label: 'Alto máximo', value: `${p.max_height_cm} cm`,            color: COLORS.primary },
            ].map(param => (
              <View key={param.label} style={styles.plantParamItem}>
                <View style={[styles.plantParamIcon, { backgroundColor: param.color + '15' }]}>
                  <Ionicons name={param.icon as any} size={14} color={param.color} />
                </View>
                <View>
                  <Text style={styles.plantParamLabel}>{param.label}</Text>
                  <Text style={[styles.plantParamValue, { color: param.color }]}>{param.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Care note */}
          <View style={styles.careBox}>
            <Ionicons name="information-circle-outline" size={15} color={COLORS.primary} style={{ marginTop: 1 }} />
            <Text style={styles.careText}>{p.care_notes}</Text>
          </View>

          {/* Tags */}
          <View style={styles.tagsRow}>
            {p.tags.map(t => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>#{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.md,
  },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.success + '15',
    borderWidth: 1, borderColor: COLORS.success + '35',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontFamily: FONTS.sansEb, color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted, marginTop: 1 },

  // Tabs
  tabs: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9,
    borderRadius: BORDER_RADIUS.full,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  tabLabel: { fontSize: 13, fontFamily: FONTS.sansMd, color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.primary, fontFamily: FONTS.sansBd },

  // Sections
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionLabel: {
    fontSize: 11, fontFamily: FONTS.sansBd, color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm,
  },

  // Aquarium chips
  aqChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
  },
  aqChipActive: { borderColor: COLORS.primary + '55', backgroundColor: COLORS.primary + '0f' },
  aqChipText: { fontSize: 13, fontFamily: FONTS.sansMd, color: COLORS.textMuted },
  aqChipTextActive: { color: COLORS.primary, fontFamily: FONTS.sansBd },

  // Tech cards
  techCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.sm,
    // Same Android-elevation fix as ProfileScreen.expCard
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04, shadowRadius: 3,
    } : {}),
  },
  techIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  techLabel: { fontSize: 14, fontFamily: FONTS.sansBd, color: COLORS.text, marginBottom: 2 },
  techDesc: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted },

  // Summary card
  summaryCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 14, fontFamily: FONTS.sansBd, color: COLORS.text, textAlign: 'center' },
  summaryKey: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted, textAlign: 'center' },
  summaryDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  // Info card
  infoCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.sm },
  infoCardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoCardTitle: { fontSize: 14, fontFamily: FONTS.sansBd, color: COLORS.text, marginBottom: 2 },
  infoCardSub: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted },
  infoCardDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  metricRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, marginBottom: 2 },
  metricValue: { fontSize: 13, fontFamily: FONTS.sansBd, color: COLORS.text },
  brandsBox: { backgroundColor: COLORS.backgroundLight, borderRadius: 10, padding: SPACING.sm, marginTop: SPACING.sm },
  brandsLabel: { fontSize: 10, fontFamily: FONTS.sansBd, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  brandsText: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textSecondary, lineHeight: 18 },

  // CO2
  co2Note: { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
  prosConsRow: { flexDirection: 'row', gap: SPACING.sm },
  prosBox: { flex: 1, backgroundColor: COLORS.success + '0a', borderRadius: 10, padding: SPACING.sm },
  consBox: { flex: 1, backgroundColor: COLORS.error + '0a', borderRadius: 10, padding: SPACING.sm },
  prosConsTitle: { fontSize: 11, fontFamily: FONTS.sansBd, color: COLORS.success, marginBottom: 6 },
  prosConsItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  prosConsText: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textSecondary, lineHeight: 16, flex: 1 },

  // Fertilizer cards
  fertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  fertIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fertName: { fontSize: 13, fontFamily: FONTS.sansBd, color: COLORS.text, marginBottom: 2 },
  fertFunc: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textSecondary, lineHeight: 16 },
  fertNote: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 2 },
  fertDose: { alignItems: 'flex-end', gap: 2 },
  fertDoseValue: { fontSize: 18, fontFamily: FONTS.sansEb },
  fertDoseLabel: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted },
  fertDoseWeekly: { fontSize: 10, fontFamily: FONTS.sansMd, color: COLORS.textMuted },
  fertTip: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '0a',
    borderRadius: 12, padding: SPACING.sm, marginTop: 4,
    borderWidth: 1, borderColor: COLORS.primary + '25',
  },
  fertTipText: { flex: 1, fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textSecondary, lineHeight: 17 },

  // Calendar
  calHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: SPACING.sm,
  },
  webNotifBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1, borderColor: COLORS.border,
  },
  webNotifText: { fontSize: 10, fontFamily: FONTS.sansMd, color: COLORS.textMuted },
  calendarCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  calRow: { padding: SPACING.md },
  calTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: SPACING.sm },
  calDay: { width: 80 },
  calDayText: { fontSize: 13, fontFamily: FONTS.sansBd, color: COLORS.text },
  calDivider: { height: 1, backgroundColor: COLORS.border },
  calActionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  calAction: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textSecondary, lineHeight: 20, flex: 1 },
  calNoAction: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted, fontStyle: 'italic' },

  // Reminder toggle row
  reminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 10, marginTop: 2,
    borderWidth: 1, borderColor: COLORS.border,
  },
  reminderLabel: { flex: 1, fontSize: 12, fontFamily: FONTS.sansMd, color: COLORS.textMuted },
  reminderSwitch: { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },

  // Time picker
  timePicker: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary + '14',
    borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.primary + '25',
    padding: SPACING.md,
  },
  timePickerLabel: {
    fontSize: 11, fontFamily: FONTS.sansBd, color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: SPACING.sm,
  },
  timePickerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: SPACING.sm,
  },
  timeUnit: { alignItems: 'center', gap: 4 },
  timeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  timeDisplay: {
    width: 60, height: 52,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.primary + '44',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  timeValue: { fontSize: 28, fontFamily: FONTS.sansEb, color: COLORS.primary },
  timeSep: { fontSize: 28, fontFamily: FONTS.sansEb, color: COLORS.primary, marginBottom: 4 },
  timeAmPm: {
    fontSize: 13, fontFamily: FONTS.sansBd,
    color: COLORS.textMuted, marginLeft: 4,
  },
  timePickerHint: {
    marginTop: SPACING.sm,
    fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 16,
  },

  // Plant catalog
  searchWrap: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 11, paddingHorizontal: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: FONTS.sans, color: COLORS.text },

  filterBlock: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
  },
  filterChipActive: { borderColor: COLORS.primary + '55', backgroundColor: COLORS.primary + '0f' },
  filterChipText: { fontSize: 12, fontFamily: FONTS.sansMd, color: COLORS.textMuted },
  filterChipTextActive: { color: COLORS.primary, fontFamily: FONTS.sansBd },

  plantCount: {
    fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm,
  },

  // Plant card
  plantCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  plantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.md },
  plantImgWrap: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden', flexShrink: 0, borderWidth: 1, borderColor: COLORS.border },
  plantImg: { width: '100%', height: '100%' },
  plantImgPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  plantName: { fontSize: 14, fontFamily: FONTS.sansBd, color: COLORS.text, marginBottom: 2 },
  plantSci: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 6 },
  plantBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundLight,
  },
  badgeText: { fontSize: 9, fontFamily: FONTS.sansBd, color: COLORS.textMuted, letterSpacing: 0.3 },
  placementText: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted, textAlign: 'right' },

  // Expanded
  plantDetail: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  plantDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  plantDesc: { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
  plantParamsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md,
  },
  plantParamItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '47%',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 10, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  plantParamIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  plantParamLabel: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted },
  plantParamValue: { fontSize: 12, fontFamily: FONTS.sansBd },
  careBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '14',
    borderRadius: 10, padding: SPACING.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.primary + '22',
  },
  careText: { flex: 1, fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textSecondary, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.backgroundLight, borderWidth: 1, borderColor: COLORS.border },
  tagText: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted },

  // NPK balance card
  npkCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  npkBarWrap: {
    flexDirection: 'row', height: 10, borderRadius: 5,
    overflow: 'hidden', marginVertical: SPACING.sm,
  },
  npkBarSeg: { height: '100%' as any },
  npkLabelRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  npkLabelText: { fontSize: 10, fontFamily: FONTS.sansBd },
  npkPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.xs },
  npkPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1,
  },
  npkPillKey: { fontSize: 9, fontFamily: FONTS.sansBd, letterSpacing: 0.3 },
  npkPillVal: { fontSize: 11, fontFamily: FONTS.sansBd },
  subSectionLabel: {
    fontSize: 10, fontFamily: FONTS.sansBd, color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: SPACING.xs, marginTop: SPACING.sm,
  },
  fertNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  fertPpmRow: { flexDirection: 'row', gap: SPACING.md, marginTop: 2, flexWrap: 'wrap' },
  fertPpmText: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted },
  fertPpmBold: { fontFamily: FONTS.sansBd },

  // Corrective calculator
  corrCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  corrCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.md },
  corrInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, marginBottom: SPACING.sm },
  corrInputWrap: { flex: 1 },
  corrInputLabel: { fontSize: 11, fontFamily: FONTS.sansBd, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  corrInputBox: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm, paddingVertical: 10,
  },
  corrInput: { fontSize: 16, fontFamily: FONTS.sansBd, color: COLORS.text },
  brandChip: {
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
  },
  brandChipText: { fontSize: 12, fontFamily: FONTS.sansMd, color: COLORS.textSecondary },
  brandChipConc: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted, marginTop: 1 },
  corrResult: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: SPACING.md, borderRadius: 12, borderWidth: 1,
    padding: SPACING.md, gap: SPACING.sm,
  },
  corrResultLabel: { fontSize: 12, fontFamily: FONTS.sansBd, color: COLORS.text },
  corrResultFormula: { fontSize: 11, fontFamily: FONTS.sans, marginTop: 2 },
  corrResultValue: { fontSize: 28, fontFamily: FONTS.sansEb },
  corrResultUnit: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1,
  },
  statusBadgeText: { fontSize: 9, fontFamily: FONTS.sansBd, letterSpacing: 0.3 },

  // Volume warning + calc basis
  volWarning: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    marginTop: SPACING.sm,
    backgroundColor: '#fff3e0',
    borderRadius: 10, padding: SPACING.sm,
    borderWidth: 1, borderColor: '#ffe0b2',
  },
  volWarningText: { flex: 1, fontSize: 11, fontFamily: FONTS.sans, color: '#bf360c', lineHeight: 17 },
  calcBasisBox: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    marginTop: SPACING.sm,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 10, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  calcBasisText: { flex: 1, fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, lineHeight: 17 },
  calcBasisBold: { fontFamily: FONTS.sansBd, color: COLORS.text },

  // Empty
  emptyCard: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.lg,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.xl, alignItems: 'center', gap: 8,
  },
  emptyTitle: { fontSize: 15, fontFamily: FONTS.sansBd, color: COLORS.text },
  emptyBody: { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
