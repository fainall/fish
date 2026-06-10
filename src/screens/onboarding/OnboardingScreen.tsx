import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Animated, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { CYCLING_EXPLANATION, ExperienceLevel } from '../../constants/tips';
import { useUserProfile, calculateVolume, AquariumProfile } from '../../hooks/useUserProfile';
import { useAquariums } from '../../hooks/useAquariums';
import { WaterType, AquariumStyle } from '../../types';
import { STYLES_BY_WATER } from '../../data/aquariumStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Step definitions ──────────────────────────────────────────────────────────

type StepId =
  | 'welcome'
  | 'experience'
  // Beginner
  | 'b_has_aquarium'
  | 'b_knows_cycling'
  | 'b_cycling_explanation'
  | 'b_aquarium_size'
  | 'b_water_type'
  | 'b_fish_interest'
  // Intermediate
  | 'i_tank_count'
  | 'i_goals'
  | 'i_aquarium_size'
  | 'i_water_type'
  // Advanced
  | 'a_breeding_exp'
  | 'a_water_types'
  | 'a_aquarium_size'
  // Shared
  | 'aquarium_style'
  | 'summary';

interface OnboardingState {
  experience: ExperienceLevel | null;
  has_aquarium: boolean | null;
  knows_cycling: boolean | null;
  show_cycling_explanation: boolean;
  tank_count: number | null;
  goals: string[];
  length: string;
  width: string;
  height: string;
  water_type: WaterType;
  breeding_experience: boolean | null;
  water_types: WaterType[];
  fish_interests: string[];
  aquarium_style: AquariumStyle | null;
}

const INITIAL_STATE: OnboardingState = {
  experience: null,
  has_aquarium: null,
  knows_cycling: null,
  show_cycling_explanation: false,
  tank_count: null,
  goals: [],
  length: '',
  width: '',
  height: '',
  water_type: 'freshwater',
  breeding_experience: null,
  water_types: ['freshwater'],
  fish_interests: [],
  aquarium_style: null,
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100;
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.progressText}>{current}/{total}</Text>
    </View>
  );
}

function OptionCard({
  icon, label, sublabel, selected, onPress, color,
}: {
  icon: string; label: string; sublabel?: string;
  selected: boolean; onPress: () => void; color?: string;
}) {
  const c = color || COLORS.primary;
  return (
    <TouchableOpacity
      style={[styles.optionCard, selected && { borderColor: c, backgroundColor: c + '18' }]}
      onPress={onPress}
    >
      <Text style={styles.optionIcon}>{icon}</Text>
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, selected && { color: c }]}>{label}</Text>
        {sublabel && <Text style={styles.optionSublabel}>{sublabel}</Text>}
      </View>
      <View style={[styles.optionCheck, selected && { backgroundColor: c, borderColor: c }]}>
        {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
    </TouchableOpacity>
  );
}

