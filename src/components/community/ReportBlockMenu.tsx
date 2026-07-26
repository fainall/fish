/**
 * ReportBlockMenu — Bottom-sheet para reportar contenido y bloquear autores.
 *
 * Requisito de Play Store para apps con UGC (contenido generado por usuarios).
 * Se abre desde el icono de "3 puntos" en cada post o comentario, y desde el
 * perfil de otro usuario.
 *
 * Props:
 *   - target: 'post' | 'comment' | 'user'
 *   - targetId: id del contenido reportado (o del usuario si target='user')
 *   - targetUserId: id del autor (o el mismo que targetId si target='user')
 *   - targetUserName: nombre a mostrar
 *   - visible / onClose
 *   - onBlocked (opcional): callback tras bloquear
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useTickets, ReportTarget } from '../../hooks/useTickets';
import { useBlocks } from '../../hooks/useBlocks';

interface Props {
  visible:         boolean;
  onClose:         () => void;
  target:          ReportTarget;
  targetId:        string;
  targetUserId:    string;
  targetUserName:  string;
  onBlocked?:      () => void;
}

const REASONS: { key: string; label: string }[] = [
  { key: 'spam',        label: 'Spam o publicidad no deseada' },
  { key: 'harassment',  label: 'Acoso, insultos o bullying' },
  { key: 'hate',        label: 'Discurso de odio o discriminación' },
  { key: 'sexual',      label: 'Contenido sexual o desnudez' },
  { key: 'violence',    label: 'Violencia o contenido gráfico' },
  { key: 'misinfo',     label: 'Información engañosa o peligrosa' },
  { key: 'impersonate', label: 'Suplantación de identidad' },
  { key: 'other',       label: 'Otro (describir abajo)' },
];

export default function ReportBlockMenu({
  visible, onClose, target, targetId, targetUserId, targetUserName, onBlocked,
}: Props) {
  const { user } = useAuth();
  const { reportContent } = useTickets();
  const { block, isBlocked } = useBlocks();

  const [step, setStep] = useState<'menu' | 'report'>('menu');
  const [reasonKey, setReasonKey] = useState<string>('spam');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);

  const canBlock = useMemo(
    () => !!user && !!targetUserId && targetUserId !== user.id && !isBlocked(targetUserId),
    [user?.id, targetUserId, isBlocked],
  );

  function reset() { setStep('menu'); setReasonKey('spam'); setExtra(''); setBusy(false); }
  function handleClose() { reset(); onClose(); }

  async function handleBlock() {
    if (!canBlock) return;
    const ok = await block(targetUserId);
    if (ok) {
      onBlocked?.();
      Alert.alert('Usuario bloqueado', `Ya no verás publicaciones ni comentarios de ${targetUserName}.`);
      handleClose();
    } else {
      Alert.alert('Error', 'No se pudo bloquear al usuario. Intenta de nuevo.');
    }
  }

  async function handleSubmitReport() {
    const reason = REASONS.find(r => r.key === reasonKey)?.label ?? reasonKey;
    const full = extra.trim() ? `${reason} — ${extra.trim()}` : reason;
    setBusy(true);
    const ok = await reportContent(target, targetId, targetUserId || null, full);
    setBusy(false);
    if (ok) {
      Alert.alert('Reporte enviado', 'Gracias. Nuestro equipo lo revisará pronto.');
      handleClose();
    } else {
      Alert.alert('Error', 'No se pudo enviar el reporte. Intenta de nuevo.');
    }
  }

  const targetLabel =
    target === 'post'    ? 'esta publicación' :
    target === 'comment' ? 'este comentario' :
                           'este usuario';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={S.overlay}>
        <View style={S.sheet}>
          <View style={S.handle} />

          {step === 'menu' ? (
            <>
              <View style={S.header}>
                <Text style={S.title}>Opciones</Text>
                <TouchableOpacity style={S.closeBtn} onPress={handleClose}>
                  <Ionicons name="close" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={S.row} onPress={() => setStep('report')}>
                <View style={[S.rowIcon, { backgroundColor: COLORS.warning + '1f' }]}>
                  <Ionicons name="flag-outline" size={18} color={COLORS.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.rowTitle}>Reportar {targetLabel}</Text>
                  <Text style={S.rowSub}>Envía un reporte al equipo de moderación.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>

              {canBlock ? (
                <TouchableOpacity style={S.row} onPress={handleBlock}>
                  <View style={[S.rowIcon, { backgroundColor: COLORS.error + '1f' }]}>
                    <Ionicons name="person-remove-outline" size={18} color={COLORS.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.rowTitle, { color: COLORS.error }]}>Bloquear a {targetUserName}</Text>
                    <Text style={S.rowSub}>Ocultará sus publicaciones y comentarios.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : isBlocked(targetUserId) ? (
                <View style={S.row}>
                  <View style={[S.rowIcon, { backgroundColor: COLORS.textMuted + '1f' }]}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.rowTitle, { color: COLORS.textMuted }]}>Usuario bloqueado</Text>
                    <Text style={S.rowSub}>Puedes desbloquearlo desde tu perfil.</Text>
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={S.header}>
                <TouchableOpacity onPress={() => setStep('menu')} style={{ paddingRight: 8 }}>
                  <Ionicons name="arrow-back" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={[S.title, { flex: 1 }]}>Reportar</Text>
                <TouchableOpacity style={S.closeBtn} onPress={handleClose}>
                  <Ionicons name="close" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={S.intro}>Selecciona el motivo. Nuestro equipo revisa cada reporte.</Text>

              <View style={S.reasons}>
                {REASONS.map(r => {
                  const on = reasonKey === r.key;
                  return (
                    <TouchableOpacity key={r.key} style={[S.reason, on && S.reasonOn]}
                      onPress={() => setReasonKey(r.key)}>
                      <View style={[S.radio, on && S.radioOn]}>
                        {on ? <View style={S.radioDot} /> : null}
                      </View>
                      <Text style={[S.reasonText, on && S.reasonTextOn]}>{r.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={S.extra}
                value={extra}
                onChangeText={setExtra}
                placeholder="Comentario adicional (opcional)…"
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={500}
              />

              <TouchableOpacity
                style={[S.submitBtn, busy && { opacity: 0.6 }]}
                onPress={handleSubmitReport}
                disabled={busy}
              >
                {busy ? <ActivityIndicator color="#fff" /> : (
                  <><Ionicons name="paper-plane-outline" size={16} color="#fff" />
                    <Text style={S.submitText}>Enviar reporte</Text></>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.backgroundCard, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: SPACING.md, paddingTop: 8, paddingBottom: SPACING.xxl,
  },
  handle: {
    width: 42, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, marginBottom: 6,
  },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.backgroundLight,
    alignItems: 'center', justifyContent: 'center',
  },
  intro: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md, fontFamily: FONTS.sans },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.sans },

  reasons: { marginBottom: SPACING.md, gap: 6 },
  reason: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  reasonOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  reasonText: { flex: 1, fontSize: 13.5, color: COLORS.text, fontFamily: FONTS.sans },
  reasonTextOn: { color: COLORS.primary, fontFamily: FONTS.sansSb },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: COLORS.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },

  extra: {
    backgroundColor: COLORS.backgroundLight, borderRadius: BORDER_RADIUS.md,
    padding: 12, minHeight: 80, textAlignVertical: 'top',
    color: COLORS.text, fontFamily: FONTS.sans, fontSize: 13.5,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.xl,
    paddingVertical: 14,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: FONTS.sansBd },
});
