import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useFishDatabase } from '../../hooks/useFishDatabase';
import { useAquariums } from '../../hooks/useAquariums';

// ─── Disease Database ──────────────────────────────────────────────────────────

type Severity = 'low' | 'medium' | 'high';

interface Disease {
  name: string;
  symptoms: string[];
  description: string;
  treatment: string;
  prevention: string;
  severity: Severity;
}

const DISEASE_DATABASE: Disease[] = [
  {
    name: 'Ich / Punto blanco',
    symptoms: ['Manchas blancas', 'Se rasca contra objetos', 'Respiración rápida', 'Letargia'],
    description: 'Parásito protozoario (Ichthyophthirius multifiliis) que produce pequeños puntos blancos similares a granos de sal en la piel y aletas.',
    treatment: 'Elevar temperatura a 30°C durante 10 días, añadir sal de acuario (1 g/L) y tratar con verde malaquita o medicamento antiparasitario específico.',
    prevention: 'Cuarentena de nuevos peces, mantener temperatura estable, evitar el estrés.',
    severity: 'high',
  },
  {
    name: 'Podredumbre de aletas',
    symptoms: ['Aletas deshilachadas', 'Pérdida de color', 'Letargia'],
    description: 'Infección bacteriana (Aeromonas, Pseudomonas) que causa degradación progresiva de las aletas, comenzando por los bordes.',
    treatment: 'Mejorar calidad del agua, realizar cambios del 25–30% diarios, tratar con antibióticos como tetraciclina o kanamicina.',
    prevention: 'Agua limpia, evitar peleas entre peces, tratar heridas rápidamente.',
    severity: 'medium',
  },
  {
    name: 'Hidropesía',
    symptoms: ['Hinchazón abdominal', 'Ojos saltones', 'Pérdida de color', 'No come', 'Letargia'],
    description: 'Síndrome multifactorial (bacterias, parásitos, virus) caracterizado por acumulación de líquido, escamas erizadas ("piña") y abdomen hinchado.',
    treatment: 'Aislar el pez, baño de sal de Epsom (1 cucharadita/4L), antibióticos de amplio espectro. El pronóstico suele ser reservado.',
    prevention: 'Mantenimiento riguroso del agua, dieta equilibrada, cuarentena de nuevos peces.',
    severity: 'high',
  },
  {
    name: 'Columnaris',
    symptoms: ['Manchas blancas', 'Aletas deshilachadas', 'Algodón/hongos', 'Letargia', 'No come'],
    description: 'Infección bacteriana (Flavobacterium columnare) que produce lesiones blanquecinas o grisáceas parecidas a hongos en la piel, aletas y branquias.',
    treatment: 'Antibióticos como trimetoprima-sulfametoxazol, nitrofurazona o kanamicina. Reducir temperatura a 22°C para ralentizar la bacteria.',
    prevention: 'Buena calidad de agua, evitar lesiones físicas, cuarentena de nuevos ejemplares.',
    severity: 'high',
  },
  {
    name: 'Oodinium / Terciopelo',
    symptoms: ['Pérdida de color', 'Se rasca contra objetos', 'Respiración rápida', 'Letargia'],
    description: 'Parásito dinoflagelado que cubre al pez con un polvo dorado o verdoso similar al terciopelo, visible con luz lateral.',
    treatment: 'Oscurecer el acuario, elevar temperatura a 28°C, añadir sal y tratar con cloroquina fosfato o sulfato de cobre.',
    prevention: 'Cuarentena estricta de nuevos peces (mínimo 4 semanas), evitar estrés.',
    severity: 'high',
  },
  {
    name: 'Hongos acuáticos',
    symptoms: ['Algodón/hongos', 'Manchas blancas', 'Letargia'],
    description: 'Infecciones por Saprolegnia o Achylya que producen masas algodonosas blancas o grises sobre heridas o huevos debilitados.',
    treatment: 'Verde malaquita, azul de metileno o productos antifúngicos específicos. Mejorar calidad del agua.',
    prevention: 'Tratar heridas y úlceras rápidamente, retirar huevos sin fertilizar, mantener agua limpia.',
    severity: 'medium',
  },
  {
    name: 'Parásitos branquiales',
    symptoms: ['Respiración rápida', 'Se rasca contra objetos', 'Letargia', 'Nada erráticamente'],
    description: 'Monogeneos (Gyrodactylus, Dactylogyrus) que parasitan las branquias causando dificultad respiratoria, jadeo en la superficie y movimientos erráticos.',
    treatment: 'Praziquantel (dosis según fabricante), baños de sal o formaldehído controlado.',
    prevention: 'Cuarentena de nuevos peces, revisión visual antes de introducir ejemplares.',
    severity: 'medium',
  },
  {
    name: 'Tuberculosis piscícola',
    symptoms: ['Pérdida de color', 'No come', 'Letargia', 'Hinchazón abdominal'],
    description: 'Infección crónica por Mycobacterium marinum. Causa adelgazamiento progresivo, úlceras y deformidades. Puede transmitirse al humano por cortes.',
    treatment: 'No existe cura efectiva. Aislar o sacrificar el pez enfermo. Desinfectar el acuario completamente.',
    prevention: 'No mezclar peces de fuentes desconocidas, usar guantes al manipular agua.',
    severity: 'high',
  },
  {
    name: 'Enfermedad del neón',
    symptoms: ['Pérdida de color', 'Letargia', 'Nada erráticamente', 'No come'],
    description: 'Causada por el microsporidio Pleistophora hyphessobryconis. Destruye el pigmento del pez produciendo zonas blancas o decoloradas bajo la línea de color.',
    treatment: 'No existe tratamiento efectivo. Aislar inmediatamente al pez afectado para evitar contagio.',
    prevention: 'Comprar peces de criaderos de confianza, cuarentena obligatoria.',
    severity: 'high',
  },
  {
    name: 'Vejiga natatoria (Swim Bladder)',
    symptoms: ['Nada erráticamente', 'Hinchazón abdominal', 'Letargia'],
    description: 'Disfunción del órgano que regula la flotabilidad. El pez nada de lado, cabeza abajo o no puede hundirse. Causas: infección, estreñimiento, traumatismo.',
    treatment: 'Ayuno 48–72 h, luego guisantes pelados cocidos. Si es infección, antibióticos. Baños de sal de Epsom para estreñimiento.',
    prevention: 'Dieta variada con alimentos de calidad, no sobrealimentar, agua en buen estado.',
    severity: 'medium',
  },
  {
    name: 'Hexamita / Agujero en la cabeza',
    symptoms: ['No come', 'Pérdida de color', 'Letargia'],
    description: 'Parásito interno (Hexamita spp.) asociado a peces cíclidos que produce erosiones en la cabeza y línea lateral. Agravado por deficiencias nutricionales.',
    treatment: 'Metronidazol (Flagyl) en el agua o en alimentos, 250 mg/40L por 3 días. Mejorar dieta con vitaminas.',
    prevention: 'Dieta rica en vitaminas A y D, buena calidad de agua, evitar carbón activo continuo.',
    severity: 'medium',
  },
  {
    name: 'Lernaea / Anchor Worm',
    symptoms: ['Se rasca contra objetos', 'Puntos rojos', 'Letargia'],
    description: 'Parásito crustáceo visible a simple vista (2–20 mm) que se ancla en la piel causando úlceras, enrojecimiento e inflamación.',
    treatment: 'Extracción manual con pinzas bajo anestesia (clavo de olor), tratar la herida con agua oxigenada. Diflubenzurón o sal para el acuario.',
    prevention: 'Cuarentena de nuevos peces y plantas, inspección visual cuidadosa.',
    severity: 'medium',
  },
];