function MultiOptionCard({
  icon, label, selected, onPress, color,
}: {
  icon: string; label: string; selected: boolean; onPress: () => void; color?: string;
}) {
  const c = color || COLORS.primary;
  return (
    <TouchableOpacity
      style={[styles.multiChip, selected && { borderColor: c, backgroundColor: c + '22' }]}
      onPress={onPress}
    >
      <Text>{icon}</Text>
      <Text style={[styles.multiChipText, selected && { color: c }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function CyclingExplanation() {
  return (
    <View style={styles.cyclingBox}>
      {CYCLING_EXPLANATION.steps.map((step, i) => (
        <View key={i} style={styles.cyclingStep}>
          <Text style={styles.cyclingEmoji}>{step.emoji}</Text>
          <Text style={styles.cyclingText}>{step.text}</Text>
        </View>
      ))}
      <View style={styles.cyclingConclusion}>
        <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
        <Text style={styles.cyclingConclusionText}>{CYCLING_EXPLANATION.conclusion}</Text>
      </View>
    </View>
  );
}

function AquariumSizeStep({
  state, onChange,
}: {
  state: OnboardingState;
  onChange: (field: 'length' | 'width' | 'height', value: string) => void;
}) {
  const vol = (state.length && state.width && state.height)
    ? calculateVolume(+state.length, +state.width, +state.height)
    : null;

  const getSizeLabel = (liters: number) => {
    if (liters < 30) return { label: 'Nano', color: COLORS.textMuted, emoji: '🔬' };
    if (liters < 80) return { label: 'Pequeño', color: COLORS.primary, emoji: '🐟' };
    if (liters < 200) return { label: 'Mediano', color: COLORS.success, emoji: '🐠' };
    if (liters < 400) return { label: 'Grande', color: COLORS.warning, emoji: '🦈' };
    return { label: 'XL / Showpiece', color: '#ab47bc', emoji: '🌊' };
  };

  const sizeInfo = vol ? getSizeLabel(vol) : null;

  return (
    <View>
      <View style={styles.dimensionsRow}>
        {(['length', 'width', 'height'] as const).map((field, i) => (
          <View key={field} style={styles.dimensionField}>
            <Text style={styles.dimensionLabel}>
              {['Largo', 'Ancho', 'Alto'][i]}
            </Text>
            <TextInput
              style={styles.dimensionInput}
              value={state[field]}
              onChangeText={v => onChange(field, v.replace(/[^0-9]/g, ''))}
              placeholder="cm"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        ))}
      </View>
      {vol !== null && vol > 0 && (
        <View style={[styles.volumeResult, { borderColor: sizeInfo!.color }]}>
          <Text style={styles.volumeEmoji}>{sizeInfo!.emoji}</Text>
          <View>
            <Text style={[styles.volumeNumber, { color: sizeInfo!.color }]}>{vol} litros</Text>
            <Text style={styles.volumeLabel}>{sizeInfo!.label}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color={sizeInfo!.color} />
        </View>
      )}
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { completeOnboarding } = useUserProfile();
  const { aquariums, addAquarium } = useAquariums();
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [stepHistory, setStepHistory] = useState<StepId[]>(['welcome']);
  const currentStep = stepHistory[stepHistory.length - 1];

  const update = (patch: Partial<OnboardingState>) =>
    setState(prev => ({ ...prev, ...patch }));

  const goTo = (step: StepId) => setStepHistory(h => [...h, step]);
  const goBack = () => setStepHistory(h => h.length > 1 ? h.slice(0, -1) : h);

  // Calculate total steps and current index for progress bar
  const totalSteps = state.experience === 'beginner' ? 7
    : state.experience === 'intermediate' ? 6
    : state.experience === 'advanced' ? 6 : 2;
  const stepIndex = stepHistory.length;

  const handleFinish = async () => {
    const vol = (state.length && state.width && state.height)
      ? calculateVolume(+state.length, +state.width, +state.height) : null;

    const aquarium: AquariumProfile | null = vol ? {
      length_cm: +state.length,
      width_cm: +state.width,
      height_cm: +state.height,
      volume_liters: vol,
      water_type: state.water_type,
      aquarium_style: state.aquarium_style ?? undefined,
    } : null;

    // Save profile data (experience, cycling knowledge, etc.)
    await completeOnboarding({
      experience: state.experience!,
      knows_cycling: state.knows_cycling,
      has_aquarium: state.has_aquarium ?? false,
      aquarium,
      goals: state.goals,
      water_types: state.water_types,
    });

    // Create aquarium entry — only if the user provided dimensions AND has no aquariums yet.
    // (If they already have aquariums from a previous session we don't add duplicates.)
    if (aquarium && aquariums.length === 0) {
      const styleLabels: Record<string, string> = {
        amazonico: 'Amazónico', tropical: 'Tropical', agua_fria: 'Agua Fría',
        plantado: 'Plantado', africano: 'Africano', comunitario: 'Comunitario',
        marino: 'Marino', arrecife: 'Arrecife', salobre: 'Salobre',
      };
      const styleName = aquarium.aquarium_style
        ? styleLabels[aquarium.aquarium_style] ?? 'Mi Acuario'
        : 'Mi Acuario';
      await addAquarium({
        name:           styleName,
        volume_liters:  aquarium.volume_liters,
        length_cm:      aquarium.length_cm,
        width_cm:       aquarium.width_cm,
        height_cm:      aquarium.height_cm,
        water_type:     aquarium.water_type,
        aquarium_style: aquarium.aquarium_style,
        description:    '',
      });
    }
  };

  const toggleGoal = (goal: string) => {
    update({
      goals: state.goals.includes(goal)
        ? state.goals.filter(g => g !== goal)
        : [...state.goals, goal],
    });
  };

  // ─── Render each step ────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (currentStep) {

      case 'welcome':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.bigEmoji}>🐠</Text>
            <Text style={styles.stepTitle}>Bienvenido a Aquaria</Text>
            <Text style={styles.stepBody}>
              Vamos a personalizar tu experiencia con unas pocas preguntas.{'\n'}
              Solo tomará 2 minutos.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => goTo('experience')}>
              <Text style={styles.primaryBtnText}>Comenzar</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case 'experience':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuál es tu experiencia con acuarios?</Text>
            <Text style={styles.stepBody}>Esto nos ayuda a darte los mejores consejos.</Text>
            {[
              { value: 'beginner' as ExperienceLevel, icon: '🌱', label: 'Principiante', sublabel: 'Nunca tuve acuario o tengo menos de 1 año', color: COLORS.success },
              { value: 'intermediate' as ExperienceLevel, icon: '🎯', label: 'Intermedio', sublabel: 'Llevo 1-3 años, mantengo peces exitosamente', color: COLORS.primary },
              { value: 'advanced' as ExperienceLevel, icon: '🏆', label: 'Avanzado', sublabel: 'Múltiples acuarios, cría peces o marinos', color: COLORS.warning },
            ].map(opt => (
              <OptionCard
                key={opt.value}
                icon={opt.icon}
                label={opt.label}
                sublabel={opt.sublabel}
                selected={state.experience === opt.value}
                color={opt.color}
                onPress={() => update({ experience: opt.value })}
              />
            ))}
            {state.experience && (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => {
                if (state.experience === 'beginner') goTo('b_has_aquarium');
                else if (state.experience === 'intermediate') goTo('i_tank_count');
                else goTo('a_breeding_exp');
              }}>
                <Text style={styles.primaryBtnText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        );

      // ── BEGINNER PATH ──────────────────────────────────────────────────────

      case 'b_has_aquarium':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Ya tienes un acuario?</Text>
            {[
              { val: true, icon: '🐟', label: 'Sí, ya tengo uno', sublabel: 'Voy a ingresar mis medidas' },
              { val: false, icon: '💭', label: 'Todavía no', sublabel: 'Estoy planificando' },
            ].map(opt => (
              <OptionCard
                key={String(opt.val)}
                icon={opt.icon}
                label={opt.label}
                sublabel={opt.sublabel}
                selected={state.has_aquarium === opt.val}
                onPress={() => update({ has_aquarium: opt.val })}
              />
            ))}
            {state.has_aquarium !== null && (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => goTo('b_knows_cycling')}>
                <Text style={styles.primaryBtnText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        );

      case 'b_knows_cycling':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Conoces el proceso de ciclado del acuario?</Text>
            <Text style={styles.stepBody}>El ciclado es uno de los conceptos más importantes de la acuarística.</Text>
            {[
              { val: true, icon: '✅', label: 'Sí, lo conozco bien' },
              { val: null, icon: '🤔', label: 'Lo he escuchado pero no entiendo bien' },
              { val: false, icon: '❓', label: 'No, nunca lo he escuchado' },
            ].map(opt => (
              <OptionCard
                key={String(opt.val)}
                icon={opt.icon}
                label={opt.label}
                selected={state.knows_cycling === opt.val && !(opt.val === null && state.knows_cycling === null && state.experience === null)}
                onPress={() => {
                  update({ knows_cycling: opt.val as any });
                }}
              />
            ))}
            {state.knows_cycling !== undefined && (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => {
                if (state.knows_cycling === false || state.knows_cycling === null) {
                  goTo('b_cycling_explanation');
                } else {
                  goTo(state.has_aquarium ? 'b_aquarium_size' : 'b_water_type');
                }
              }}>
                <Text style={styles.primaryBtnText}>
                  {state.knows_cycling === false || state.knows_cycling === null ? 'Aprende qué es →' : 'Continuar'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        );

      case 'b_cycling_explanation':
        return (
          <ScrollView contentContainerStyle={styles.stepContainer}>
            <View style={styles.explainHeader}>
              <Text style={styles.bigEmoji}>🔄</Text>
              <Text style={styles.stepTitle}>{CYCLING_EXPLANATION.title}</Text>
            </View>
            <CyclingExplanation />
            <View style={styles.tipBox}>
              <Ionicons name="bulb-outline" size={18} color={COLORS.warning} />
              <Text style={styles.tipBoxText}>
                En la app encontrarás una guía completa sobre el ciclado y podrás hacer seguimiento de tus parámetros.
              </Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => {
              update({ knows_cycling: false });
              goTo(state.has_aquarium ? 'b_aquarium_size' : 'b_water_type');
            }}>
              <Text style={styles.primaryBtnText}>Entendido, continuar</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </ScrollView>
        );

      case 'b_aquarium_size':
        const bVol = (state.length && state.width && state.height)
          ? calculateVolume(+state.length, +state.width, +state.height) : 0;
        return (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.stepContainer}>
              <Text style={styles.stepTitle}>
                {state.has_aquarium ? 'Dimensiones de tu acuario' : '¿Qué tamaño estás planeando?'}
              </Text>
              <Text style={styles.stepBody}>Ingresa las medidas internas en centímetros.</Text>
              <AquariumSizeStep state={state} onChange={(f, v) => update({ [f]: v })} />
              <TouchableOpacity
                style={[styles.primaryBtn, bVol < 1 && styles.primaryBtnDisabled]}
                disabled={bVol < 1}
                onPress={() => goTo('b_water_type')}
              >
                <Text style={styles.primaryBtnText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={() => goTo('b_water_type')}>
                <Text style={styles.skipBtnText}>Saltar por ahora</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        );

      case 'b_water_type':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Qué tipo de agua te interesa?</Text>
            {[
              { val: 'freshwater' as WaterType, icon: '💧', label: 'Agua dulce', sublabel: 'Tetras, Bettas, Corydoras...' },
              { val: 'saltwater' as WaterType, icon: '🌊', label: 'Agua salada (marino)', sublabel: 'Pez payaso, cirujano...' },
              { val: 'brackish' as WaterType, icon: '🌿', label: 'Agua salobre', sublabel: 'Mollies, fugu...' },
            ].map(opt => (
              <OptionCard
                key={opt.val}
                icon={opt.icon}
                label={opt.label}
                sublabel={opt.sublabel}
                selected={state.water_type === opt.val}
                onPress={() => update({ water_type: opt.val })}
              />
            ))}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => goTo('aquarium_style')}>
              <Text style={styles.primaryBtnText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case 'b_fish_interest':
        const fishOptions = [
          { val: 'colorful', icon: '🌈', label: 'Coloridos' },
          { val: 'community', icon: '👥', label: 'Comunitarios' },
          { val: 'big', icon: '🦈', label: 'Peces grandes' },
          { val: 'nano', icon: '🔬', label: 'Nano peces' },
          { val: 'plants', icon: '🌿', label: 'Con plantas' },
          { val: 'breeding', icon: '🥚', label: 'Para criar' },
        ];
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Qué tipo de peces te interesan?</Text>
            <Text style={styles.stepBody}>Selecciona todos los que quieras.</Text>
            <View style={styles.multiChipGrid}>
              {fishOptions.map(opt => (
                <MultiOptionCard
                  key={opt.val}
                  icon={opt.icon}
                  label={opt.label}
                  selected={state.fish_interests.includes(opt.val)}
                  onPress={() => update({
                    fish_interests: state.fish_interests.includes(opt.val)
                      ? state.fish_interests.filter(f => f !== opt.val)
                      : [...state.fish_interests, opt.val],
                  })}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => goTo('summary')}>
              <Text style={styles.primaryBtnText}>Ver mi resumen</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      // ── INTERMEDIATE PATH ──────────────────────────────────────────────────

      case 'i_tank_count':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuántos acuarios tienes actualmente?</Text>
            {[
              { val: 1, icon: '1️⃣', label: 'Uno' },
              { val: 2, icon: '2️⃣', label: 'Dos' },
              { val: 3, icon: '3️⃣', label: 'Tres o más' },
              { val: 0, icon: '💭', label: 'Ninguno aún' },
            ].map(opt => (
              <OptionCard
                key={opt.val}
                icon={opt.icon}
                label={opt.label}
                selected={state.tank_count === opt.val}
                onPress={() => update({ tank_count: opt.val })}
              />
            ))}
            {state.tank_count !== null && (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => goTo('i_goals')}>
                <Text style={styles.primaryBtnText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        );

      case 'i_goals':
        const goalOptions = [
          { val: 'parameters', icon: '🧪', label: 'Mejorar parámetros de agua' },
          { val: 'compatibility', icon: '🤝', label: 'Agregar nuevas especies' },
          { val: 'breeding', icon: '🥚', label: 'Reproducir peces' },
          { val: 'aquascape', icon: '🌿', label: 'Decoración / Aquascape' },
          { val: 'saltwater', icon: '🌊', label: 'Pasar a agua salada' },
          { val: 'health', icon: '💊', label: 'Tratar enfermedades' },
        ];
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuál es tu objetivo principal ahora?</Text>
            <Text style={styles.stepBody}>Puedes elegir varios.</Text>
            <View style={styles.multiChipGrid}>
              {goalOptions.map(opt => (
                <MultiOptionCard
                  key={opt.val}
                  icon={opt.icon}
                  label={opt.label}
                  selected={state.goals.includes(opt.val)}
                  onPress={() => toggleGoal(opt.val)}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => goTo('i_aquarium_size')}>
              <Text style={styles.primaryBtnText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case 'i_aquarium_size': {
        const iVol = (state.length && state.width && state.height)
          ? calculateVolume(+state.length, +state.width, +state.height) : 0;
        return (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.stepContainer}>
              <Text style={styles.stepTitle}>Dimensiones de tu acuario principal</Text>
              <Text style={styles.stepBody}>Medidas internas en centímetros.</Text>
              <AquariumSizeStep state={state} onChange={(f, v) => update({ [f]: v })} />
              <TouchableOpacity
                style={[styles.primaryBtn, iVol < 1 && styles.primaryBtnDisabled]}
                disabled={iVol < 1}
                onPress={() => goTo('i_water_type')}
              >
                <Text style={styles.primaryBtnText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={() => goTo('i_water_type')}>
                <Text style={styles.skipBtnText}>Saltar</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        );
      }

      case 'i_water_type':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Qué tipo de agua manejas?</Text>
            {[
              { val: 'freshwater' as WaterType, icon: '💧', label: 'Agua dulce' },
              { val: 'saltwater' as WaterType, icon: '🌊', label: 'Agua salada' },
              { val: 'brackish' as WaterType, icon: '🌿', label: 'Agua salobre' },
            ].map(opt => (
              <OptionCard
                key={opt.val}
                icon={opt.icon}
                label={opt.label}
                selected={state.water_type === opt.val}
                onPress={() => update({ water_type: opt.val })}
              />
            ))}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => goTo('aquarium_style')}>
              <Text style={styles.primaryBtnText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      // ── ADVANCED PATH ──────────────────────────────────────────────────────

      case 'a_breeding_exp':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Tienes experiencia en cría de peces?</Text>
            {[
              { val: true, icon: '🏆', label: 'Sí, he criado varias especies' },
              { val: false, icon: '🎯', label: 'No, quiero empezar a criarlos' },
            ].map(opt => (
              <OptionCard
                key={String(opt.val)}
                icon={opt.icon}
                label={opt.label}
                selected={state.breeding_experience === opt.val}
                onPress={() => update({ breeding_experience: opt.val })}
              />
            ))}
            {state.breeding_experience !== null && (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => goTo('a_water_types')}>
                <Text style={styles.primaryBtnText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        );

      case 'a_water_types':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Qué tipos de agua manejas?</Text>
            <Text style={styles.stepBody}>Selecciona todos los que apliquen.</Text>
            {[
              { val: 'freshwater' as WaterType, icon: '💧', label: 'Agua dulce' },
              { val: 'saltwater' as WaterType, icon: '🌊', label: 'Agua salada (marino)' },
              { val: 'brackish' as WaterType, icon: '🌿', label: 'Agua salobre' },
            ].map(opt => (
              <OptionCard
                key={opt.val}
                icon={opt.icon}
                label={opt.label}
                selected={state.water_types.includes(opt.val)}
                onPress={() => update({
                  water_types: state.water_types.includes(opt.val)
                    ? state.water_types.filter(w => w !== opt.val)
                    : [...state.water_types, opt.val],
                })}
              />
            ))}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => goTo('a_aquarium_size')}>
              <Text style={styles.primaryBtnText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case 'a_aquarium_size': {
        const aVol = (state.length && state.width && state.height)
          ? calculateVolume(+state.length, +state.width, +state.height) : 0;
        return (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.stepContainer}>
              <Text style={styles.stepTitle}>Dimensiones de tu acuario principal</Text>
              <AquariumSizeStep state={state} onChange={(f, v) => update({ [f]: v })} />
              <TouchableOpacity
                style={[styles.primaryBtn, aVol < 1 && styles.primaryBtnDisabled]}
                disabled={aVol < 1}
                onPress={() => goTo('summary')}
              >
                <Text style={styles.primaryBtnText}>Ver mi resumen</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={() => goTo('aquarium_style')}>
                <Text style={styles.skipBtnText}>Saltar</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        );
      }

      // ── AQUARIUM STYLE ─────────────────────────────────────────────────────

      case 'aquarium_style': {
        const filtered = STYLES_BY_WATER[state.water_type] ?? [];
        const nextStep = state.experience === 'beginner' ? 'b_fish_interest' : 'summary';

        return (
          <ScrollView contentContainerStyle={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Qué tipo de acuario tienes o quieres?</Text>
            <Text style={styles.stepBody}>Cada estilo tiene parámetros de agua recomendados específicos.</Text>
            {filtered.map(opt => (
              <OptionCard
                key={opt.id}
                icon={opt.icon}
                label={opt.label}
                sublabel={`${opt.params.temp_min}-${opt.params.temp_max}°C · pH ${opt.params.ph_min}-${opt.params.ph_max} · GH ${opt.params.gh_min}-${opt.params.gh_max}`}
                selected={state.aquarium_style === opt.id}
                color={opt.color}
                onPress={() => update({ aquarium_style: opt.id })}
              />
            ))}
            <TouchableOpacity
              style={[styles.primaryBtn, !state.aquarium_style && styles.primaryBtnDisabled]}
              disabled={!state.aquarium_style}
              onPress={() => goTo(nextStep)}
            >
              <Text style={styles.primaryBtnText}>
                {nextStep === 'b_fish_interest' ? 'Continuar' : 'Ver mi resumen'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={() => goTo(nextStep)}>
              <Text style={styles.skipBtnText}>Saltar por ahora</Text>
            </TouchableOpacity>
          </ScrollView>
        );
      }

      // ── SUMMARY ────────────────────────────────────────────────────────────

      case 'summary': {
        const vol = (state.length && state.width && state.height)
          ? calculateVolume(+state.length, +state.width, +state.height) : null;
        const expLabels = { beginner: '🌱 Principiante', intermediate: '🎯 Intermedio', advanced: '🏆 Avanzado' };
        const expColors = { beginner: COLORS.success, intermediate: COLORS.primary, advanced: COLORS.warning };

        return (
          <ScrollView contentContainerStyle={styles.stepContainer}>
            <Text style={styles.bigEmoji}>🎉</Text>
            <Text style={styles.stepTitle}>¡Todo listo!</Text>
            <Text style={styles.stepBody}>Así hemos configurado tu perfil:</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Ionicons name="trophy-outline" size={18} color={expColors[state.experience!]} />
                <Text style={styles.summaryLabel}>Nivel</Text>
                <Text style={[styles.summaryValue, { color: expColors[state.experience!] }]}>
                  {expLabels[state.experience!]}
                </Text>
              </View>
              {vol && (
                <View style={styles.summaryRow}>
                  <Ionicons name="cube-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.summaryLabel}>Acuario</Text>
                  <Text style={styles.summaryValue}>{vol} litros</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Ionicons name="water-outline" size={18} color={COLORS.primary} />
                <Text style={styles.summaryLabel}>Tipo de agua</Text>
                <Text style={styles.summaryValue}>
                  {{ freshwater: 'Dulce 💧', saltwater: 'Salada 🌊', brackish: 'Salobre 🌿' }[state.water_type]}
                </Text>
              </View>
              {state.aquarium_style && (
                <View style={styles.summaryRow}>
                  <Ionicons name="leaf-outline" size={18} color={COLORS.success} />
                  <Text style={styles.summaryLabel}>Estilo</Text>
                  <Text style={styles.summaryValue}>
                    {{ amazonico: '🌿 Amazónico', tropical: '🐠 Tropical', agua_fria: '❄️ Agua fría', plantado: '🌱 Plantado', africano: '🏔️ Africano', comunitario: '👥 Comunitario', marino: '🐡 Marino', arrecife: '🪸 Arrecife', salobre: '🌊 Salobre', biotopico: '🏞️ Biotópico' }[state.aquarium_style]}
                  </Text>
                </View>
              )}
              {state.experience === 'beginner' && state.knows_cycling === false && (
                <View style={[styles.summaryRow, styles.summaryHighlight]}>
                  <Ionicons name="bulb-outline" size={18} color={COLORS.warning} />
                  <Text style={[styles.summaryLabel, { flex: 1 }]}>
                    Te guiaremos paso a paso por el ciclado del acuario.
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
              <Text style={styles.finishBtnText}>Entrar a Aquaria</Text>
              <Ionicons name="fish" size={20} color="#fff" />
            </TouchableOpacity>
          </ScrollView>
        );
      }

      default:
        return null;
    }
  };

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD', '#EDF6FB']} style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        {stepHistory.length > 1 && currentStep !== 'summary' ? (
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <ProgressBar current={Math.min(stepIndex, totalSteps)} total={totalSteps} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  progressContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  progressTrack: { flex: 1, height: 4, backgroundColor: COLORS.backgroundLight, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  progressText: { color: COLORS.textMuted, fontSize: 11, minWidth: 28, textAlign: 'right', fontFamily: FONTS.sans },
  scrollContent: { flexGrow: 1 },
  stepContainer: { padding: SPACING.lg, paddingTop: SPACING.md },
  bigEmoji: { fontSize: 56, textAlign: 'center', marginBottom: SPACING.md },
  stepTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm, textAlign: 'center', fontFamily: FONTS.sansEb },
  stepBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: SPACING.lg, fontFamily: FONTS.sans },
  // Option cards
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 2, borderColor: COLORS.border,
  },
  optionIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  optionSublabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.sans },
  optionCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  // Multi chips
  multiChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  multiChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.full,
    paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 2, borderColor: COLORS.border,
  },
  multiChipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', fontFamily: FONTS.sansSb },
  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md, padding: 16, marginTop: SPACING.md,
  },
  primaryBtnDisabled: { backgroundColor: COLORS.backgroundLight },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, fontFamily: FONTS.sansEb },
  skipBtn: { alignItems: 'center', marginTop: SPACING.sm, padding: SPACING.sm },
  skipBtnText: { color: COLORS.textMuted, fontSize: 14, fontFamily: FONTS.sans },
  finishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.success, borderRadius: BORDER_RADIUS.md, padding: 18, marginTop: SPACING.lg,
  },
  finishBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17, fontFamily: FONTS.sansEb },
  // Cycling explanation
  explainHeader: { alignItems: 'center', marginBottom: SPACING.md },
  cyclingBox: {
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, gap: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cyclingStep: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  cyclingEmoji: { fontSize: 24, width: 36, textAlign: 'center' },
  cyclingText: { flex: 1, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, fontFamily: FONTS.sans },
  cyclingConclusion: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.warning + '22', borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm,
  },
  cyclingConclusionText: { flex: 1, color: COLORS.warning, fontSize: 12, lineHeight: 18, fontFamily: FONTS.sans },
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.primary + '18', borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.md,
  },
  tipBoxText: { flex: 1, color: COLORS.primary, fontSize: 12, lineHeight: 18, fontFamily: FONTS.sans },
  // Dimensions
  dimensionsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  dimensionField: { flex: 1, alignItems: 'center' },
  dimensionLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 4, fontFamily: FONTS.sans },
  dimensionInput: {
    width: '100%', backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm,
    color: COLORS.text, textAlign: 'center', fontSize: 18, fontWeight: 'bold',
    borderWidth: 1, borderColor: COLORS.border,
    fontFamily: FONTS.sansEb,
  },
  volumeResult: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, borderWidth: 2, marginBottom: SPACING.sm,
  },
  volumeEmoji: { fontSize: 28 },
  volumeNumber: { fontSize: 22, fontWeight: 'bold', fontFamily: FONTS.sansEb },
  volumeLabel: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.sans },
  // Summary
  summaryCard: {
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  summaryLabel: { color: COLORS.textMuted, fontSize: 13, width: 90, fontFamily: FONTS.sans },
  summaryValue: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600', fontFamily: FONTS.sansSb },
  summaryHighlight: {
    backgroundColor: COLORS.warning + '18', borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm, marginTop: 4,
  },
});
