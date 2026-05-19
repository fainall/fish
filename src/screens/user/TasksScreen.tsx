import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useAquariums } from '../../hooks/useAquariums';
import { useTasks, TASK_TYPE_INFO, RECURRENCE_LABELS } from '../../hooks/useTasks';
import { confirmAction } from '../../utils/confirm';
import { AquariumTask, TaskType, RecurrenceType } from '../../types';

const TASK_TYPES  = Object.entries(TASK_TYPE_INFO)  as [TaskType, typeof TASK_TYPE_INFO[TaskType]][];
const RECURRENCES = Object.entries(RECURRENCE_LABELS) as [RecurrenceType, string][];

// ── Task card (Airbnb-style) ──────────────────────────────────────────────────
function TaskCard({ task, onToggle, onDelete, onEdit }: {
  task: AquariumTask; onToggle: () => void; onDelete: () => void; onEdit: () => void;
}) {
  const info     = TASK_TYPE_INFO[task.type];
  const dueDate  = new Date(task.due_date);
  const now      = new Date();
  const isOverdue = !task.completed && dueDate < now;
  const isToday   = !task.completed && dueDate.toDateString() === now.toDateString();

  const dueDateLabel = dueDate.toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });

  const statusColor = isOverdue ? COLORS.error : isToday ? COLORS.warning : COLORS.textMuted;

  return (
    <View style={[
      styles.taskCard,
      task.completed && styles.taskCardDone,
      isOverdue && styles.taskCardOverdue,
    ]}>
      {/* Check button */}
      <TouchableOpacity style={styles.taskCheckWrap} onPress={onToggle} activeOpacity={0.7}>
        <View style={[
          styles.checkCircle,
          task.completed && { backgroundColor: COLORS.success, borderColor: COLORS.success },
          isOverdue && !task.completed && { borderColor: COLORS.error },
        ]}>
          {task.completed && <Ionicons name="checkmark" size={15} color="#fff" />}
        </View>
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.taskContent}>
        {/* Tags row */}
        <View style={styles.taskTagRow}>
          <View style={[styles.taskTag, { backgroundColor: (task.completed ? COLORS.textMuted : info.color) + '1a' }]}>
            <Ionicons name={info.icon as any} size={11} color={task.completed ? COLORS.textMuted : info.color} />
            <Text style={[styles.taskTagText, { color: task.completed ? COLORS.textMuted : info.color }]}>
              {info.label}
            </Text>
          </View>
          {task.recurrence !== 'none' && (
            <View style={styles.recTag}>
              <Ionicons name="repeat" size={10} color={COLORS.textMuted} />
              <Text style={styles.recTagText}>{RECURRENCE_LABELS[task.recurrence]}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>
          {task.title}
        </Text>

        {task.description
          ? <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
          : null}

        <View style={styles.taskMeta}>
          <Ionicons name="time-outline" size={12} color={statusColor} />
          <Text style={[styles.taskMetaText, { color: statusColor }]}>
            {isOverdue ? '¡Vencida! ' : isToday ? 'Hoy · ' : ''}{dueDateLabel}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.taskActions}>
        <TouchableOpacity onPress={onEdit} style={styles.taskActionBtn}>
          <Ionicons name="create-outline" size={15} color={COLORS.primary + '90'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.taskActionBtn}>
          <Ionicons name="trash-outline" size={15} color={COLORS.error + '80'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Date group label ──────────────────────────────────────────────────────────
function dateGroupKey(isoDate: string): string {
  const d = new Date(isoDate);
  const today    = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString())    return '📅 HOY';
  if (d.toDateString() === tomorrow.toDateString()) return '🌅 MAÑANA';
  if (d < today) return '⚠️ VENCIDAS';
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TasksScreen() {
  const { aquariums, selectedAquarium, selectedId, selectAquarium } = useAquariums();
  const { tasksFor, overdueCount, addTask, updateTask, toggleComplete, deleteTask } = useTasks();

  const [showModal,     setShowModal]     = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTask,   setEditingTask]   = useState<AquariumTask | null>(null);

  const [formTitle,      setFormTitle]      = useState('');
  const [formDesc,       setFormDesc]       = useState('');
  const [formType,       setFormType]       = useState<TaskType>('water_change');
  const [formRecurrence, setFormRecurrence] = useState<RecurrenceType>('none');
  const [formDate,       setFormDate]       = useState('');
  const [formTime,       setFormTime]       = useState('');

  const allTasks         = useMemo(() => selectedAquarium ? tasksFor(selectedAquarium.id) : [], [selectedAquarium, tasksFor]);
  const pendingTasks     = allTasks.filter(t => !t.completed);
  const completedTasks   = allTasks.filter(t =>  t.completed).slice().reverse();
  const overdueForAq     = pendingTasks.filter(t => new Date(t.due_date) < new Date()).length;

  const grouped = useMemo(() => {
    const groups: Record<string, AquariumTask[]> = {};
    const sorted = [...pendingTasks].sort((a, b) => {
      const da = new Date(a.due_date), db = new Date(b.due_date), now = new Date();
      const aO = da < now, bO = db < now;
      if (aO && !bO) return -1; if (!aO && bO) return 1;
      return da.getTime() - db.getTime();
    });
    for (const t of sorted) {
      const k = dateGroupKey(t.due_date);
      if (!groups[k]) groups[k] = [];
      groups[k].push(t);
    }
    return groups;
  }, [pendingTasks]);

  const resetForm = () => {
    setFormTitle(''); setFormDesc(''); setFormType('water_change');
    setFormRecurrence('none'); setFormDate(''); setFormTime('');
    setEditingTask(null);
  };

  const openEdit = (task: AquariumTask) => {
    const d = new Date(task.due_date);
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description ?? '');
    setFormType(task.type);
    setFormRecurrence(task.recurrence);
    setFormDate(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
    setFormTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedAquarium) return;
    if (!formTitle.trim()) { Alert.alert('Error', 'Escribe un título para la tarea.'); return; }
    if (!formDate.trim())  { Alert.alert('Error', 'Selecciona una fecha (DD/MM/AAAA).'); return; }
    const parts = formDate.split('/');
    if (parts.length !== 3) { Alert.alert('Error', 'Formato de fecha: DD/MM/AAAA'); return; }
    const dd   = parseInt(parts[0], 10);
    const mm   = parseInt(parts[1], 10);
    const yyyy = parseInt(parts[2], 10);
    if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy) ||
        dd < 1 || dd > 31 || mm < 1 || mm > 12 || yyyy < 2000 || yyyy > 2100) {
      Alert.alert('Error', 'Fecha fuera de rango. Usa DD/MM/AAAA con año 2000-2100.'); return;
    }
    const tp    = formTime.split(':');
    const hours = tp[0] ? parseInt(tp[0], 10) : 8;
    const mins  = tp[1] ? parseInt(tp[1], 10) : 0;
    if (!Number.isFinite(hours) || !Number.isFinite(mins) || hours < 0 || hours > 23 || mins < 0 || mins > 59) {
      Alert.alert('Error', 'Hora inválida (HH:MM).'); return;
    }
    const due   = new Date(yyyy, mm - 1, dd, hours, mins);
    // Reject silently-rolled dates (e.g. 31/02 → 03/03)
    if (due.getDate() !== dd || due.getMonth() !== mm - 1 || due.getFullYear() !== yyyy) {
      Alert.alert('Error', 'Esa fecha no existe en el calendario.'); return;
    }
    if (isNaN(due.getTime())) { Alert.alert('Error', 'Fecha inválida.'); return; }
    if (editingTask) {
      await updateTask(editingTask.id, {
        type: formType, title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        due_date: due.toISOString(), recurrence: formRecurrence,
      });
    } else {
      await addTask({
        aquarium_id: selectedAquarium.id, type: formType,
        title: formTitle.trim(), description: formDesc.trim() || undefined,
        due_date: due.toISOString(), recurrence: formRecurrence,
      });
    }
    resetForm(); setShowModal(false);
  };

  const confirmDelete = (id: string, title: string) => {
    confirmAction('Eliminar tarea', `¿Eliminar "${title}"?`, () => deleteTask(id));
  };

  const todayStr = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <LinearGradient colors={['#EBF4FA', '#F3F9FD']} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING.xxl }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Tareas</Text>
            {overdueCount > 0
              ? <Text style={styles.headerAlert}>⚠️ {overdueCount} vencida{overdueCount > 1 ? 's' : ''}</Text>
              : <Text style={styles.headerSub}>{pendingTasks.length} pendiente{pendingTasks.length !== 1 ? 's' : ''}</Text>
            }
          </View>
          <TouchableOpacity
            style={[styles.addBtn, !selectedAquarium && styles.addBtnDisabled]}
            onPress={() => { if (selectedAquarium) { setFormDate(todayStr()); setShowModal(true); } }}
            disabled={!selectedAquarium}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Aquarium tabs ── */}
        {aquariums.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.aqTabs}>
            {aquariums.map(a => {
              const ov = tasksFor(a.id).filter(t => !t.completed && new Date(t.due_date) < new Date()).length;
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.aqTab, selectedId === a.id && styles.aqTabActive]}
                  onPress={() => selectAquarium(a.id)}
                >
                  <Ionicons name="cube-outline" size={13} color={selectedId === a.id ? COLORS.primary : COLORS.textMuted} />
                  <Text style={[styles.aqTabText, selectedId === a.id && styles.aqTabTextActive]}>{a.name}</Text>
                  {ov > 0 && (
                    <View style={styles.aqTabBadge}><Text style={styles.aqTabBadgeText}>{ov}</Text></View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Empty states ── */}
        {!selectedAquarium ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Sin acuarios</Text>
            <Text style={styles.emptySub}>Crea un acuario primero para organizar tus tareas.</Text>
          </View>
        ) : allTasks.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyTitle}>Sin tareas</Text>
            <Text style={styles.emptySub}>
              Organiza el mantenimiento de {selectedAquarium.name} con recordatorios.
            </Text>
            <TouchableOpacity style={styles.emptyBtn}
              onPress={() => { setFormDate(todayStr()); setShowModal(true); }}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Crear primera tarea</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Stats ── */}
            <View style={styles.statsRow}>
              {[
                { label: 'Pendientes',  value: pendingTasks.length,   color: COLORS.text },
                { label: 'Vencidas',    value: overdueForAq,          color: overdueForAq > 0 ? COLORS.error : COLORS.textMuted },
                { label: 'Completadas', value: completedTasks.length, color: COLORS.success },
              ].map(s => (
                <View key={s.label} style={styles.statCard}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* ── Pending groups ── */}
            {Object.entries(grouped).map(([label, tasks]) => (
              <View key={label}>
                <View style={styles.groupRow}>
                  <View style={[styles.groupDot, {
                    backgroundColor: label.startsWith('⚠')   ? COLORS.error
                                   : label.startsWith('📅')  ? COLORS.warning
                                   : COLORS.primary,
                  }]} />
                  <Text style={[
                    styles.groupLabel,
                    label.startsWith('⚠') && { color: COLORS.error },
                    label.startsWith('📅') && { color: COLORS.warning },
                  ]}>{label}</Text>
                </View>
                {tasks.map(task => (
                  <TaskCard key={task.id} task={task}
                    onToggle={() => toggleComplete(task.id)}
                    onDelete={() => confirmDelete(task.id, task.title)}
                    onEdit={() => openEdit(task)}
                  />
                ))}
              </View>
            ))}

            {/* ── Completed ── */}
            {completedTasks.length > 0 && (
              <>
                <TouchableOpacity style={styles.completedToggle}
                  onPress={() => setShowCompleted(v => !v)}>
                  <Ionicons name="checkmark-done-circle-outline" size={20} color={COLORS.success} />
                  <Text style={styles.completedToggleText}>
                    Completadas ({completedTasks.length})
                  </Text>
                  <Ionicons name={showCompleted ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
                {showCompleted && completedTasks.map(task => (
                  <TaskCard key={task.id} task={task}
                    onToggle={() => toggleComplete(task.id)}
                    onDelete={() => confirmDelete(task.id, task.title)}
                    onEdit={() => openEdit(task)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Add Task Modal (Airbnb bottom sheet) ── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { maxHeight: '92%' }]}>

            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {/* Modal header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editingTask ? 'Editar tarea' : 'Nueva tarea'}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }} style={styles.sheetClose}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Task type */}
              <Text style={styles.formLabel}>Tipo de tarea</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
                {TASK_TYPES.map(([type, info]) => (
                  <TouchableOpacity key={type}
                    style={[styles.typeChip, formType === type && {
                      backgroundColor: info.color + '25', borderColor: info.color,
                    }]}
                    onPress={() => setFormType(type)}>
                    <Ionicons name={info.icon as any} size={15} color={formType === type ? info.color : COLORS.textMuted} />
                    <Text style={[styles.typeChipText, formType === type && { color: info.color, fontWeight: '700' }]}>
                      {info.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title */}
              <Text style={styles.formLabel}>Título *</Text>
              <TextInput
                style={styles.input}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder={`Ej. ${TASK_TYPE_INFO[formType].label}`}
                placeholderTextColor={COLORS.textMuted}
              />

              {/* Description */}
              <Text style={styles.formLabel}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={formDesc}
                onChangeText={setFormDesc}
                placeholder="Detalles adicionales..."
                placeholderTextColor={COLORS.textMuted}
                multiline
              />

              {/* Date + Time */}
              <View style={styles.dateRow}>
                <View style={{ flex: 3 }}>
                  <Text style={styles.formLabel}>Fecha * (DD/MM/AAAA)</Text>
                  <TextInput style={styles.input} value={formDate} onChangeText={setFormDate}
                    placeholder="03/05/2026" placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad" maxLength={10} />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={styles.formLabel}>Hora (HH:MM)</Text>
                  <TextInput style={styles.input} value={formTime} onChangeText={setFormTime}
                    placeholder="08:00" placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad" maxLength={5} />
                </View>
              </View>

              {/* Recurrence */}
              <Text style={styles.formLabel}>Repetición</Text>
              <View style={styles.recRow}>
                {RECURRENCES.map(([rec, label]) => (
                  <TouchableOpacity key={rec}
                    style={[styles.recChip, formRecurrence === rec && styles.recChipOn]}
                    onPress={() => setFormRecurrence(rec)}>
                    <Text style={[styles.recChipText, formRecurrence === rec && styles.recChipTextOn]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formRecurrence !== 'none' && (
                <View style={styles.recInfo}>
                  <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.recInfoText}>Al completar, se creará la siguiente tarea automáticamente.</Text>
                </View>
              )}

              <View style={{ height: SPACING.md }} />
            </ScrollView>

            {/* Buttons */}
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>{editingTask ? 'Guardar cambios' : 'Crear tarea'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl, paddingBottom: SPACING.md,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text, letterSpacing: -0.5 },
  headerAlert: { fontSize: 13, fontFamily: FONTS.sansSb, color: COLORS.error, marginTop: 2, fontWeight: '600' },
  headerSub:   { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textMuted, marginTop: 2 },
  addBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.md,
  },
  addBtnDisabled: { backgroundColor: COLORS.textMuted },

  // Aquarium tabs
  aqTabs: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.md },
  aqTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  aqTabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '12' },
  aqTabText:       { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.sans },
  aqTabTextActive: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },
  aqTabBadge: {
    backgroundColor: COLORS.error, borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  aqTabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', fontFamily: FONTS.sansEb },

  // Stats
  statsRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1, backgroundColor: COLORS.backgroundCard,
    borderRadius: 20, padding: SPACING.md,
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statValue: { fontSize: 22, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text },
  statLabel: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted, textAlign: 'center' },

  // Group
  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupLabel: {
    fontSize: 12, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.textMuted,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  // Task card
  taskCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 20,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  taskCardDone:    { opacity: 0.55 },
  taskCardOverdue: { borderColor: COLORS.error + '55', backgroundColor: COLORS.error + '14' },

  taskCheckWrap: { padding: SPACING.md, paddingRight: SPACING.sm, paddingTop: 18 },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },

  taskContent: { flex: 1, paddingVertical: SPACING.md, paddingRight: SPACING.sm },
  taskTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  taskTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  taskTagText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.sansBd },
  recTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  recTagText: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted },

  taskTitle:     { fontSize: 15, fontWeight: '700', fontFamily: FONTS.sansBd, color: COLORS.text, marginBottom: 2 },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  taskDesc:      { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textSecondary, marginBottom: 5, lineHeight: 18 },

  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskMetaText: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted },

  taskActions: { paddingTop: SPACING.md, paddingRight: SPACING.sm, gap: 8 },
  taskActionBtn: { padding: 4 },

  // Completed toggle
  completedToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.backgroundCard, borderRadius: 20,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  completedToggleText: { flex: 1, color: COLORS.textSecondary, fontWeight: '700', fontFamily: FONTS.sansBd, fontSize: 14 },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 64, paddingHorizontal: SPACING.xl },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 22, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm, letterSpacing: -0.3 },
  emptySub:   { fontSize: 14, fontFamily: FONTS.sans, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: SPACING.lg },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full,
    paddingVertical: 13, paddingHorizontal: 24,
  },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontFamily: FONTS.sansEb, fontSize: 15 },

  // ── Modal / Bottom sheet ──────────────────────────────────────────────────
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.backgroundLight,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    flexDirection: 'column',
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text },
  sheetClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.border + '44',
    alignItems: 'center', justifyContent: 'center',
  },

  formLabel: {
    fontSize: 12, fontWeight: '700', fontFamily: FONTS.sansBd, color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: SPACING.xs, marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 14, padding: 14,
    color: COLORS.text, fontSize: 15, fontFamily: FONTS.sans,
    borderWidth: 1, borderColor: COLORS.border,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', gap: SPACING.sm },

  typeRow: { gap: SPACING.sm, paddingBottom: SPACING.xs },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  typeChipText: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted },

  recRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  recChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  recChipOn: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  recChipText:   { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textMuted },
  recChipTextOn: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },

  recInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary + '12', borderRadius: 12,
    padding: SPACING.sm, marginBottom: SPACING.xs,
  },
  recInfoText: { flex: 1, fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textSecondary },

  // Buttons
  sheetBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: {
    flex: 1, padding: 15, borderRadius: 16,
    backgroundColor: COLORS.border + '44', alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontFamily: FONTS.sansSb, fontSize: 15 },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 15, borderRadius: 16, backgroundColor: COLORS.primary,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontFamily: FONTS.sansEb, fontSize: 15 },
});
