/**
 * SupportScreen — Reportar un error / sugerencia (ticket de soporte).
 * Descripción + categoría + captura de pantalla opcional → Supabase.
 * Abajo lista "Mis reportes" con su estado.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { FishImage as Image } from '../../components/FishImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useTickets, TicketCategory, TicketStatus } from '../../hooks/useTickets';

const CATS: { value: TicketCategory; label: string; icon: string }[] = [
  { value: 'bug',        label: 'Error',      icon: 'bug-outline' },
  { value: 'suggestion', label: 'Sugerencia', icon: 'bulb-outline' },
  { value: 'other',      label: 'Otro',       icon: 'ellipsis-horizontal' },
];

const STATUS_META: Record<TicketStatus, { label: string; color: string }> = {
  open:        { label: 'Abierto',    color: COLORS.warning },
  in_progress: { label: 'En proceso', color: COLORS.primary },
  resolved:    { label: 'Resuelto',   color: COLORS.success },
};

export default function SupportScreen({ navigation }: any) {
  const { tickets, loading, createTicket } = useTickets();
  const [category,    setCategory]    = useState<TicketCategory>('bug');
  const [description, setDescription] = useState('');
  const [shotUri,     setShotUri]     = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);

  async function pickShot() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso denegado', 'Sin acceso a la galería'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!res.canceled && res.assets[0]?.uri) setShotUri(res.assets[0].uri);
  }

  function submit() {
    if (!description.trim()) { Alert.alert('Falta descripción', 'Describe el error o sugerencia.'); return; }
    setSubmitting(true);
    setTimeout(async () => {
      try {
        const ok = await createTicket(category, description, shotUri ?? undefined);
        if (ok) {
          setDescription(''); setShotUri(null); setCategory('bug');
          Alert.alert('¡Gracias!', 'Tu reporte fue enviado. Lo revisaremos pronto.');
        } else {
          Alert.alert('Error', 'No se pudo enviar el reporte. Inténtalo de nuevo.');
        }
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'No se pudo enviar.');
      } finally { setSubmitting(false); }
    }, 50);
  }

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={S.root}>
      <View style={S.topBar}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={S.title}>Reportar un error</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 90 }} keyboardShouldPersistTaps="handled">
        <Text style={S.intro}>¿Algo no funciona o tienes una idea? Cuéntanos y lo revisaremos.</Text>

        {/* Categoría */}
        <Text style={S.label}>Tipo</Text>
        <View style={S.chipRow}>
          {CATS.map(c => {
            const on = category === c.value;
            return (
              <TouchableOpacity key={c.value} style={[S.chip, on && S.chipOn]} onPress={() => setCategory(c.value)}>
                <Ionicons name={c.icon as any} size={15} color={on ? '#fff' : COLORS.textMuted} />
                <Text style={[S.chipText, on && S.chipTextOn]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Descripción */}
        <Text style={S.label}>Descripción</Text>
        <TextInput
          style={S.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe qué pasó, en qué pantalla y los pasos para reproducirlo…"
          placeholderTextColor={COLORS.textMuted}
          multiline maxLength={1000}
        />

        {/* Captura */}
        <Text style={S.label}>Captura de pantalla (opcional)</Text>
        {shotUri ? (
          <View style={{ marginBottom: SPACING.sm }}>
            <Image source={{ uri: shotUri }} style={S.shot} resizeMode="cover" />
            <TouchableOpacity style={S.shotRemove} onPress={() => setShotUri(null)}>
              <Ionicons name="close-circle" size={26} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={S.shotBtn} onPress={pickShot}>
            <Ionicons name="image-outline" size={20} color={COLORS.primary} />
            <Text style={S.shotBtnText}>Adjuntar captura</Text>
          </TouchableOpacity>
        )}

        {/* Enviar */}
        <TouchableOpacity style={[S.submitBtn, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <><Ionicons name="paper-plane-outline" size={17} color="#fff" /><Text style={S.submitText}>Enviar reporte</Text></>
          )}
        </TouchableOpacity>

        {/* Mis reportes */}
        <Text style={[S.label, { marginTop: SPACING.lg }]}>Mis reportes</Text>
        {loading ? (
          <Text style={S.muted}>Cargando…</Text>
        ) : tickets.length === 0 ? (
          <Text style={S.muted}>Aún no has enviado reportes.</Text>
        ) : tickets.map(t => {
          const meta = STATUS_META[t.status] ?? STATUS_META.open;
          return (
            <View key={t.id} style={S.ticketCard}>
              {t.image_url ? <Image source={{ uri: t.image_url }} style={S.ticketThumb} resizeMode="cover" /> : null}
              <View style={{ flex: 1 }}>
                <Text style={S.ticketDesc} numberOfLines={3}>{t.description}</Text>
                <Text style={S.ticketDate}>
                  {new Date(t.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <View style={[S.statusPill, { backgroundColor: meta.color + '1f' }]}>
                <Text style={[S.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.backgroundCard,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  intro: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19, marginBottom: SPACING.md, fontFamily: FONTS.sans },

  label: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6, fontFamily: FONTS.sansSb },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 16, backgroundColor: COLORS.backgroundCard, borderWidth: 1, borderColor: COLORS.border,
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.sansSb },
  chipTextOn: { color: '#fff', fontFamily: FONTS.sansBd },

  input: {
    backgroundColor: COLORS.backgroundCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, color: COLORS.text,
    minHeight: 110, textAlignVertical: 'top', fontFamily: FONTS.sans, marginBottom: SPACING.md,
  },
  shot: { width: '100%', height: 200, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.backgroundLight },
  shotRemove: { position: 'absolute', top: 8, right: 8 },
  shotBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderStyle: 'dashed',
    borderColor: COLORS.primary, backgroundColor: COLORS.primary + '0d', marginBottom: SPACING.md,
  },
  shotBtnText: { color: COLORS.primary, fontFamily: FONTS.sansSb, fontSize: 14 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: BORDER_RADIUS.xl, backgroundColor: COLORS.primary,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: FONTS.sansBd },

  muted: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', paddingVertical: SPACING.sm, fontFamily: FONTS.sans },
  ticketCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  ticketThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORS.backgroundLight },
  ticketDesc: { fontSize: 13, color: COLORS.text, fontFamily: FONTS.sans, lineHeight: 18 },
  ticketDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 3, fontFamily: FONTS.sans },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.sansBd },
});
