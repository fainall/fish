import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Image as RNImage, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { FishImage as Image } from '../../components/FishImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, Layout } from 'react-native-reanimated';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { Fish, WaterType, FishSuggestion } from '../../types';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAuth } from '../../hooks/useAuth';
import { useFishDatabase } from '../../hooks/useFishDatabase';
import { useFishSuggestions } from '../../hooks/useFishSuggestions';
import { useWishlist } from '../../hooks/useWishlist';
import { getStyleInfo, getFishForStyle, styleFitScore } from '../../data/aquariumStyles';
import { checkCompatibility } from '../../utils/compatibility';

const WATER_TYPES: { label: string; value: WaterType | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: '💧 Dulce', value: 'freshwater' },
  { label: '🌊 Salada', value: 'saltwater' },
  { label: '🌿 Salobre', value: 'brackish' },
];

function AggressionBadge({ level }: { level: number }) {
  const color = level <= 2 ? COLORS.success : level <= 3 ? COLORS.warning : COLORS.error;
  const label = level <= 2 ? 'Pacífico' : level <= 3 ? 'Moderado' : 'Agresivo';
  return (
    <View style={[styles.badge, { backgroundColor: color + '33', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function FitBar({ score }: { score: number }) {
  const color = score >= 75 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.error;
  return (
    <View style={styles.fitBarRow}>
      <View style={styles.fitBarTrack}>
        <View style={[styles.fitBarFill, { width: `${score}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.fitBarLabel, { color }]}>{score}%</Text>
    </View>
  );
}

// ─── Fish detail modal ─────────────────────────────────────────────────────────

// Helper: render a section only if it has content
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: SPACING.lg }}>
      <Text style={styles.modalSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ParamRow({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <View style={styles.paramRow}>
      <Ionicons name={icon as any} size={16} color={COLORS.primary} />
      <Text style={styles.paramLabel}>{label}:</Text>
      <Text style={styles.paramValue}>{value}</Text>
    </View>
  );
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  beginner:     { label: 'Principiante',  color: COLORS.success, icon: '🌱' },
  intermediate: { label: 'Intermedio',    color: COLORS.warning, icon: '🔥' },
  advanced:     { label: 'Avanzado',      color: COLORS.warning, icon: '🏆' },
  expert:       { label: 'Experto',       color: COLORS.error,   icon: '🥇' },
};

const BREEDING_LABELS: Record<string, string> = {
  'egg-scatter':       'Esparcidor de huevos',
  'cave-spawner':      'Pone en cuevas',
  'mouthbrooder':      'Incubador bucal',
  'livebearer':        'Vivíparo',
  'bubble-nest':       'Nido de burbujas',
  'plant-spawner':     'Pone en plantas',
  'substrate-spawner': 'Pone en sustrato',
  'unknown':           'Desconocido',
};

const CONSERVATION_LABELS: Record<string, { label: string; color: string }> = {
  LC: { label: 'Preocupación menor',     color: COLORS.success },
  NT: { label: 'Casi amenazado',          color: COLORS.warning },
  VU: { label: 'Vulnerable',              color: COLORS.warning },
  EN: { label: 'En peligro',              color: COLORS.error },
  CR: { label: 'En peligro crítico',      color: COLORS.error },
  EW: { label: 'Extinto en estado salvaje', color: COLORS.error },
  EX: { label: 'Extinto',                 color: COLORS.error },
  DD: { label: 'Datos insuficientes',     color: COLORS.textMuted },
  NE: { label: 'No evaluado',             color: COLORS.textMuted },
};

function FishDetailModal({
  fish, visible, onClose, styleId,
}: {
  fish: Fish | null; visible: boolean; onClose: () => void; styleId?: string;
}) {
  const [showFullImage, setShowFullImage] = useState(false);

  if (!fish) return null;
  const score = styleId ? styleFitScore(styleId as any, fish) : null;
  const diff  = fish.difficulty ? DIFFICULTY_LABELS[fish.difficulty] : null;
  const cons  = fish.conservation_status ? CONSERVATION_LABELS[fish.conservation_status] : null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <ScrollView showsVerticalScrollIndicator={false}>
            {fish.image_url ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => setShowFullImage(true)}>
                <Image source={{ uri: fish.image_url }} style={styles.modalImage} resizeMode="cover" />
                <View style={styles.zoomHint}>
                  <Ionicons name="expand-outline" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.modalImagePlaceholder}>
                <Ionicons name="fish" size={60} color={COLORS.primary} />
              </View>
            )}

            {/* Fullscreen image viewer */}
            <Modal visible={showFullImage} transparent animationType="fade" onRequestClose={() => setShowFullImage(false)}>
              <View style={styles.fullImageOverlay}>
                <TouchableOpacity style={styles.fullImageClose} onPress={() => setShowFullImage(false)}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
                <Image
                  source={{ uri: fish.image_url! }}
                  style={styles.fullImageContent}
                  resizeMode="contain"
                />
                <Text style={styles.fullImageCaption}>{fish.common_name}</Text>
              </View>
            </Modal>
            <View style={styles.modalBody}>
              <Text style={styles.modalTitle}>{fish.common_name}</Text>
              <Text style={styles.modalScientific}>{fish.scientific_name}</Text>
              {fish.alt_names && fish.alt_names.length > 0 && (
                <Text style={[styles.modalScientific, { fontStyle: 'normal', marginTop: 4 }]}>
                  También conocido como: {fish.alt_names.join(', ')}
                </Text>
              )}

              {/* Top badges row */}
              <View style={styles.modalBadgesRow}>
                <AggressionBadge level={fish.aggression} />
                {diff && (
                  <View style={[styles.badge, { backgroundColor: diff.color + '22', borderColor: diff.color }]}>
                    <Text style={[styles.badgeText, { color: diff.color }]}>
                      {diff.icon} {diff.label}
                    </Text>
                  </View>
                )}
                {score !== null && (
                  <View style={[styles.badge, { backgroundColor: COLORS.primary + '22', borderColor: COLORS.primary }]}>
                    <Text style={[styles.badgeText, { color: COLORS.primary }]}>
                      {score}% compatible con tu acuario
                    </Text>
                  </View>
                )}
                {cons && (
                  <View style={[styles.badge, { backgroundColor: cons.color + '22', borderColor: cons.color }]}>
                    <Text style={[styles.badgeText, { color: cons.color }]}>
                      🌍 {cons.label}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.modalDescription}>{fish.description}</Text>

              {/* ── 🌍 Origen y hábitat ─────────────────────────────── */}
              <Section title="🌍 Origen y hábitat">
                <ParamRow label="Familia" icon="git-network-outline" value={fish.family + (fish.subfamily ? ` (${fish.subfamily})` : '')} />
                <ParamRow label="Origen" icon="globe-outline" value={fish.origin} />
                {fish.habitat && <ParamRow label="Hábitat" icon="leaf-outline" value={fish.habitat} />}
              </Section>

              {/* ── 📐 Físico ─────────────────────────────────────── */}
              <Section title="📐 Características físicas">
                <ParamRow label="Tamaño adulto" icon="resize-outline" value={`${fish.adult_size_cm} cm`} />
                {fish.juvenile_size_cm && (
                  <ParamRow label="Tamaño juvenil" icon="caret-down-outline" value={`${fish.juvenile_size_cm} cm`} />
                )}
                {fish.lifespan_years && (
                  <ParamRow label="Vida promedio" icon="time-outline" value={`${fish.lifespan_years} años`} />
                )}
                <ParamRow label="Nivel en la columna" icon="layers-outline" value={fish.water_level} />
                {fish.activity && (
                  <ParamRow label="Actividad" icon="moon-outline" value={
                    fish.activity === 'diurnal' ? 'Diurna' :
                    fish.activity === 'nocturnal' ? 'Nocturna' : 'Crepuscular'
                  } />
                )}
              </Section>

              {/* ── 💧 Parámetros del agua ────────────────────────── */}
              <Section title="💧 Parámetros del agua">
                <ParamRow label="Temperatura" icon="thermometer-outline" value={`${fish.temp_min} - ${fish.temp_max} °C`} />
                <ParamRow label="pH" icon="flask-outline" value={`${fish.ph_min} - ${fish.ph_max}`} />
                <ParamRow label="Dureza (GH)" icon="water-outline" value={`${fish.gh_min} - ${fish.gh_max} dGH`} />
                {fish.kh_min !== undefined && (
                  <ParamRow label="Carbonato (KH)" icon="prism-outline" value={`${fish.kh_min} - ${fish.kh_max} dKH`} />
                )}
                {fish.tds_min !== undefined && (
                  <ParamRow label="TDS" icon="speedometer-outline" value={`${fish.tds_min} - ${fish.tds_max} ppm`} />
                )}
                <ParamRow label="Tipo de agua" icon="color-fill-outline" value={
                  fish.water_type === 'freshwater' ? 'Dulce' :
                  fish.water_type === 'saltwater' ? 'Salada' : 'Salobre'
                } />
                {fish.salt_tolerant && (
                  <Text style={[styles.schoolingText, { color: COLORS.accent }]}>
                    🌊 Tolera adición moderada de sal (acuario salobre opcional)
                  </Text>
                )}
              </Section>

              {/* ── 🐠 Configuración del acuario ──────────────────── */}
              <Section title="🐠 Configuración del acuario">
                <ParamRow label="Tanque mínimo" icon="cube-outline" value={`${fish.min_tank_liters} L`} />
                {fish.ideal_tank_liters && (
                  <ParamRow label="Tanque ideal" icon="cube" value={`${fish.ideal_tank_liters} L`} />
                )}
                {fish.flow_preference && (
                  <ParamRow label="Corriente" icon="trending-up-outline" value={
                    fish.flow_preference === 'still' ? 'Quieta' :
                    fish.flow_preference === 'gentle' ? 'Suave' :
                    fish.flow_preference === 'moderate' ? 'Moderada' : 'Fuerte'
                  } />
                )}
                {fish.light_preference && (
                  <ParamRow label="Iluminación" icon="sunny-outline" value={
                    fish.light_preference === 'dim' ? 'Tenue' :
                    fish.light_preference === 'moderate' ? 'Moderada' : 'Intensa'
                  } />
                )}
                {fish.substrate_preference && (
                  <ParamRow label="Sustrato" icon="apps-outline" value={
                    fish.substrate_preference === 'sand' ? 'Arena fina' :
                    fish.substrate_preference === 'fine-gravel' ? 'Grava fina' :
                    fish.substrate_preference === 'gravel' ? 'Grava' :
                    fish.substrate_preference === 'bare-bottom' ? 'Sin sustrato' : 'Cualquiera'
                  } />
                )}
                {fish.needs_driftwood && (
                  <Text style={[styles.schoolingText, { color: COLORS.warning }]}>
                    🪵 Requiere madera (la roe para digestión)
                  </Text>
                )}
                {fish.needs_hiding && (
                  <Text style={[styles.schoolingText, { color: COLORS.primary }]}>
                    🏞 Necesita cuevas o escondites
                  </Text>
                )}
                {fish.plant_compatible === false && (
                  <Text style={[styles.schoolingText, { color: COLORS.error }]}>
                    🌱 No compatible con plantas (las desarraiga o come)
                  </Text>
                )}
              </Section>

              {/* ── 🍽 Alimentación ─────────────────────────────── */}
              <Section title="🍽 Alimentación">
                <Text style={styles.modalDescription}>{fish.diet}</Text>
                {fish.food_types && fish.food_types.length > 0 && (
                  <View style={[styles.tagsContainer, { marginTop: 8 }]}>
                    {fish.food_types.map(t => (
                      <View key={t} style={[styles.tag, { backgroundColor: COLORS.success + '22' }]}>
                        <Text style={[styles.tagText, { color: COLORS.success }]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {fish.feeding_frequency && (
                  <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8, fontFamily: FONTS.sans }}>
                    🕐 Frecuencia: {fish.feeding_frequency}
                  </Text>
                )}
              </Section>

              {/* ── 🐟 Comportamiento ────────────────────────────── */}
              <Section title="🐟 Comportamiento">
                {fish.is_schooling && (
                  <View style={styles.schoolingNote}>
                    <Ionicons name="people-outline" size={16} color={COLORS.warning} />
                    <Text style={styles.schoolingText}>
                      Cardumen mínimo: {fish.schooling_min ?? 6} individuos
                    </Text>
                  </View>
                )}
                {fish.behavior_notes && fish.behavior_notes.length > 0 && (
                  <View style={{ marginTop: 6, gap: 4 }}>
                    {fish.behavior_notes.map((n, i) => (
                      <Text key={i} style={{ fontSize: 13, color: COLORS.text, fontFamily: FONTS.sans }}>
                        • {n}
                      </Text>
                    ))}
                  </View>
                )}
              </Section>

              {/* ── ♀♂ Dimorfismo y reproducción ─────────────── */}
              {(fish.sexual_dimorphism || fish.breeding_method || fish.breeding_notes) && (
                <Section title="♀♂ Dimorfismo y reproducción">
                  {fish.sexual_dimorphism && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textMuted, fontFamily: FONTS.sansBd }}>
                        Diferencias macho/hembra:
                      </Text>
                      <Text style={{ fontSize: 13, color: COLORS.text, marginTop: 2, fontFamily: FONTS.sans }}>
                        {fish.sexual_dimorphism}
                      </Text>
                    </View>
                  )}
                  {fish.breeding_method && (
                    <ParamRow label="Método" icon="egg-outline" value={BREEDING_LABELS[fish.breeding_method]} />
                  )}
                  {fish.breeding_difficulty && (
                    <ParamRow label="Dificultad cría" icon="trending-up-outline"
                      value={'⭐'.repeat(fish.breeding_difficulty) + '☆'.repeat(5 - fish.breeding_difficulty)} />
                  )}
                  {fish.breeding_notes && (
                    <Text style={[styles.modalDescription, { marginTop: 6 }]}>{fish.breeding_notes}</Text>
                  )}
                </Section>
              )}

              {/* ── 🤝 Compañeros de tanque ───────────────────── */}
              {((fish.compatible_with && fish.compatible_with.length > 0) ||
                (fish.avoid_with && fish.avoid_with.length > 0)) && (
                <Section title="🤝 Compañeros de tanque">
                  {fish.compatible_with && fish.compatible_with.length > 0 && (
                    <>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.success, fontFamily: FONTS.sansBd, marginBottom: 4 }}>
                        ✅ Convive bien con
                      </Text>
                      <View style={styles.tagsContainer}>
                        {fish.compatible_with.map(t => (
                          <View key={t} style={[styles.tag, { backgroundColor: COLORS.success + '22' }]}>
                            <Text style={[styles.tagText, { color: COLORS.success }]}>{t}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                  {fish.avoid_with && fish.avoid_with.length > 0 && (
                    <>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.error, fontFamily: FONTS.sansBd, marginTop: 8, marginBottom: 4 }}>
                        ❌ Evitar con
                      </Text>
                      <View style={styles.tagsContainer}>
                        {fish.avoid_with.map(t => (
                          <View key={t} style={[styles.tag, { backgroundColor: COLORS.error + '22' }]}>
                            <Text style={[styles.tagText, { color: COLORS.error }]}>{t}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </Section>
              )}

              {/* ── 🏥 Salud ────────────────────────────────────── */}
              {fish.common_diseases && fish.common_diseases.length > 0 && (
                <Section title="🏥 Enfermedades comunes">
                  <View style={{ gap: 6 }}>
                    {fish.common_diseases.map((d, i) => (
                      <View key={i} style={[styles.schoolingNote, { backgroundColor: COLORS.warning + '14', borderColor: COLORS.warning + '44' }]}>
                        <Ionicons name="medkit-outline" size={14} color={COLORS.warning} />
                        <Text style={[styles.schoolingText, { color: COLORS.text }]}>{d}</Text>
                      </View>
                    ))}
                  </View>
                </Section>
              )}

              {/* ── 🧬 Variedades / morfos ─────────────────────── */}
              {fish.variants && fish.variants.length > 0 && (
                <Section title="🧬 Variedades disponibles">
                  <View style={styles.tagsContainer}>
                    {fish.variants.map(v => (
                      <View key={v} style={[styles.tag, { backgroundColor: COLORS.accent + '22' }]}>
                        <Text style={[styles.tagText, { color: COLORS.accent }]}>{v}</Text>
                      </View>
                    ))}
                  </View>
                </Section>
              )}

              {/* ── 🌍 Conservación y origen comercial ────────── */}
              {(fish.sourcing || fish.cites) && (
                <Section title="🌍 Conservación">
                  {fish.sourcing && (
                    <ParamRow label="Origen comercial" icon="storefront-outline" value={
                      fish.sourcing === 'wild'    ? 'Captura silvestre' :
                      fish.sourcing === 'captive' ? 'Cría en cautividad' : 'Ambos (wild & captive)'
                    } />
                  )}
                  {fish.cites && (
                    <ParamRow label="CITES" icon="alert-circle-outline" value={`Apéndice ${fish.cites}`} />
                  )}
                </Section>
              )}

              {/* Tags */}
              <Section title="🏷 Etiquetas">
                <View style={styles.tagsContainer}>
                  {fish.tags.map(tag => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </Section>

              <View style={{ height: SPACING.xl }} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Compact recommended card ─────────────────────────────────────────────────

function RecommendedCard({
  fish, score, onPress, selected, onSelect, compatMode,
}: {
  fish: Fish & { id: string };
  score: number;
  onPress: () => void;
  selected: boolean;
  onSelect: () => void;
  compatMode: boolean;
}) {
  const color = score >= 75 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.error;
  return (
    <TouchableOpacity
      style={[styles.recCard, selected && styles.recCardSelected]}
      onPress={compatMode ? onSelect : onPress}
      onLongPress={onPress}
    >
      {fish.image_url ? (
        <Image source={{ uri: fish.image_url }} style={styles.recImage} resizeMode="cover" />
      ) : (
        <View style={[styles.recImage, styles.recImagePlaceholder]}>
          <Ionicons name="fish" size={22} color={COLORS.primary} />
        </View>
      )}
      {compatMode && (
        <View style={[styles.recCheckbox, selected && styles.recCheckboxActive]}>
          {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
      )}
      <View style={styles.recBody}>
        <Text style={styles.recName} numberOfLines={1}>{fish.common_name}</Text>
        <View style={[styles.recScore, { backgroundColor: color + '22' }]}>
          <Text style={[styles.recScoreText, { color }]}>{score}% afinidad</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Standard fish card ────────────────────────────────────────────────────────
// Memoized so changing one card (eg. wishlist toggle) doesn't re-render all 119

const FishCard = React.memo(function FishCardImpl({
  fish, onPress, selected, onSelect, compatMode, isWishlisted, onToggleWishlist,
}: {
  fish: Fish & { id: string };
  onPress: () => void;
  selected: boolean;
  onSelect: () => void;
  compatMode: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, SHADOWS.sm, selected && styles.cardSelected]}
      onPress={compatMode ? onSelect : onPress}
      onLongPress={onPress}
    >
      {fish.image_url ? (
        <Image source={{ uri: fish.image_url }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Ionicons name="fish" size={32} color={COLORS.primary} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{fish.common_name}</Text>
        <Text style={styles.cardScientific}>{fish.scientific_name}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="thermometer-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{fish.temp_min}-{fish.temp_max}°C</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="resize-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{fish.adult_size_cm}cm</Text>
          </View>
          <AggressionBadge level={fish.aggression} />
          {/* Difficulty mini-badge from enriched data */}
          {fish.difficulty && (
            <View style={{
              paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6,
              marginLeft: 2,
              backgroundColor: (
                fish.difficulty === 'beginner' ? COLORS.success :
                fish.difficulty === 'intermediate' ? COLORS.warning :
                fish.difficulty === 'advanced' ? COLORS.warning : COLORS.error
              ) + '22',
            }}>
              <Text style={{ fontSize: 11 }}>
                {fish.difficulty === 'beginner' ? '🌱' :
                 fish.difficulty === 'intermediate' ? '🔥' :
                 fish.difficulty === 'advanced' ? '🏆' : '🥇'}
              </Text>
            </View>
          )}
          {/* Wild-caught indicator */}
          {fish.sourcing === 'wild' && (
            <View style={{ paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6,
              backgroundColor: COLORS.backgroundLight, marginLeft: 2 }}>
              <Text style={{ fontSize: 11 }}>🌿</Text>
            </View>
          )}
        </View>
      </View>
      {compatMode ? (
        <View style={[styles.checkbox, selected && styles.checkboxActive]}>
          {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {onToggleWishlist && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onToggleWishlist(); }}
              style={{ padding: 6 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isWishlisted ? 'heart' : 'heart-outline'}
                size={20}
                color={isWishlisted ? '#f72585' : COLORS.textMuted}
              />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─── Compatibility result panel ────────────────────────────────────────────────

function CompatibilityPanel({
  selected, onRemove,
}: {
  selected: (Fish & { id: string })[];
  onRemove: (id: string) => void;
}) {
  if (selected.length < 2) {
    return (
      <View style={styles.compatPanel}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="git-compare-outline" size={20} color={COLORS.primary} />
          <Text style={styles.compatHint}>
            Selecciona {2 - selected.length} pez{selected.length === 0 ? 'ces' : ''} más para verificar compatibilidad
          </Text>
        </View>
      </View>
    );
  }

  // Generate all pairs
  const pairs: { a: Fish; b: Fish; result: ReturnType<typeof checkCompatibility> }[] = [];
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      pairs.push({
        a: selected[i],
        b: selected[j],
        result: checkCompatibility(selected[i], selected[j]),
      });
    }
  }

  const resultColor = (r: string) =>
    r === 'compatible' ? COLORS.success : r === 'caution' ? COLORS.warning : COLORS.error;
  const resultIcon = (r: string) =>
    r === 'compatible' ? 'checkmark-circle' : r === 'caution' ? 'warning' : 'close-circle';
  const resultLabel = (r: string) =>
    r === 'compatible' ? 'Compatible' : r === 'caution' ? 'Con precaución' : 'Incompatible';

  return (
    <View style={styles.compatPanel}>
      {/* Selected chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compatChips}>
        {selected.map(f => (
          <TouchableOpacity key={f.id} style={styles.compatChip} onPress={() => onRemove(f.id)}>
            <Text style={styles.compatChipText} numberOfLines={1}>{f.common_name}</Text>
            <Ionicons name="close" size={12} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
        {pairs.map((p, i) => {
          const col   = resultColor(p.result.result);
          const score = p.result.paramScore;
          return (
            <View key={i} style={[styles.compatResult, { borderLeftColor: col }]}>
              <View style={styles.compatResultHeader}>
                <Ionicons name={resultIcon(p.result.result) as any} size={18} color={col} />
                <Text style={[styles.compatResultTitle, { color: col }]}>
                  {resultLabel(p.result.result)}
                </Text>
                <Text style={styles.compatPair}>
                  {p.a.common_name} + {p.b.common_name}
                </Text>
                <Text style={[styles.compatScore, { color: col }]}>{score}%</Text>
              </View>

              {/* Parameter badges */}
              <View style={styles.paramBadgeRow}>
                {([
                  { key: 'temp',  label: '🌡 Temp' },
                  { key: 'ph',    label: '⚗️ pH'   },
                  { key: 'gh',    label: '💧 GH'   },
                  { key: 'size',  label: '📏 Talla' },
                  { key: 'aggr',  label: '⚡ Carácter' },
                ] as const).map(({ key, label }) => {
                  const flag = p.result.params[key];
                  const fc   = flag === 'ok' ? COLORS.success : flag === 'narrow' || flag === 'caution' ? COLORS.warning : COLORS.error;
                  return (
                    <View key={key} style={[styles.paramBadgeSmall, { borderColor: fc + '88', backgroundColor: fc + '18' }]}>
                      <Text style={[styles.paramBadgeSmallText, { color: fc }]}>{label}</Text>
                    </View>
                  );
                })}
              </View>

              {p.result.reasons.slice(0, 2).map((reason, ri) => (
                <Text key={ri} style={styles.compatReason}>· {reason}</Text>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Suggest Fish Modal ────────────────────────────────────────────────────────

function SuggestFishModal({
  visible,
  onClose,
  userId,
  userName,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}) {
  const { addSuggestion } = useFishSuggestions();

  const [form, setForm] = useState({
    common_name: '', scientific_name: '', origin: '', family: '',
    description: '', image_url: '', notes: '',
    water_type: 'freshwater' as WaterType,
    temp_min: '', temp_max: '', ph_min: '', ph_max: '',
    gh_min: '', gh_max: '', adult_size_cm: '', min_tank_liters: '',
  });

  const patch = (key: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const num = (v: string) => { const n = parseFloat(v); return isNaN(n) ? undefined : n; };

  const handleSubmit = async () => {
    if (!form.common_name.trim() || !form.scientific_name.trim()) {
      Alert.alert('Campos requeridos', 'El nombre común y científico son obligatorios.');
      return;
    }
    await addSuggestion({
      user_id: userId,
      user_name: userName,
      common_name: form.common_name.trim(),
      scientific_name: form.scientific_name.trim(),
      family: form.family.trim() || undefined,
      origin: form.origin.trim() || undefined,
      description: form.description.trim() || undefined,
      image_url: form.image_url.trim() || undefined,
      notes: form.notes.trim() || undefined,
      water_type: form.water_type,
      temp_min: num(form.temp_min),
      temp_max: num(form.temp_max),
      ph_min: num(form.ph_min),
      ph_max: num(form.ph_max),
      gh_min: num(form.gh_min),
      gh_max: num(form.gh_max),
      adult_size_cm: num(form.adult_size_cm),
      min_tank_liters: num(form.min_tank_liters),
    });
    setForm({
      common_name: '', scientific_name: '', origin: '', family: '',
      description: '', image_url: '', notes: '',
      water_type: 'freshwater',
      temp_min: '', temp_max: '', ph_min: '', ph_max: '',
      gh_min: '', gh_max: '', adult_size_cm: '', min_tank_liters: '',
    });
    onClose();
    Alert.alert('¡Sugerencia enviada!', 'El administrador revisará tu propuesta. ¡Gracias por contribuir al catálogo!');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.suggestOverlay}>
          <View style={styles.suggestBox}>
            {/* Header */}
            <View style={styles.suggestHeader}>
              <View>
                <Text style={styles.suggestTitle}>💡 Sugerir especie</Text>
                <Text style={styles.suggestSubtitle}>El admin revisará tu propuesta antes de agregarla</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Required */}
              <Text style={styles.suggestSection}>🐟 Datos básicos *</Text>
              <View style={styles.suggestField}>
                <Text style={styles.suggestLabel}>Nombre común *</Text>
                <TextInput style={styles.suggestInput} value={form.common_name}
                  onChangeText={v => patch('common_name', v)} placeholder="Ej: Tetra cardenal"
                  placeholderTextColor={COLORS.textMuted} />
              </View>
              <View style={styles.suggestField}>
                <Text style={styles.suggestLabel}>Nombre científico *</Text>
                <TextInput style={styles.suggestInput} value={form.scientific_name}
                  onChangeText={v => patch('scientific_name', v)} placeholder="Ej: Paracheirodon axelrodi"
                  placeholderTextColor={COLORS.textMuted} autoCapitalize="words" />
              </View>
              <View style={styles.suggestField}>
                <Text style={styles.suggestLabel}>Familia</Text>
                <TextInput style={styles.suggestInput} value={form.family}
                  onChangeText={v => patch('family', v)} placeholder="Ej: Characidae"
                  placeholderTextColor={COLORS.textMuted} />
              </View>
              <View style={styles.suggestField}>
                <Text style={styles.suggestLabel}>Origen</Text>
                <TextInput style={styles.suggestInput} value={form.origin}
                  onChangeText={v => patch('origin', v)} placeholder="Ej: Amazonas, Brasil"
                  placeholderTextColor={COLORS.textMuted} />
              </View>

              {/* Water type */}
              <Text style={styles.suggestSection}>💧 Tipo de agua</Text>
              <View style={styles.selectorRow}>
                {(['freshwater', 'saltwater', 'brackish'] as WaterType[]).map(wt => (
                  <TouchableOpacity key={wt}
                    style={[styles.selectorBtn, form.water_type === wt && styles.selectorBtnActive]}
                    onPress={() => patch('water_type', wt)}>
                    <Text style={[styles.selectorBtnText, form.water_type === wt && styles.selectorBtnTextActive]}>
                      {wt === 'freshwater' ? '💧 Dulce' : wt === 'saltwater' ? '🌊 Salada' : '🌿 Salobre'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Parameters (optional) */}
              <Text style={styles.suggestSection}>🌡️ Parámetros (opcional)</Text>
              <Text style={styles.suggestHint}>Si no los conoces exactamente, déjalos en blanco — el admin los completará.</Text>
              <View style={styles.paramsGrid}>
                {[
                  { label: 'Temp mín °C', key: 'temp_min' }, { label: 'Temp máx °C', key: 'temp_max' },
                  { label: 'pH mín', key: 'ph_min' },         { label: 'pH máx', key: 'ph_max' },
                  { label: 'GH mín dGH', key: 'gh_min' },    { label: 'GH máx dGH', key: 'gh_max' },
                  { label: 'Tamaño cm', key: 'adult_size_cm' }, { label: 'Min litros', key: 'min_tank_liters' },
                ].map(({ label, key }) => (
                  <View key={key} style={styles.paramField}>
                    <Text style={styles.paramFieldLabel}>{label}</Text>
                    <TextInput style={styles.paramFieldInput}
                      value={form[key as keyof typeof form]}
                      onChangeText={v => patch(key as keyof typeof form, v)}
                      keyboardType="decimal-pad" placeholder="—"
                      placeholderTextColor={COLORS.textMuted} />
                  </View>
                ))}
              </View>

              {/* Description */}
              <Text style={styles.suggestSection}>📝 Descripción</Text>
              <TextInput style={[styles.suggestInput, { minHeight: 70, textAlignVertical: 'top' }]}
                value={form.description} onChangeText={v => patch('description', v)}
                placeholder="Características del pez, comportamiento, cuidados..."
                placeholderTextColor={COLORS.textMuted} multiline />

              {/* Image URL */}
              <View style={[styles.suggestField, { marginTop: SPACING.sm }]}>
                <Text style={styles.suggestLabel}>URL de imagen (opcional)</Text>
                <TextInput style={styles.suggestInput} value={form.image_url}
                  onChangeText={v => patch('image_url', v)} placeholder="https://..."
                  placeholderTextColor={COLORS.textMuted} autoCapitalize="none" keyboardType="url" />
              </View>

              {/* Notes */}
              <Text style={styles.suggestSection}>💬 ¿Por qué lo sugieres?</Text>
              <TextInput style={[styles.suggestInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={form.notes} onChangeText={v => patch('notes', v)}
                placeholder="Cuéntanos por qué sería una buena adición al catálogo..."
                placeholderTextColor={COLORS.textMuted} multiline />

              <View style={{ height: SPACING.lg }} />
            </ScrollView>

            {/* Actions */}
            <View style={styles.suggestActions}>
              <TouchableOpacity style={styles.suggestCancel} onPress={onClose}>
                <Text style={styles.suggestCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestSubmit} onPress={handleSubmit}>
                <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                <Text style={styles.suggestSubmitText}>Enviar sugerencia</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

type ScreenMode = 'catalog' | 'compat';

export default function FishCatalogScreen({ embedded, navigation }: { embedded?: boolean; navigation?: any } = {}) {
  const { fish: ALL_FISH } = useFishDatabase();
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const wishlist = useWishlist();
  const styleId = profile.aquarium?.aquarium_style;
  const styleInfo = getStyleInfo(styleId);

  const [mode, setMode] = useState<ScreenMode>('catalog');
  const [search, setSearch] = useState('');
  const [waterFilter, setWaterFilter] = useState<WaterType | 'all'>('all');
  const [selectedFish, setSelectedFish] = useState<(Fish & { id: string }) | null>(null);
  const [compatSelected, setCompatSelected] = useState<(Fish & { id: string })[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);

  // Advanced filters (#16) — collapsible panel
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tempRange, setTempRange] = useState<[number, number]>([18, 32]);  // °C
  const [phRange,   setPhRange]   = useState<[number, number]>([5.0, 9.0]);
  const [sizeMax,   setSizeMax]   = useState<number>(100); // cm
  const [aggression, setAggression] = useState<number | 'all'>('all'); // 1-5 max
  const [origin,    setOrigin]    = useState<string>('all');
  const [tankMin,   setTankMin]   = useState<number>(1000); // L max
  // Filters using enriched expert data
  const [difficulty, setDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced' | 'expert'>('all');
  const [sourcing,  setSourcing]   = useState<'all' | 'captive' | 'wild' | 'both'>('all');

  // Recommended fish (sorted by fit score)
  const recommendedFish = useMemo(() => {
    if (!styleId) return [];
    return getFishForStyle(styleId, ALL_FISH)
      .map(f => ({ fish: f, score: styleFitScore(styleId, f) }))
      .sort((a, b) => b.score - a.score);
  }, [styleId]);

  // Origins from current data — for the dropdown
  const originOptions = useMemo(() => {
    const set = new Set<string>();
    ALL_FISH.forEach(f => { if (f.origin) set.add(f.origin); });
    return ['all', ...Array.from(set).sort()];
  }, []);

  // Full catalog filtered (advanced)
  const filteredFish = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_FISH.filter(fish => {
      const matchSearch =
        q === '' ||
        fish.common_name.toLowerCase().includes(q) ||
        fish.scientific_name.toLowerCase().includes(q) ||
        fish.tags.some(t => t.toLowerCase().includes(q));
      const matchWater = waterFilter === 'all' || fish.water_type === waterFilter;
      // Advanced filters: fish must have its range INTERSECTING the user's range
      const matchTemp = fish.temp_max >= tempRange[0] && fish.temp_min <= tempRange[1];
      const matchPh   = fish.ph_max   >= phRange[0]   && fish.ph_min   <= phRange[1];
      const matchSize = fish.adult_size_cm <= sizeMax;
      const matchAgg  = aggression === 'all' || fish.aggression <= aggression;
      const matchOrig = origin === 'all' || fish.origin === origin;
      const matchTank = fish.min_tank_liters <= tankMin;
      // Expert-data filters (only filter when set; species without data pass through)
      const matchDiff = difficulty === 'all' || !fish.difficulty || fish.difficulty === difficulty;
      const matchSrc  = sourcing   === 'all' || !fish.sourcing   || fish.sourcing   === sourcing;
      return matchSearch && matchWater && matchTemp && matchPh && matchSize && matchAgg && matchOrig && matchTank && matchDiff && matchSrc;
    });
  }, [search, waterFilter, tempRange, phRange, sizeMax, aggression, origin, tankMin, difficulty, sourcing]);

  // Count of active advanced filters (for the badge on the toggle button)
  const activeAdvancedCount = useMemo(() => {
    let n = 0;
    if (tempRange[0] !== 18 || tempRange[1] !== 32) n++;
    if (phRange[0]   !== 5.0 || phRange[1]   !== 9.0) n++;
    if (sizeMax      !== 100) n++;
    if (aggression   !== 'all') n++;
    if (origin       !== 'all') n++;
    if (tankMin      !== 1000) n++;
    if (difficulty   !== 'all') n++;
    if (sourcing     !== 'all') n++;
    return n;
  }, [tempRange, phRange, sizeMax, aggression, origin, tankMin, difficulty, sourcing]);

  const resetAdvanced = useCallback(() => {
    setTempRange([18, 32]); setPhRange([5.0, 9.0]); setSizeMax(100);
    setAggression('all'); setOrigin('all'); setTankMin(1000);
    setDifficulty('all'); setSourcing('all');
  }, []);

  const toggleCompat = useCallback((fish: Fish & { id: string }) => {
    setCompatSelected(prev => {
      const exists = prev.find(f => f.id === fish.id);
      if (exists) return prev.filter(f => f.id !== fish.id);
      if (prev.length >= 6) return prev; // max 6 fish
      return [...prev, fish];
    });
  }, []);

  // O(1) lookup of selected compat ids
  const compatSelectedSet = useMemo(() => new Set(compatSelected.map(f => f.id)), [compatSelected]);
  const isCompatSelected = useCallback((id: string) => compatSelectedSet.has(id), [compatSelectedSet]);

  // Stable renderItem so memoized FishCard skips re-renders when nothing changed
  const renderFishItem = useCallback(({ item, index }: { item: Fish & { id: string }; index: number }) => (
    <Animated.View
      entering={FadeInRight.delay(Math.min(index, 6) * 35).duration(260)}
      layout={Layout.springify()}
    >
      <FishCard
        fish={item}
        onPress={() => setSelectedFish(item)}
        selected={compatSelectedSet.has(item.id)}
        onSelect={() => toggleCompat(item)}
        compatMode={mode === 'compat'}
        isWishlisted={wishlist.isInWishlist(item.id)}
        onToggleWishlist={() => wishlist.isInWishlist(item.id) ? wishlist.remove(item.id) : wishlist.add(item.id)}
      />
    </Animated.View>
  ), [mode, compatSelectedSet, toggleCompat, wishlist]);

  const Wrapper = (embedded ? View : LinearGradient) as React.ComponentType<any>;
  const wrapperProps = embedded ? { style: styles.container } : { colors: ['#EDF6FB', '#F4FAFD'], style: styles.container };

  return (
    <Wrapper {...wrapperProps}>

      {/* ── Header (hidden when embedded in ExploreScreen) ── */}
      {!embedded && (
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Catálogo de Peces</Text>
            {styleInfo && (
              <View style={styles.styleChip}>
                <Text style={{ fontSize: 12 }}>{styleInfo.icon}</Text>
                <Text style={[styles.styleChipText, { color: styleInfo.color }]}>{styleInfo.label}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Toolbar: compat button + style chip (always visible) ── */}
      <View style={styles.toolbar}>
        {embedded && styleInfo ? (
          <View style={styles.styleChip}>
            <Text style={{ fontSize: 12 }}>{styleInfo.icon}</Text>
            <Text style={[styles.styleChipText, { color: styleInfo.color }]}>{styleInfo.label}</Text>
          </View>
        ) : <View />}
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'compat' && styles.modeBtnActive]}
          onPress={() => {
            setMode(m => m === 'catalog' ? 'compat' : 'catalog');
            setCompatSelected([]);
          }}
        >
          <Ionicons name="git-compare-outline" size={16} color={mode === 'compat' ? '#fff' : COLORS.primary} />
          <Text style={[styles.modeBtnText, mode === 'compat' && { color: '#fff' }]}>
            {mode === 'compat' ? 'Salir' : 'Compatibilidad'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Compatibility mode hint ── */}
      {mode === 'compat' && (
        <View style={styles.compatModeBanner}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
          <Text style={styles.compatModeBannerText}>
            Toca los peces para seleccionarlos · Máx. 6 · Mantén para ver detalles
          </Text>
        </View>
      )}

      <FlatList
        data={filteredFish}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        // Performance — virtualization tuning for ~120 items with images
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
        updateCellsBatchingPeriod={40}
        ListHeaderComponent={
          <>
            {/* Search + filter (catalog mode only) */}
            {mode === 'catalog' && (
              <>
                <View style={styles.searchContainer}>
                  <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar por nombre o etiqueta..."
                    placeholderTextColor={COLORS.textMuted}
                  />
                  {search !== '' && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}
                  contentContainerStyle={{ paddingHorizontal: 0, gap: 8 }}>
                  {WATER_TYPES.map(({ label, value }) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.filterChip, waterFilter === value && styles.filterChipActive]}
                      onPress={() => setWaterFilter(value)}
                    >
                      <Text style={[styles.filterChipText, waterFilter === value && styles.filterChipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {/* Toggle filtros avanzados */}
                  <TouchableOpacity
                    style={[styles.filterChip, showAdvanced && styles.filterChipActive,
                            { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                    onPress={() => setShowAdvanced(v => !v)}
                  >
                    <Ionicons name="options-outline" size={14}
                      color={showAdvanced ? '#fff' : COLORS.primary} />
                    <Text style={[styles.filterChipText, showAdvanced && styles.filterChipTextActive]}>
                      Avanzado
                    </Text>
                    {activeAdvancedCount > 0 && (
                      <View style={{ backgroundColor: showAdvanced ? '#fff' : COLORS.primary,
                        borderRadius: 8, minWidth: 16, paddingHorizontal: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800',
                          color: showAdvanced ? COLORS.primary : '#fff', textAlign: 'center' }}>
                          {activeAdvancedCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </ScrollView>

                {/* Advanced filters panel */}
                {showAdvanced && (
                  <View style={advStyles.panel}>
                    <View style={advStyles.headerRow}>
                      <Text style={advStyles.title}>Filtros avanzados</Text>
                      {activeAdvancedCount > 0 && (
                        <TouchableOpacity onPress={resetAdvanced}>
                          <Text style={advStyles.reset}>Limpiar</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Temperature range */}
                    <Text style={advStyles.label}>🌡️ Temperatura: {tempRange[0]}°–{tempRange[1]}°C</Text>
                    <View style={advStyles.chipsRow}>
                      {[[18, 24], [22, 26], [24, 28], [26, 30], [18, 32]].map(([a, b]) => (
                        <TouchableOpacity key={`${a}-${b}`}
                          style={[advStyles.miniChip, tempRange[0] === a && tempRange[1] === b && advStyles.miniChipOn]}
                          onPress={() => setTempRange([a, b])}>
                          <Text style={[advStyles.miniChipText, tempRange[0] === a && tempRange[1] === b && advStyles.miniChipTextOn]}>
                            {a}–{b}°
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* pH range */}
                    <Text style={advStyles.label}>💧 pH: {phRange[0].toFixed(1)}–{phRange[1].toFixed(1)}</Text>
                    <View style={advStyles.chipsRow}>
                      {[[5.0, 6.5], [6.0, 7.0], [6.5, 7.5], [7.0, 8.0], [7.5, 8.5], [5.0, 9.0]].map(([a, b]) => (
                        <TouchableOpacity key={`${a}-${b}`}
                          style={[advStyles.miniChip, phRange[0] === a && phRange[1] === b && advStyles.miniChipOn]}
                          onPress={() => setPhRange([a, b])}>
                          <Text style={[advStyles.miniChipText, phRange[0] === a && phRange[1] === b && advStyles.miniChipTextOn]}>
                            {a.toFixed(1)}–{b.toFixed(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Adult size max */}
                    <Text style={advStyles.label}>📏 Tamaño máx: ≤ {sizeMax} cm</Text>
                    <View style={advStyles.chipsRow}>
                      {[3, 5, 8, 12, 20, 100].map(s => (
                        <TouchableOpacity key={s}
                          style={[advStyles.miniChip, sizeMax === s && advStyles.miniChipOn]}
                          onPress={() => setSizeMax(s)}>
                          <Text style={[advStyles.miniChipText, sizeMax === s && advStyles.miniChipTextOn]}>
                            {s === 100 ? 'Cualquiera' : `≤${s}cm`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Aggression */}
                    <Text style={advStyles.label}>⚔️ Agresividad máx</Text>
                    <View style={advStyles.chipsRow}>
                      {([['all', 'Cualquiera'], [1, '😌 Pacífico'], [2, '🙂 Tranquilo'], [3, '😐 Semi-agresivo'], [4, '😠 Territorial'], [5, '👹 Agresivo']] as const).map(([v, lbl]) => (
                        <TouchableOpacity key={String(v)}
                          style={[advStyles.miniChip, aggression === v && advStyles.miniChipOn]}
                          onPress={() => setAggression(v as any)}>
                          <Text style={[advStyles.miniChipText, aggression === v && advStyles.miniChipTextOn]}>
                            {lbl}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Tank size max */}
                    <Text style={advStyles.label}>🐟 Litros mín del tanque: ≤ {tankMin}L</Text>
                    <View style={advStyles.chipsRow}>
                      {[20, 40, 60, 100, 200, 1000].map(t => (
                        <TouchableOpacity key={t}
                          style={[advStyles.miniChip, tankMin === t && advStyles.miniChipOn]}
                          onPress={() => setTankMin(t)}>
                          <Text style={[advStyles.miniChipText, tankMin === t && advStyles.miniChipTextOn]}>
                            {t === 1000 ? 'Cualquiera' : `≤${t}L`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Origin */}
                    <Text style={advStyles.label}>🌍 Origen</Text>
                    <View style={advStyles.chipsRow}>
                      {originOptions.slice(0, 9).map(o => (
                        <TouchableOpacity key={o}
                          style={[advStyles.miniChip, origin === o && advStyles.miniChipOn]}
                          onPress={() => setOrigin(o)}>
                          <Text style={[advStyles.miniChipText, origin === o && advStyles.miniChipTextOn]}>
                            {o === 'all' ? 'Cualquiera' : o}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Dificultad de cuidado */}
                    <Text style={advStyles.label}>🎯 Nivel de dificultad</Text>
                    <View style={advStyles.chipsRow}>
                      {([['all','Cualquiera'],['beginner','🌱 Principiante'],['intermediate','🔥 Intermedio'],['advanced','🏆 Avanzado'],['expert','🥇 Experto']] as const).map(([v,l])=>(
                        <TouchableOpacity key={v}
                          style={[advStyles.miniChip, difficulty === v && advStyles.miniChipOn]}
                          onPress={() => setDifficulty(v as any)}>
                          <Text style={[advStyles.miniChipText, difficulty === v && advStyles.miniChipTextOn]}>
                            {l}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Origen comercial */}
                    <Text style={advStyles.label}>🛒 Origen comercial</Text>
                    <View style={advStyles.chipsRow}>
                      {([['all','Cualquiera'],['captive','🐠 Cría en cautividad'],['wild','🌿 Captura silvestre'],['both','Ambos']] as const).map(([v,l])=>(
                        <TouchableOpacity key={v}
                          style={[advStyles.miniChip, sourcing === v && advStyles.miniChipOn]}
                          onPress={() => setSourcing(v as any)}>
                          <Text style={[advStyles.miniChipText, sourcing === v && advStyles.miniChipTextOn]}>
                            {l}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Recommended section */}
            {styleInfo && recommendedFish.length > 0 && (
              <View style={styles.recSection}>
                <View style={styles.recSectionHeader}>
                  <Text style={styles.recSectionTitle}>
                    {styleInfo.icon} Recomendados para tu acuario
                  </Text>
                  <Text style={styles.recSectionCount}>{recommendedFish.length} peces</Text>
                </View>
                <Text style={styles.recSectionSub}>
                  Peces cuyo rango de temperatura, pH y GH se ajusta a un acuario {styleInfo.label.toLowerCase()}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                  {recommendedFish.map(({ fish, score }) => (
                    <RecommendedCard
                      key={fish.id}
                      fish={fish}
                      score={score}
                      onPress={() => setSelectedFish(fish)}
                      selected={isCompatSelected(fish.id)}
                      onSelect={() => toggleCompat(fish)}
                      compatMode={mode === 'compat'}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Catalog header */}
            <Text style={styles.catalogLabel}>
              {mode === 'compat'
                ? `Todas las especies (${filteredFish.length})`
                : `Todos los peces (${filteredFish.length})`}
            </Text>
          </>
        }
        renderItem={renderFishItem}
      />

      {/* ── Compatibility panel (bottom) ── */}
      {mode === 'compat' && (
        <CompatibilityPanel
          selected={compatSelected}
          onRemove={id => setCompatSelected(prev => prev.filter(f => f.id !== id))}
        />
      )}

      <FishDetailModal
        fish={selectedFish}
        visible={!!selectedFish}
        onClose={() => setSelectedFish(null)}
        styleId={styleId}
      />

      {/* ── Suggest FAB ── */}
      {mode === 'catalog' && (
        <TouchableOpacity style={styles.suggestFab} onPress={() => setShowSuggest(true)}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.suggestFabText}>Sugerir especie</Text>
        </TouchableOpacity>
      )}

      <SuggestFishModal
        visible={showSuggest}
        onClose={() => setShowSuggest(false)}
        userId={user?.id ?? 'anonymous'}
        userName={user?.full_name ?? 'Usuario'}
      />
    </Wrapper>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: 4,
  },
  toolbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 6,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text, letterSpacing: -0.4, marginBottom: 4 },
  styleChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  styleChipText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.sansSb },

  modeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 7,
  },
  modeBtnActive: { backgroundColor: COLORS.primary },
  modeBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600', fontFamily: FONTS.sansSb },

  compatModeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary + '18',
    marginHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.sm,
    padding: 10, marginBottom: 8,
  },
  compatModeBannerText: { flex: 1, color: COLORS.primary, fontSize: 12, fontFamily: FONTS.sans, lineHeight: 17 },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.text, paddingVertical: 12, fontSize: 15, fontFamily: FONTS.sans },
  filterRow: { maxHeight: 44, marginBottom: SPACING.sm },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { color: COLORS.textSecondary, fontSize: 13, fontFamily: FONTS.sans },
  filterChipTextActive: { color: '#fff', fontWeight: '600', fontFamily: FONTS.sansSb },

  // Recommended section
  recSection: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  recSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  recSectionTitle: { fontSize: 15, fontWeight: '700', fontFamily: FONTS.sansBd, color: COLORS.text },
  recSectionCount: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted },
  recSectionSub: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted, lineHeight: 17, marginBottom: SPACING.sm },

  recCard: {
    width: 120,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  recCardSelected: { borderColor: COLORS.primary, borderWidth: 2 },
  recImage: { width: '100%', height: 80 },
  recImagePlaceholder: { backgroundColor: COLORS.backgroundLight, alignItems: 'center', justifyContent: 'center' },
  recCheckbox: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  recCheckboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  recBody: { padding: 8 },
  recName: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.sansSb, color: COLORS.text, marginBottom: 4 },
  recScore: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  recScoreText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.sansBd },

  catalogLabel: { fontSize: 13, fontFamily: FONTS.sansSb, color: COLORS.textMuted, marginBottom: SPACING.sm, fontWeight: '600' },

  // Standard fish card
  card: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
    minHeight: 80,
  },
  cardSelected: { borderColor: COLORS.primary, borderWidth: 2 },
  cardImage: { width: 88, alignSelf: 'stretch' },
  cardImagePlaceholder: {
    width: 88, alignSelf: 'stretch',
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, padding: SPACING.sm },
  cardName: { fontSize: 15, fontWeight: '700', fontFamily: FONTS.sansBd, color: COLORS.text },
  cardScientific: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted },

  checkbox: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: COLORS.border,
    marginRight: SPACING.md,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  badge: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '600', fontFamily: FONTS.sansSb },

  // Fit bar
  fitBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fitBarTrack: { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  fitBarFill: { height: '100%', borderRadius: 2 },
  fitBarLabel: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.sansBd, minWidth: 30, textAlign: 'right' },

  // Compatibility panel
  compatPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.backgroundCard,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.md, paddingBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  compatHint: { flex: 1, color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.sans, marginLeft: 8 },
  compatChips: { maxHeight: 40, marginBottom: SPACING.sm },
  compatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border,
    marginRight: 8, maxWidth: 140,
  },
  compatChipText: { color: COLORS.text, fontSize: 12, fontFamily: FONTS.sans, flex: 1 },
  compatResult: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  compatResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  compatResultTitle: { fontWeight: '700', fontFamily: FONTS.sansBd, fontSize: 13 },
  compatPair: { flex: 1, color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.sans },
  compatScore: { fontSize: 12, fontWeight: '700', fontFamily: FONTS.sansBd },
  compatReason: { color: COLORS.textSecondary, fontSize: 12, fontFamily: FONTS.sans, lineHeight: 18 },
  paramBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 5 },
  paramBadgeSmall: {
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
  },
  paramBadgeSmallText: { fontSize: 10, fontFamily: FONTS.sans },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.backgroundCard,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '92%',
  },
  modalClose: { position: 'absolute', top: SPACING.md, right: SPACING.md, zIndex: 10, padding: 4 },
  modalImage: { width: '100%', height: 280, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl },
  modalImagePlaceholder: {
    width: '100%', height: 160,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center', justifyContent: 'center',
    borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl,
  },
  zoomHint: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14,
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },
  fullImageOverlay: {
    flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center',
  },
  fullImageClose: {
    position: 'absolute', top: 50, right: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  fullImageContent: { width: '100%', height: '75%' },
  fullImageCaption: {
    color: '#fff', fontSize: 14, fontFamily: FONTS.sans,
    marginTop: SPACING.md, opacity: 0.7,
  },
  modalBody: { padding: SPACING.lg },
  modalBadgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: SPACING.sm },
  modalTitle: { fontSize: 22, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text, letterSpacing: -0.4, marginBottom: 4 },
  modalScientific: { fontSize: 14, fontFamily: FONTS.sans, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: SPACING.sm },
  modalDescription: { fontSize: 14, fontFamily: FONTS.sans, color: COLORS.textSecondary, lineHeight: 22, marginVertical: SPACING.md },
  modalSectionTitle: { fontSize: 16, fontWeight: '700', fontFamily: FONTS.sansBd, color: COLORS.text, marginBottom: SPACING.sm },
  paramRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  paramLabel: { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.sans, width: 110 },
  paramValue: { flex: 1, color: COLORS.text, fontSize: 13, fontFamily: FONTS.sansMd },
  schoolingNote: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.warning + '22',
    borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.sm,
  },
  schoolingText: { flex: 1, color: COLORS.warning, fontSize: 13, fontFamily: FONTS.sans },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  tag: { backgroundColor: COLORS.primary + '22', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: COLORS.primary, fontSize: 11, fontFamily: FONTS.sans },

  // Suggest FAB
  suggestFab: {
    position: 'absolute', bottom: 24, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 18, paddingVertical: 12,
    ...SHADOWS.md,
  },
  suggestFabText: { color: '#fff', fontWeight: '700', fontFamily: FONTS.sansBd, fontSize: 14 },

  // Suggest modal
  suggestOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  suggestBox: {
    backgroundColor: COLORS.background, borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.lg, maxHeight: '94%',
  },
  suggestHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  suggestTitle: { fontSize: 18, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text },
  suggestSubtitle: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted, marginTop: 2 },
  suggestSection: {
    fontSize: 13, fontWeight: '700', fontFamily: FONTS.sansBd, color: COLORS.primary,
    marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
  suggestHint: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, marginBottom: SPACING.sm, lineHeight: 16 },
  suggestField: { marginBottom: SPACING.sm },
  suggestLabel: { fontSize: 12, fontFamily: FONTS.sansSb, color: COLORS.textMuted, marginBottom: 4, fontWeight: '600' },
  suggestInput: {
    color: COLORS.text, fontSize: 14,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  selectorRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  selectorBtn: {
    paddingHorizontal: SPACING.sm, paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
  },
  selectorBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  selectorBtnText: { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textMuted },
  selectorBtnTextActive: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },
  paramsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  paramField: { width: '48%' },
  paramFieldLabel: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, marginBottom: 4 },
  paramFieldInput: {
    color: COLORS.text, fontSize: 14, backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, textAlign: 'center',
  },
  suggestActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  suggestCancel: {
    flex: 1, padding: 13, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundCard, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  suggestCancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  suggestSubmit: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 13, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.accent,
  },
  suggestSubmitText: { color: '#fff', fontWeight: '800', fontFamily: FONTS.sansEb, fontSize: 15 },
});

// ── Advanced filters styles (#16) ─────────────────────────────────────────────
const advStyles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginTop: SPACING.sm, gap: 6,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title:    { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  reset:    { fontSize: 12, color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },
  label:    { fontSize: 12, color: COLORS.textMuted, marginTop: 8, marginBottom: 4, fontFamily: FONTS.sans },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    backgroundColor: COLORS.backgroundLight, borderWidth: 1, borderColor: COLORS.border,
  },
  miniChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  miniChipText: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sans },
  miniChipTextOn: { color: '#fff', fontWeight: '700', fontFamily: FONTS.sansBd },
});