// ─── Symptoms & Prevention ─────────────────────────────────────────────────────

const SYMPTOMS = [
  'Manchas blancas', 'Aletas deshilachadas', 'Hinchazón abdominal', 'Ojos saltones',
  'Nada erráticamente', 'Se rasca contra objetos', 'Pérdida de color', 'No come',
  'Respiración rápida', 'Puntos rojos', 'Algodón/hongos', 'Letargia',
];

const PREVENTION_TIPS = [
  {
    icon: 'water-outline' as const,
    title: 'Cambios de agua regulares',
    desc: 'Realiza cambios del 20–30% semanalmente para eliminar toxinas y mantener parámetros estables.',
    color: COLORS.primary,
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Cuarentena obligatoria',
    desc: 'Aísla todo pez nuevo durante al menos 4 semanas antes de introducirlo en el acuario principal.',
    color: COLORS.success,
  },
  {
    icon: 'thermometer-outline' as const,
    title: 'Parámetros estables',
    desc: 'Monitorea temperatura, pH y dureza regularmente. Las fluctuaciones debilitan el sistema inmune.',
    color: COLORS.warning,
  },
  {
    icon: 'nutrition-outline' as const,
    title: 'Dieta equilibrada',
    desc: 'Ofrece alimentos variados y de calidad. No sobrealimentes — los restos pudren el agua.',
    color: '#7052C8',
  },
  {
    icon: 'eye-outline' as const,
    title: 'Observación diaria',
    desc: 'Dedica unos minutos cada día a observar el comportamiento y apariencia de tus peces.',
    color: COLORS.textSecondary,
  },
];

const SEVERITY_COLOR: Record<Severity, string> = {
  low: COLORS.success,
  medium: COLORS.warning,
  high: COLORS.error,
};

