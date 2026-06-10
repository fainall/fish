import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { getBreedingChecklist } from '../../utils/compatibility';
import { getBreedingProfile, METHOD_ICONS, DIFFICULTY_LABEL } from '../../data/breedingData';
import { Fish, BreedingStatus } from '../../types';
import { useAchievements } from '../../hooks/useAchievements';
import { useBreeding, BreedingGoal, BreedingCheckItem, BreedingLog, LogType } from '../../hooks/useBreeding';
import { useFishDatabase } from '../../hooks/useFishDatabase';
import { confirmAction } from '../../utils/confirm';

// Local alias for readability
type CheckItem = BreedingCheckItem;

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BreedingStatus, { label: string; color: string; icon: string }> = {
  planning: { label: 'Planificando', color: COLORS.textSecondary, icon: 'calendar-outline' },
  active:   { label: 'Activa',       color: COLORS.primary,       icon: 'radio-button-on'  },
  success:  { label: 'Exitosa',      color: COLORS.success,       icon: 'checkmark-circle' },
  failed:   { label: 'Fallida',      color: COLORS.error,         icon: 'close-circle'     },
};

const CAT_ICONS:  Record<string, string> = { water: 'water-outline', tank: 'cube-outline', feeding: 'nutrition-outline', behavior: 'eye-outline', care: 'heart-outline' };
const CAT_COLORS: Record<string, string> = { water: COLORS.primary,  tank: COLORS.textSecondary, feeding: COLORS.warning, behavior: COLORS.accent, care: '#ff8fa3' };
const CAT_LABELS: Record<string, string> = { water: 'Agua', tank: 'Tanque', feeding: 'Alimentación', behavior: 'Comportamiento', care: 'Cuidado alevines' };

