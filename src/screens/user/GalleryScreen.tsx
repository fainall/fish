/**
 * GalleryScreen (#14) — Photo timeline of the selected aquarium.
 * 2-column grid + tap to view fullscreen + caption.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Alert,
  Modal, ScrollView, TextInput, ActivityIndicator, InteractionManager,
} from 'react-native';
import { FishImage as Image } from '../../components/FishImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useAquariums } from '../../hooks/useAquariums';
import { useAquariumGallery, GalleryPhoto } from '../../hooks/useAquariumGallery';
import { confirmAction } from '../../utils/confirm';

export default function GalleryScreen({ navigation }: any) {
  const { aquariums, selectedAquarium, selectAquarium } = useAquariums();
  const { add, remove, forAquarium } = useAquariumGallery();

  const [viewing,    setViewing]    = useState<GalleryPhoto | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [caption,    setCaption]    = useState('');

  const photos = useMemo(
    () => selectedAquarium ? forAquarium(selectedAquarium.id) : [],
    [selectedAquarium, forAquarium],
  );

  // Group by month for timeline view
  const grouped = useMemo(() => {
    const groups: Record<string, GalleryPhoto[]> = {};
    photos.forEach(p => {
      const d = new Date(p.taken_at);
      const key = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.entries(groups);
  }, [photos]);

  async function pickAndShow(source: 'gallery' | 'camera') {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso denegado', 'Sin acceso a ' + source); return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!result.canceled && result.assets[0]?.uri) {
      setPendingUri(result.assets[0].uri);
      setCaption('');
    }
  }

  function confirmUpload() {
    if (!pendingUri || !selectedAquarium) return;
    setUploading(true);
    // Run in setTimeout to fully isolate from React's render cycle
    const uri = pendingUri;
    const aqId = selectedAquarium.id;
    const cap = caption.trim() || undefined;
    setTimeout(async () => {
      try {
        await add(aqId, uri, cap);
        setUploading(false);
        setPendingUri(null);
        setCaption('');
      } catch (e: any) {
        setUploading(false);
        setPendingUri(null);
        setCaption('');
        const msg = e?.message ?? String(e);
        Alert.alert('Error al subir foto', msg);
      }
    }, 50);
  }

  if (!selectedAquarium) {
    return (
      <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={S.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={S.topBar}>
          <TouchableOpacity style={S.backBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={S.title}>Galería</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={S.empty}>
          <Ionicons name="images-outline" size={56} color={COLORS.textMuted} />
          <Text style={S.emptyTitle}>Sin acuario seleccionado</Text>
          <Text style={S.emptyText}>Crea un acuario primero para añadir fotos a su galería.</Text>
        </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={S.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* Top bar */}
      <View style={S.topBar}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={S.title}>Galería</Text>
          <Text style={S.subtitle}>{selectedAquarium.name} · {photos.length} fotos</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Aquarium selector */}
      {aquariums.length > 1 && (
        <View style={S.aqSelectorWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={S.aqSelector}
            contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.md, alignItems: 'center' }}>
            {aquariums.map(aq => (
              <TouchableOpacity key={aq.id}
                style={[S.aqChip, selectedAquarium.id === aq.id && S.aqChipOn]}
                onPress={() => selectAquarium(aq.id)}>
                <Text style={[S.aqChipText, selectedAquarium.id === aq.id && S.aqChipTextOn]} numberOfLines={1}>
                  {aq.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Add buttons */}
      <View style={{ flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm }}>
        <TouchableOpacity style={S.addBtn} onPress={() => pickAndShow('gallery')}>
          <Ionicons name="images-outline" size={18} color="#fff" />
          <Text style={S.addBtnText}>Galería</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.addBtn, { backgroundColor: COLORS.accent }]} onPress={() => pickAndShow('camera')}>
          <Ionicons name="camera-outline" size={18} color="#fff" />
          <Text style={S.addBtnText}>Cámara</Text>
        </TouchableOpacity>
      </View>

      {/* Photos timeline */}
      {photos.length === 0 ? (
        <View style={S.empty}>
          <Ionicons name="images-outline" size={56} color={COLORS.textMuted} />
          <Text style={S.emptyTitle}>Sin fotos aún</Text>
          <Text style={S.emptyText}>Toca "Galería" o "Cámara" para añadir la primera.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 80 }}>
          {grouped.map(([month, items]) => (
            <View key={month} style={{ marginBottom: SPACING.md }}>
              <Text style={S.monthLabel}>{month}</Text>
              <View style={S.grid}>
                {items.map(p => (
                  <TouchableOpacity key={p.id} style={S.gridItem} onPress={() => setViewing(p)}>
                    <Image source={{ uri: p.image_url }} style={S.thumb} />
                    {p.caption && (
                      <View style={S.captionBar}>
                        <Text style={S.captionText} numberOfLines={1}>{p.caption}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Upload preview modal */}
      <Modal visible={!!pendingUri} animationType="slide" transparent onRequestClose={() => setPendingUri(null)}>
        <View style={S.modalOverlay}>
          <View style={S.uploadSheet}>
            <Text style={S.uploadTitle}>📸 Nueva foto</Text>
            {pendingUri && <Image source={{ uri: pendingUri }} style={S.preview} />}
            <Text style={S.label}>Descripción (opcional)</Text>
            <TextInput
              style={S.input}
              value={caption}
              onChangeText={setCaption}
              placeholder='"Hoy aparecieron crías", "Cambié el filtro"…'
              placeholderTextColor={COLORS.textMuted}
              maxLength={140}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }}>
              <TouchableOpacity style={S.cancelBtn} onPress={() => { setPendingUri(null); setCaption(''); }}>
                <Text style={S.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.saveBtn, uploading && { opacity: 0.6 }]} onPress={confirmUpload} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#fff" size="small" /> :
                  <><Ionicons name="cloud-upload-outline" size={16} color="#fff" /><Text style={S.saveText}>Subir</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View fullscreen modal */}
      <Modal visible={!!viewing} transparent onRequestClose={() => setViewing(null)}>
        <View style={S.viewerRoot}>
          <TouchableOpacity style={S.closeBtn} onPress={() => setViewing(null)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {viewing && (
            <>
              <Image source={{ uri: viewing.image_url }} style={S.fullImg} resizeMode="contain" />
              <View style={S.viewerInfo}>
                {viewing.caption && <Text style={S.viewerCaption}>{viewing.caption}</Text>}
                <Text style={S.viewerDate}>
                  {new Date(viewing.taken_at).toLocaleDateString('es-ES', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </Text>
                <TouchableOpacity
                  style={S.deleteBtn}
                  onPress={() => confirmAction('Eliminar foto', '¿Eliminar esta foto de la galería?', async () => {
                    if (viewing) { await remove(viewing.id); setViewing(null); }
                  }, 'Eliminar')}
                >
                  <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                  <Text style={S.deleteText}>Eliminar foto</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  title:    { fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd, textAlign: 'center' },
  subtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, fontFamily: FONTS.sans, textAlign: 'center' },

  // Fixed-height wrapper so the horizontal ScrollView can NEVER stretch the
  // chips to full screen height (native ignores flexGrow:0 alone here).
  aqSelectorWrap: { height: 44, marginBottom: SPACING.sm },
  aqSelector: { flexGrow: 0, flexShrink: 0 },
  aqChip: {
    height: 36, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: COLORS.backgroundCard, borderWidth: 1, borderColor: COLORS.border,
  },
  aqChipOn:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  aqChipText:  { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.sansSb },
  aqChipTextOn:{ color: '#fff', fontWeight: '700', fontFamily: FONTS.sansBd },

  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.xl,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, fontFamily: FONTS.sansBd },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansEb },
  emptyText:  { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, fontFamily: FONTS.sans },

  monthLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5,
    fontFamily: FONTS.sansBd,
  },
  grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  gridItem:{ width: '48%', aspectRatio: 1, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.backgroundCard },
  thumb:   { width: '100%', height: '100%' },
  captionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 6, backgroundColor: 'rgba(0,0,0,0.55)' },
  captionText:{ color: '#fff', fontSize: 11, fontFamily: FONTS.sans },

  // Upload sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  uploadSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.lg,
  },
  uploadTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md, fontFamily: FONTS.sansEb },
  preview: { width: '100%', height: 220, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md, backgroundColor: COLORS.backgroundLight },
  label:   { fontSize: 12, color: COLORS.textMuted, marginBottom: 4, fontFamily: FONTS.sans },
  input: {
    backgroundColor: COLORS.backgroundCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, color: COLORS.text,
    minHeight: 60, textAlignVertical: 'top', fontFamily: FONTS.sans,
  },
  cancelBtn: {
    flex: 1, padding: SPACING.md, alignItems: 'center', borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.backgroundCard, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelText: { color: COLORS.text, fontFamily: FONTS.sansSb },
  saveBtn: {
    flex: 1, flexDirection: 'row', padding: SPACING.md, alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.primary,
  },
  saveText: { color: '#fff', fontFamily: FONTS.sansBd, fontWeight: '700' },

  // Fullscreen viewer
  viewerRoot: { flex: 1, backgroundColor: '#000' },
  closeBtn: {
    position: 'absolute', top: 50, right: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  fullImg: { flex: 1, width: '100%' },
  viewerInfo: { padding: SPACING.lg, gap: 6, backgroundColor: 'rgba(0,0,0,0.7)' },
  viewerCaption: { color: '#fff', fontSize: 15, fontFamily: FONTS.sansSb },
  viewerDate:    { color: '#aaa', fontSize: 12, fontFamily: FONTS.sans },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, marginTop: 8,
    borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#ff6b6b' + '55',
  },
  deleteText: { color: '#ff6b6b', fontFamily: FONTS.sansBd, fontWeight: '700' },
});