const SEVERITY_LABEL: Record<Severity, string> = {
  low: 'Leve',
  medium: 'Moderada',
  high: 'Grave',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function DiseaseCard({ disease, expanded, onToggle }: {
  disease: Disease;
  expanded: boolean;
  onToggle: () => void;
}) {
  const sevColor = SEVERITY_COLOR[disease.severity];
  return (
    <TouchableOpacity style={styles.diseaseCard} onPress={onToggle} activeOpacity={0.85}>
      <View style={styles.diseaseCardTop}>
        <View style={[styles.severityDot, { backgroundColor: sevColor }]} />
        <Text style={styles.diseaseCardName} numberOfLines={expanded ? undefined : 1}>{disease.name}</Text>
        <View style={[styles.severityBadge, { backgroundColor: sevColor + '22' }]}>
          <Text style={[styles.severityBadgeText, { color: sevColor }]}>{SEVERITY_LABEL[disease.severity]}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.textMuted}
        />
      </View>

      {expanded && (
        <View style={styles.diseaseCardBody}>
          <Text style={styles.diseaseDesc}>{disease.description}</Text>

          <View style={styles.diseaseSection}>
            <View style={styles.diseaseSectionHeader}>
              <Ionicons name="medkit-outline" size={14} color={COLORS.primary} />
              <Text style={styles.diseaseSectionTitle}>Tratamiento</Text>
            </View>
            <Text style={styles.diseaseSectionText}>{disease.treatment}</Text>
          </View>

          <View style={styles.diseaseSection}>
            <View style={styles.diseaseSectionHeader}>
              <Ionicons name="shield-outline" size={14} color={COLORS.success} />
              <Text style={[styles.diseaseSectionTitle, { color: COLORS.success }]}>Prevención</Text>
            </View>
            <Text style={styles.diseaseSectionText}>{disease.prevention}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function HealthScreen({ navigation }: any) {
  const { fish: fishDatabase } = useFishDatabase();
  const { selectedAquarium } = useAquariums();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [expandedDisease, setExpandedDisease] = useState<string | null>(null);

  const fishAtRisk = useMemo(() => {
    if (!selectedAquarium || !fishDatabase.length) return [];
    return selectedAquarium.fish
      .map(entry => fishDatabase.find(f => f.id === entry.fishId))
      .filter((f): f is NonNullable<typeof f> => !!f && !!(f.common_diseases?.length));
  }, [selectedAquarium, fishDatabase]);

  const matchingDiseases = useMemo(() => {
    if (!selectedSymptoms.length) return [];
    return DISEASE_DATABASE.filter(d =>
      selectedSymptoms.some(s => d.symptoms.includes(s))
    ).sort((a, b) => {
      const scoreA = selectedSymptoms.filter(s => a.symptoms.includes(s)).length;
      const scoreB = selectedSymptoms.filter(s => b.symptoms.includes(s)).length;
      return scoreB - scoreA;
    });
  }, [selectedSymptoms]);

  function toggleSymptom(sym: string) {
    setSelectedSymptoms(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  }

  function toggleDisease(name: string) {
    setExpandedDisease(prev => prev === name ? null : name);
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="medkit" size={28} color={COLORS.white} />
          </View>
          <Text style={styles.headerTitle}>Salud y Enfermedades</Text>
          <Text style={styles.headerSubtitle}>Diagnóstico y prevención</Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Section 1: Fish at risk ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="fish-outline" size={18} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Tus peces en riesgo</Text>
          </View>

          {fishAtRisk.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={32} color={COLORS.success} />
              <Text style={styles.emptyCardTitle}>Todo en orden</Text>
              <Text style={styles.emptyCardSub}>
                {selectedAquarium
                  ? 'Los peces de tu acuario no tienen enfermedades registradas.'
                  : 'Selecciona un acuario para ver el estado de tus peces.'}
              </Text>
            </View>
          ) : (
            fishAtRisk.map(fish => (
              <View key={fish.id} style={styles.fishRiskCard}>
                <View style={styles.fishRiskHeader}>
                  <View style={styles.fishRiskIcon}>
                    <Ionicons name="fish" size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.fishRiskInfo}>
                    <Text style={styles.fishRiskName}>{fish.common_name}</Text>
                    <Text style={styles.fishRiskSci}>{fish.scientific_name}</Text>
                  </View>
                </View>
                <View style={styles.diseasePills}>
                  {fish.common_diseases!.map((d, i) => (
                    <View key={i} style={styles.diseasePill}>
                      <Text style={styles.diseasePillText} numberOfLines={1}>{d}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Section 2: Quick diagnosis ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="search-outline" size={18} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Diagnóstico rápido</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Selecciona los síntomas que observas</Text>

          <View style={styles.symptomsGrid}>
            {SYMPTOMS.map(sym => {
              const active = selectedSymptoms.includes(sym);
              return (
                <TouchableOpacity
                  key={sym}
                  style={[styles.symptomChip, active && styles.symptomChipActive]}
                  onPress={() => toggleSymptom(sym)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.symptomChipText, active && styles.symptomChipTextActive]}>
                    {sym}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedSymptoms.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setSelectedSymptoms([])}>
              <Ionicons name="close-circle-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.clearBtnText}>Limpiar selección</Text>
            </TouchableOpacity>
          )}

          {selectedSymptoms.length > 0 && (
            <View style={styles.resultsBlock}>
              <View style={styles.resultsHeader}>
                <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
                <Text style={styles.resultsTitle}>
                  {matchingDiseases.length
                    ? `${matchingDiseases.length} posible${matchingDiseases.length > 1 ? 's' : ''} enfermedad${matchingDiseases.length > 1 ? 'es' : ''}`
                    : 'Sin coincidencias exactas'}
                </Text>
              </View>

              {matchingDiseases.length === 0 ? (
                <Text style={styles.noMatchText}>
                  No encontramos enfermedades con esa combinación de síntomas. Consulta a un veterinario especialista.
                </Text>
              ) : (
                matchingDiseases.map(disease => {
                  const matchCount = selectedSymptoms.filter(s => disease.symptoms.includes(s)).length;
                  return (
                    <View key={disease.name}>
                      <View style={styles.matchScoreRow}>
                        <Text style={styles.matchScore}>
                          {matchCount}/{disease.symptoms.length} síntomas coinciden
                        </Text>
                      </View>
                      <DiseaseCard
                        disease={disease}
                        expanded={expandedDisease === disease.name}
                        onToggle={() => toggleDisease(disease.name)}
                      />
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>

        {/* ── Section 3: General prevention ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Prevención general</Text>
          </View>

          {PREVENTION_TIPS.map((tip, i) => (
            <View key={i} style={styles.preventionCard}>
              <View style={[styles.preventionIconWrap, { backgroundColor: tip.color + '1A' }]}>
                <Ionicons name={tip.icon} size={22} color={tip.color} />
              </View>
              <View style={styles.preventionContent}>
                <Text style={styles.preventionTitle}>{tip.title}</Text>
                <Text style={styles.preventionDesc}>{tip.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.disclaimerText}>
            Esta información es orientativa. Ante enfermedad grave consulta a un veterinario especialista en peces.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingTop: 52,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.screen,
  },
  backBtn: {
    marginBottom: SPACING.sm,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: COLORS.white,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },

  scrollContent: {
    paddingBottom: 48,
  },

  section: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: FONTS.sansBd,
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },

  emptyCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontFamily: FONTS.sansSb,
    color: COLORS.success,
  },
  emptyCardSub: {
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  fishRiskCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  fishRiskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  fishRiskIcon: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fishRiskInfo: {
    flex: 1,
  },
  fishRiskName: {
    fontSize: 15,
    fontFamily: FONTS.sansSb,
    color: COLORS.text,
  },
  fishRiskSci: {
    fontSize: 11,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  diseasePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  diseasePill: {
    backgroundColor: COLORS.error + '18',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.error + '33',
    maxWidth: '100%',
  },
  diseasePillText: {
    fontSize: 11,
    fontFamily: FONTS.sansSb,
    color: COLORS.error,
  },

  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  symptomChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  symptomChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  symptomChipText: {
    fontSize: 13,
    fontFamily: FONTS.sansSb,
    color: COLORS.textSecondary,
  },
  symptomChipTextActive: {
    color: COLORS.white,
  },

  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  clearBtnText: {
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
  },

  resultsBlock: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultsTitle: {
    fontSize: 14,
    fontFamily: FONTS.sansBd,
    color: COLORS.text,
  },
  noMatchText: {
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  matchScoreRow: {
    marginBottom: 4,
  },
  matchScore: {
    fontSize: 11,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
  },

  diseaseCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  diseaseCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
  },
  diseaseCardName: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.sansSb,
    color: COLORS.text,
  },
  severityBadge: {
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  severityBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.sansBd,
  },
  diseaseCardBody: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  diseaseDesc: {
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  diseaseSection: {
    gap: 4,
  },
  diseaseSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  diseaseSectionTitle: {
    fontSize: 12,
    fontFamily: FONTS.sansBd,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diseaseSectionText: {
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  preventionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  preventionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preventionContent: {
    flex: 1,
    gap: 4,
  },
  preventionTitle: {
    fontSize: 14,
    fontFamily: FONTS.sansSb,
    color: COLORS.text,
  },
  preventionDesc: {
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginHorizontal: SPACING.screen,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
});