const LOG_CONFIG: Record<LogType, { icon: string; color: string; label: string; placeholder: string }> = {
  water_change: { icon: 'water',          color: COLORS.primary,  label: 'Cambio de agua',   placeholder: 'Ej: 20% — 5 litros con agua dechlorinada' },
  feeding:      { icon: 'nutrition',      color: COLORS.warning,  label: 'Alimentación',     placeholder: 'Ej: Artemia viva — porción pequeña mañana y noche' },
  parameter:    { icon: 'flask',          color: '#7c4dff',       label: 'Parámetros',       placeholder: 'Ej: Temp 27°C · pH 6.8 · GH 4' },
  behavior:     { icon: 'eye',            color: COLORS.accent,   label: 'Observación',      placeholder: 'Ej: Macho construyendo nido de burbujas, hembra escondida' },
  note:         { icon: 'document-text', color: COLORS.textSecondary, label: 'Nota',         placeholder: 'Cualquier observación relevante...' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? 'hoy' : d === 1 ? 'hace 1 día' : `hace ${d} días`;
}

function timeStr(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ChecklistItem({ item, onToggle }: { item: CheckItem; onToggle: () => void }) {
  return (
    <TouchableOpacity style={[styles.checkItem, item.completed && styles.checkItemDone]} onPress={onToggle}>
      <Ionicons name={item.completed ? 'checkbox' : 'square-outline'} size={22} color={item.completed ? COLORS.success : COLORS.textMuted} />
      <View style={styles.checkItemBody}>
        <View style={styles.checkItemTop}>
          <Ionicons name={CAT_ICONS[item.category] as any} size={11} color={CAT_COLORS[item.category]} />
          <Text style={[styles.checkItemLabel, item.completed && styles.strikeThrough]}>{item.label}</Text>
        </View>
        <Text style={styles.checkItemDesc}>{item.description}</Text>
        {item.completed && item.completed_at && (
          <Text style={styles.checkItemTime}>✓ {timeStr(item.completed_at)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function LogEntry({ entry }: { entry: BreedingLog }) {
  const cfg = LOG_CONFIG[entry.type];
  return (
    <View style={styles.logEntry}>
      <View style={[styles.logIcon, { backgroundColor: cfg.color + '22' }]}>
        <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
      </View>
      <View style={styles.logBody}>
        <Text style={styles.logLabel}>{entry.label}</Text>
        {entry.value ? <Text style={styles.logValue}>{entry.value}</Text> : null}
      </View>
      <Text style={styles.logTime}>{timeStr(entry.timestamp)}</Text>
    </View>
  );
}

// ─── Log Action Modal ──────────────────────────────────────────────────────────

function LogModal({
  visible, type, onClose, onSave,
}: {
  visible: boolean; type: LogType | null;
  onClose: () => void; onSave: (label: string, value: string) => void;
}) {
  const [value, setValue] = useState('');
  const cfg = type ? LOG_CONFIG[type] : null;

  function submit() {
    if (!cfg) return;
    onSave(cfg.label, value.trim());
    setValue('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.logModalOverlay}>
          <View style={styles.logModalBox}>
            {cfg && (
              <>
                <View style={styles.logModalHeader}>
                  <View style={[styles.logModalIcon, { backgroundColor: cfg.color + '22' }]}>
                    <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                  </View>
                  <Text style={styles.logModalTitle}>Registrar {cfg.label}</Text>
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.logModalInput}
                  value={value}
                  onChangeText={setValue}
                  placeholder={cfg.placeholder}
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.logModalSaveBtn, { backgroundColor: cfg.color }, !value.trim() && { opacity: 0.5 }]}
                  onPress={submit}
                  disabled={!value.trim()}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.logModalSaveBtnText}>Guardar registro</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Fish Picker Modal ─────────────────────────────────────────────────────────

function FishPickerModal({
  visible, onClose, onSelect, fishList,
}: {
  visible: boolean; onClose: () => void; onSelect: (fish: Fish) => void;
  fishList: Fish[];
}) {
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<Fish | null>(null);

  const filtered = useMemo(() =>
    fishList.filter(f =>
      f.common_name.toLowerCase().includes(search.toLowerCase()) ||
      f.scientific_name.toLowerCase().includes(search.toLowerCase())
    ), [search, fishList]);

  const profile = preview ? getBreedingProfile(preview) : null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerBox}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>¿Qué especie vas a criar?</Text>
            <TouchableOpacity onPress={() => { onClose(); setPreview(null); setSearch(''); }}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {preview ? (
            // Preview breeding profile
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setPreview(null)}>
                <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
                <Text style={styles.backBtnText}>Cambiar especie</Text>
              </TouchableOpacity>

              <Text style={styles.previewName}>{preview.common_name}</Text>
              <Text style={styles.previewSci}>{preview.scientific_name}</Text>

              <View style={styles.previewMeta}>
                <View style={styles.previewMetaItem}>
                  <Text style={styles.previewMetaEmoji}>{METHOD_ICONS[profile!.method]}</Text>
                  <Text style={styles.previewMetaLabel}>{profile!.method_label}</Text>
                </View>
                <View style={styles.previewMetaItem}>
                  <Text style={[styles.previewDiff, { color: DIFFICULTY_LABEL[profile!.difficulty].color }]}>
                    {'★'.repeat(profile!.difficulty)}{'☆'.repeat(5 - profile!.difficulty)}
                  </Text>
                  <Text style={styles.previewMetaLabel}>{DIFFICULTY_LABEL[profile!.difficulty].label}</Text>
                </View>
                <View style={styles.previewMetaItem}>
                  <Text style={styles.previewMetaEmoji}>🥚</Text>
                  <Text style={styles.previewMetaLabel}>{profile!.clutch_size}</Text>
                </View>
                <View style={styles.previewMetaItem}>
                  <Text style={styles.previewMetaEmoji}>📅</Text>
                  <Text style={styles.previewMetaLabel}>{profile!.gestation_days}</Text>
                </View>
              </View>

              {profile!.warning && (
                <View style={styles.previewWarning}>
                  <Ionicons name="warning-outline" size={16} color={COLORS.error} />
                  <Text style={styles.previewWarningText}>{profile!.warning}</Text>
                </View>
              )}

              <Text style={styles.previewSection}>🌡️ Condiciones desencadenantes</Text>
              {profile!.trigger_conditions.map((c, i) => (
                <View key={i} style={styles.previewListItem}>
                  <Text style={styles.previewListDot}>·</Text>
                  <Text style={styles.previewListText}>{c}</Text>
                </View>
              ))}

              <Text style={styles.previewSection}>🍖 Alimentación para inducir</Text>
              {profile!.feeding_schedule.map((f, i) => (
                <View key={i} style={styles.previewListItem}>
                  <Text style={styles.previewListDot}>·</Text>
                  <Text style={styles.previewListText}>{f}</Text>
                </View>
              ))}

              <Text style={styles.previewSection}>🐣 Primer alimento de alevines</Text>
              <Text style={styles.previewBody}>{profile!.fry_first_food}</Text>

              {profile!.special_requirements.length > 0 && (
                <>
                  <Text style={styles.previewSection}>⚙️ Requerimientos especiales</Text>
                  {profile!.special_requirements.map((r, i) => (
                    <View key={i} style={styles.previewListItem}>
                      <Text style={styles.previewListDot}>·</Text>
                      <Text style={styles.previewListText}>{r}</Text>
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => { onSelect(preview); setPreview(null); setSearch(''); }}
              >
                <Ionicons name="egg-outline" size={20} color="#fff" />
                <Text style={styles.startBtnText}>Iniciar seguimiento de puesta</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            // Search list
            <>
              <TextInput
                style={styles.pickerSearch}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar especie..."
                placeholderTextColor={COLORS.textMuted}
                autoFocus
              />
              <FlatList
                data={filtered}
                keyExtractor={f => f.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const p = getBreedingProfile(item);
                  return (
                    <TouchableOpacity style={styles.pickerRow} onPress={() => setPreview(item)}>
                      <View style={styles.pickerRowLeft}>
                        <Text style={styles.pickerRowName}>{item.common_name}</Text>
                        <Text style={styles.pickerRowSci}>{item.scientific_name}</Text>
                      </View>
                      <View style={styles.pickerRowRight}>
                        <Text style={styles.pickerMethod}>{METHOD_ICONS[p.method]}</Text>
                        <Text style={[styles.pickerDiff, { color: DIFFICULTY_LABEL[p.difficulty].color }]}>
                          {'★'.repeat(p.difficulty)}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function BreedingScreen() {
  const { unlock } = useAchievements();
  const { goals, addGoal, updateGoal, deleteGoal: removeGoal } = useBreeding();
  const { fish: fishDatabase } = useFishDatabase();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [logType, setLogType] = useState<LogType | null>(null);
  const [activeSection, setActiveSection] = useState<'checklist' | 'log'>('checklist');

  // Derive selectedGoal from goals list (keeps it in sync after async updates)
  const selectedGoal = goals.find(g => g.id === selectedGoalId) ?? goals[0] ?? null;

  const startBreeding = async (fish: Fish) => {
    const checklist = getBreedingChecklist(fish).map((item, i) => ({
      id: `c${i}`, ...item, completed: false,
    }));
    const goal: BreedingGoal = {
      id: Date.now().toString(),
      fish,
      status: 'planning',
      started_at: new Date().toISOString(),
      notes: '',
      checklist,
      logs: [],
    };
    await addGoal(goal);
    setSelectedGoalId(goal.id);
    setShowPicker(false);
  };

  const toggleCheck = async (itemId: string) => {
    if (!selectedGoal) return;
    const updated: BreedingGoal = {
      ...selectedGoal,
      checklist: selectedGoal.checklist.map(c =>
        c.id === itemId
          ? { ...c, completed: !c.completed, completed_at: !c.completed ? new Date().toISOString() : undefined }
          : c
      ),
    };
    const done = updated.checklist.filter(c => c.completed).length;
    const total = updated.checklist.length;
    updated.status = done === total ? 'success' : done > 0 ? 'active' : 'planning';
    if (updated.status === 'success') unlock('first_breeding');
    await updateGoal(updated.id, updated);
  };

  const addLog = async (label: string, value: string) => {
    if (!selectedGoal || !logType) return;

    // Extract parameters if type is 'parameter'
    let last_temp = selectedGoal.last_temp;
    let last_ph = selectedGoal.last_ph;
    let last_gh = selectedGoal.last_gh;
    if (logType === 'parameter') {
      // Word boundaries prevent matching "phosphate", "temperature", etc.
      const tempMatch = value.match(/\btemp(?:eratura)?\b[^\d]*(\d+(?:\.\d+)?)/i);
      const phMatch   = value.match(/\bph\b[^\d]*(\d+(?:\.\d+)?)/i);
      const ghMatch   = value.match(/\bgh\b[^\d]*(\d+(?:\.\d+)?)/i);
      if (tempMatch) last_temp = parseFloat(tempMatch[1]);
      if (phMatch)   last_ph   = parseFloat(phMatch[1]);
      if (ghMatch)   last_gh   = parseFloat(ghMatch[1]);
    }

    const log: BreedingLog = {
      id: `l${Date.now()}`,
      type: logType,
      label,
      value: value || undefined,
      timestamp: new Date().toISOString(),
    };

    // Auto-mark checklist items when relevant log is added
    let checklist = selectedGoal.checklist;
    if (logType === 'water_change') {
      checklist = checklist.map(c =>
        c.category === 'water' && !c.completed && c.label.toLowerCase().includes('cambio')
          ? { ...c, completed: true, completed_at: new Date().toISOString() }
          : c
      );
    }
    if (logType === 'feeding') {
      checklist = checklist.map(c =>
        c.category === 'feeding' && !c.completed
          ? { ...c, completed: true, completed_at: new Date().toISOString() }
          : c
      );
    }

    const updated: BreedingGoal = {
      ...selectedGoal,
      logs: [log, ...selectedGoal.logs],
      checklist,
      last_temp, last_ph, last_gh,
    };
    const done = updated.checklist.filter(c => c.completed).length;
    updated.status = done === updated.checklist.length ? 'success' : done > 0 ? 'active' : 'planning';
    if (updated.status === 'success') unlock('first_breeding');

    await updateGoal(updated.id, updated);
    setActiveSection('log');
  };

  const handleDeleteGoal = (id: string) => {
    confirmAction('Eliminar puesta', '¿Seguro que quieres eliminar este seguimiento?', async () => {
      await removeGoal(id);
      const remaining = goals.filter(g => g.id !== id);
      setSelectedGoalId(remaining[0]?.id ?? null);
    });
  };

  const goal = selectedGoal;
  const progress = goal ? goal.checklist.filter(c => c.completed).length / Math.max(goal.checklist.length, 1) : 0;
  const breedingProfile = goal ? getBreedingProfile(goal.fish) : null;

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

      {/* ── Goal tabs ── */}
      <View style={styles.tabsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 8, alignItems: 'center' }}>
          {goals.map(g => {
            const cfg = STATUS_CONFIG[g.status];
            return (
              <TouchableOpacity
                key={g.id}
                style={[styles.goalTab, selectedGoalId === g.id && { borderColor: cfg.color, backgroundColor: cfg.color + '18' }]}
                onPress={() => setSelectedGoalId(g.id)}
              >
                <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                <Text style={[styles.goalTabText, { color: cfg.color }]} numberOfLines={1}>
                  {g.fish.common_name}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.newTabBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="add" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {!goal ? (
        // ── Empty state ──
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🥚</Text>
          <Text style={styles.emptyTitle}>Sin puestas activas</Text>
          <Text style={styles.emptySub}>Inicia el seguimiento de la cría de tu especie favorita</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.emptyBtnText}>Comenzar nueva puesta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Goal header ── */}
          <View style={styles.goalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalName}>{goal.fish.common_name}</Text>
              <Text style={styles.goalSci}>{goal.fish.scientific_name}</Text>
              <View style={styles.goalMeta}>
                {breedingProfile && (
                  <View style={styles.metaBadge}>
                    <Text>{METHOD_ICONS[breedingProfile.method]}</Text>
                    <Text style={styles.metaBadgeText}>{breedingProfile.method_label}</Text>
                  </View>
                )}
                <View style={styles.metaBadge}>
                  <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.metaBadgeText}>{daysAgo(goal.started_at)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.goalHeaderRight}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[goal.status].color + '22' }]}>
                <Ionicons name={STATUS_CONFIG[goal.status].icon as any} size={13} color={STATUS_CONFIG[goal.status].color} />
                <Text style={[styles.statusText, { color: STATUS_CONFIG[goal.status].color }]}>
                  {STATUS_CONFIG[goal.status].label}
                </Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteGoal(goal.id)}>
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Progress ── */}
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>Progreso de la puesta</Text>
              <Text style={[styles.progressPct, { color: progress === 1 ? COLORS.success : COLORS.primary }]}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <LinearGradient colors={[COLORS.primary, COLORS.success]}
                style={[styles.progressFill, { width: `${progress * 100}%` as any }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            </View>
            <Text style={styles.progressSub}>
              {goal.checklist.filter(c => c.completed).length} / {goal.checklist.length} condiciones cumplidas
            </Text>

            {/* Last params row */}
            {(goal.last_temp || goal.last_ph || goal.last_gh) && (
              <View style={styles.lastParams}>
                {goal.last_temp && <Text style={styles.lastParam}>🌡️ {goal.last_temp}°C</Text>}
                {goal.last_ph   && <Text style={styles.lastParam}>⚗️ pH {goal.last_ph}</Text>}
                {goal.last_gh   && <Text style={styles.lastParam}>💧 GH {goal.last_gh}</Text>}
              </View>
            )}
          </View>

          {/* ── Quick actions ── */}
          <Text style={styles.sectionTitle}>Registrar actividad</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, flexShrink: 0 }}
            contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 10, paddingBottom: 4 }}>
            {(Object.keys(LOG_CONFIG) as LogType[]).map(type => {
              const cfg = LOG_CONFIG[type];
              return (
                <TouchableOpacity key={type} style={[styles.actionBtn, { borderColor: cfg.color + '66' }]}
                  onPress={() => setLogType(type)}>
                  <View style={[styles.actionBtnIcon, { backgroundColor: cfg.color + '22' }]}>
                    <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                  </View>
                  <Text style={[styles.actionBtnLabel, { color: cfg.color }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Section toggle ── */}
          <View style={styles.sectionToggle}>
            {(['checklist', 'log'] as const).map(s => (
              <TouchableOpacity key={s} style={[styles.toggleBtn, activeSection === s && styles.toggleBtnActive]}
                onPress={() => setActiveSection(s)}>
                <Text style={[styles.toggleBtnText, activeSection === s && styles.toggleBtnTextActive]}>
                  {s === 'checklist' ? `✅ Checklist (${goal.checklist.filter(c => c.completed).length}/${goal.checklist.length})`
                    : `📋 Historial (${goal.logs.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Checklist ── */}
          {activeSection === 'checklist' && (
            <View style={styles.section}>
              {(['water', 'tank', 'feeding', 'behavior', 'care'] as const).map(cat => {
                const items = goal.checklist.filter(c => c.category === cat);
                if (items.length === 0) return null;
                return (
                  <View key={cat} style={styles.catBlock}>
                    <View style={styles.catHeader}>
                      <Ionicons name={CAT_ICONS[cat] as any} size={15} color={CAT_COLORS[cat]} />
                      <Text style={[styles.catTitle, { color: CAT_COLORS[cat] }]}>{CAT_LABELS[cat]}</Text>
                      <Text style={styles.catCount}>
                        {items.filter(i => i.completed).length}/{items.length}
                      </Text>
                    </View>
                    {items.map(item => (
                      <ChecklistItem key={item.id} item={item} onToggle={() => toggleCheck(item.id)} />
                    ))}
                  </View>
                );
              })}

              {/* Breeding tips from profile */}
              {breedingProfile && (
                <View style={styles.tipsCard}>
                  <Text style={styles.tipsTitle}>💡 Tips para {goal.fish.common_name}</Text>
                  <Text style={styles.tipsSub}>pH ideal de cría: {breedingProfile.breeding_ph_ideal}</Text>
                  <Text style={styles.tipsSub}>Primer alimento alevines: {breedingProfile.fry_first_food}</Text>
                  {breedingProfile.special_requirements.map((r, i) => (
                    <View key={i} style={styles.tipRow}>
                      <Text style={styles.tipDot}>·</Text>
                      <Text style={styles.tipText}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Activity log ── */}
          {activeSection === 'log' && (
            <View style={styles.section}>
              {goal.logs.length === 0 ? (
                <View style={styles.logEmpty}>
                  <Ionicons name="document-text-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.logEmptyText}>Sin registros aún</Text>
                  <Text style={styles.logEmptyHint}>Usa los botones de arriba para registrar actividades</Text>
                </View>
              ) : (
                goal.logs.map(l => <LogEntry key={l.id} entry={l} />)
              )}
            </View>
          )}

          {/* ── Success banner ── */}
          {goal.status === 'success' && (
            <LinearGradient colors={[COLORS.success + '33', COLORS.success + '11']} style={styles.successBanner}>
              <Text style={styles.successEmoji}>🏆</Text>
              <Text style={styles.successTitle}>¡Puesta exitosa!</Text>
              <Text style={styles.successSub}>
                Has completado todas las condiciones para la cría de {goal.fish.common_name}.
                Recuerda: {breedingProfile?.fry_first_food ?? 'alimentar alevines con alimento fino.'}
              </Text>
            </LinearGradient>
          )}
        </ScrollView>
      )}

      {/* ── Modals ── */}
      <FishPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={startBreeding}
        fishList={fishDatabase}
      />
      <LogModal
        visible={!!logType}
        type={logType}
        onClose={() => setLogType(null)}
        onSave={addLog}
      />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  tabsBar: { paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  goalTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, maxWidth: 160,
  },
  goalTabText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.sansSb },
  newTabBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.backgroundCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, marginTop: 60 },
  emptyEmoji: { fontSize: 60, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm, fontFamily: FONTS.sansEb },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg, fontFamily: FONTS.sans },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    paddingVertical: 14, paddingHorizontal: 24,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: FONTS.sansBd },

  // Goal header
  goalHeader: {
    flexDirection: 'row', padding: SPACING.md,
    paddingTop: SPACING.lg, gap: SPACING.sm,
  },
  goalName: { fontSize: 20, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  goalSci: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 6, fontFamily: FONTS.sans },
  goalMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.border,
  },
  metaBadgeText: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sans },
  goalHeaderRight: { alignItems: 'flex-end', gap: SPACING.sm },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.sansBd },
  deleteBtn: { padding: 6 },

  // Progress
  progressCard: {
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel: { color: COLORS.textSecondary, fontSize: 13, fontFamily: FONTS.sans },
  progressPct: { fontWeight: '700', fontSize: 16, fontFamily: FONTS.sansBd },
  progressBar: { height: 8, backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden', marginBottom: SPACING.sm },
  progressFill: { height: '100%', borderRadius: 4 },
  progressSub: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.sans },
  lastParams: { flexDirection: 'row', gap: 12, marginTop: SPACING.sm, flexWrap: 'wrap' },
  lastParam: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', fontFamily: FONTS.sansSb },

  // Quick actions
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, fontFamily: FONTS.sansBd },
  actionBtn: {
    alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, minWidth: 90,
  },
  actionBtnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionBtnLabel: { fontSize: 11, fontWeight: '600', fontFamily: FONTS.sansSb },

  // Section toggle
  sectionToggle: {
    flexDirection: 'row', margin: SPACING.md, gap: 8,
    backgroundColor: COLORS.backgroundCard, padding: 4, borderRadius: BORDER_RADIUS.md,
  },
  toggleBtn: { flex: 1, padding: 8, borderRadius: BORDER_RADIUS.sm, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleBtnText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', fontFamily: FONTS.sansSb },
  toggleBtnTextActive: { color: '#fff', fontFamily: FONTS.sansSb },

  section: { paddingHorizontal: SPACING.md },

  // Checklist
  catBlock: { marginBottom: SPACING.md },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  catTitle: { fontSize: 13, fontWeight: '700', flex: 1, fontFamily: FONTS.sansBd },
  catCount: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sans },
  checkItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm, marginBottom: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  checkItemDone: { opacity: 0.65 },
  checkItemBody: { flex: 1 },
  checkItemTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  checkItemLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1, fontFamily: FONTS.sansSb },
  strikeThrough: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  checkItemDesc: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16, fontFamily: FONTS.sans },
  checkItemTime: { fontSize: 10, color: COLORS.success, marginTop: 3, fontFamily: FONTS.sans },

  // Tips
  tipsCard: {
    backgroundColor: COLORS.primary + '11', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.primary + '33', marginTop: SPACING.sm,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 6, fontFamily: FONTS.sansBd },
  tipsSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontFamily: FONTS.sans },
  tipRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  tipDot: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },
  tipText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, fontFamily: FONTS.sans },

  // Log
  logEmpty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  logEmptyText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600', fontFamily: FONTS.sansSb },
  logEmptyHint: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.sans },
  logEntry: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  logIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  logBody: { flex: 1 },
  logLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  logValue: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginTop: 2, fontFamily: FONTS.sans },
  logTime: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sans },

  // Success
  successBanner: {
    margin: SPACING.md, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm,
  },
  successEmoji: { fontSize: 40 },
  successTitle: { fontSize: 20, fontWeight: '700', color: COLORS.success, fontFamily: FONTS.sansEb },
  successSub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: FONTS.sans },

  // Fish picker modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  pickerBox: {
    backgroundColor: COLORS.backgroundCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.lg, maxHeight: '90%',
  },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  pickerSearch: {
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md, color: COLORS.text, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, fontSize: 15,
    fontFamily: FONTS.sans,
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  pickerRowLeft: { flex: 1 },
  pickerRowName: { fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  pickerRowSci: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', fontFamily: FONTS.sans },
  pickerRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerMethod: { fontSize: 18 },
  pickerDiff: { fontSize: 12, fontWeight: '700', fontFamily: FONTS.sansBd },

  // Preview
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.md },
  backBtnText: { color: COLORS.primary, fontSize: 13, fontFamily: FONTS.sans },
  previewName: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 2, fontFamily: FONTS.sansBd },
  previewSci: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: SPACING.md, fontFamily: FONTS.sans },
  previewMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.md },
  previewMetaItem: { alignItems: 'center', gap: 4, minWidth: 72 },
  previewMetaEmoji: { fontSize: 22 },
  previewMetaLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', fontFamily: FONTS.sans },
  previewDiff: { fontSize: 14, fontWeight: '700', fontFamily: FONTS.sansBd },
  previewWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.error + '18', borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm, marginBottom: SPACING.md,
  },
  previewWarningText: { flex: 1, color: COLORS.error, fontSize: 12, lineHeight: 18, fontFamily: FONTS.sans },
  previewSection: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md, marginBottom: 6, fontFamily: FONTS.sansBd },
  previewListItem: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  previewListDot: { color: COLORS.primary, fontWeight: '700', marginTop: 1, fontFamily: FONTS.sansBd },
  previewListText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, fontFamily: FONTS.sans },
  previewBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 4, fontFamily: FONTS.sans },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center',
    backgroundColor: COLORS.success, borderRadius: BORDER_RADIUS.md,
    paddingVertical: 14, marginTop: SPACING.lg, marginBottom: SPACING.lg,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: FONTS.sansBd },

  // Log modal
  logModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  logModalBox: {
    backgroundColor: COLORS.backgroundCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.lg,
  },
  logModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.md },
  logModalIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  logModalTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  logModalInput: {
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, color: COLORS.text, fontSize: 14, minHeight: 90,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md,
    fontFamily: FONTS.sans,
  },
  logModalSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: BORDER_RADIUS.md, paddingVertical: 14,
  },
  logModalSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: FONTS.sansBd },
});
