import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, Image, KeyboardAvoidingView, Platform,
  ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useFishDatabase, EditableFish } from '../../hooks/useFishDatabase';
import { useFishSuggestions } from '../../hooks/useFishSuggestions';
import { useAdminConversations, AdminConversation } from '../../hooks/useAdminConversations';
import { useTickets, TicketStatus } from '../../hooks/useTickets';
import { useAdminAnalytics } from '../../hooks/useAdminAnalytics';
import { WaterType, AggressionLevel, FishSuggestion, SuggestionStatus } from '../../types';
import { confirmAction } from '../../utils/confirm';
import { supabase, IS_DEMO_MODE } from '../../services/supabase';

// ── Small helpers ─────────────────────────────────────────────────────────────
function Pill({ name, size = 38 }: { name: string; size?: number }) {
  const initials = (name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const palette  = ['#00b4d8', '#0077b6', '#7209b7', '#3a0ca3', '#f72585', '#4cc9f0'];
  const bg       = palette[name.charCodeAt(0) % palette.length];
  return (
    <View style={[pill.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[pill.text, { fontSize: size * 0.37 }]}>{initials}</Text>
    </View>
  );
}
const pill = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700', fontFamily: FONTS.sansBd },
});

// ── Ficha completeness (% of key fields filled) ───────────────────────────────
const COMPLETENESS_FIELDS = [
  'common_name', 'scientific_name', 'family', 'origin', 'habitat', 'adult_size_cm', 'lifespan_years',
  'temp_min', 'temp_max', 'ph_min', 'ph_max', 'gh_min', 'gh_max', 'water_level', 'min_tank_liters',
  'diet', 'food_types', 'description', 'water_type', 'difficulty', 'breeding_method',
  'sexual_dimorphism', 'compatible_with', 'image_url',
] as const;
function fishCompleteness(f: any): number {
  const filled = COMPLETENESS_FIELDS.filter(k => {
    const v = f?.[k];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'number') return !isNaN(v);
    if (typeof v === 'boolean') return true;
    return v != null && String(v).trim() !== '';
  }).length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}
function completenessColor(pct: number): string {
  return pct >= 80 ? COLORS.success : pct >= 50 ? COLORS.warning : COLORS.error;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminDashboardScreen() {
  const { height: winH } = useWindowDimensions();
  const { user, signOut } = useAuth();
  const { fish: fishList, updateFish, addFish, deleteFish, resetToDefault } = useFishDatabase();
  const { suggestions, pendingCount, approveSuggestion, rejectSuggestion, deleteSuggestion } = useFishSuggestions();
  const { conversations, loadMessages, sendAdminReply: persistReply, markRead } = useAdminConversations();
  const { tickets, updateStatus: updateTicketStatus } = useTickets();
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const analytics = useAdminAnalytics();

  type Tab = 'dashboard' | 'metrics' | 'chat' | 'fish' | 'suggestions' | 'tickets';
  const [activeTab,      setActiveTab]      = useState<Tab>('dashboard');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const selectedConv = conversations.find(c => c.id === selectedConvId) ?? null;
  const [adminReply, setAdminReply]   = useState('');
  const [fishSearch, setFishSearch]   = useState('');
  const [editingFish, setEditingFish] = useState<EditableFish | null>(null);
  const [showEditor,  setShowEditor]  = useState(false);
  const [isNewFish,   setIsNewFish]   = useState(false);
  const [pickingImg,  setPickingImg]  = useState(false);

  const [userCount,     setUserCount]     = useState<number | null>(null);
  const [postCount,     setPostCount]     = useState<number | null>(null);
  const [aquariumCount, setAquariumCount] = useState<number | null>(null);
  useEffect(() => {
    if (IS_DEMO_MODE) { setUserCount(1); setPostCount(0); setAquariumCount(0); return; }
    const fetchCount = async (table: string, setter: (n: number) => void) => {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error && count !== null) setter(count);
      } catch (e) { console.warn(`[AdminDash] ${table} count failed:`, e); }
    };
    fetchCount('users', setUserCount);
    fetchCount('posts', setPostCount);
    fetchCount('aquariums', setAquariumCount);
  }, []);

  const [selectedSugg,       setSelectedSugg]       = useState<FishSuggestion | null>(null);
  const [showSuggDetail,     setShowSuggDetail]      = useState(false);
  const [rejectReason,       setRejectReason]        = useState('');
  const [showRejectInput,    setShowRejectInput]      = useState(false);

  const sortedSuggestions = useMemo(() =>
    [...suggestions].sort((a, b) => {
      const order: Record<SuggestionStatus, number> = { pending: 0, approved: 1, rejected: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }), [suggestions]);

  const filteredFish = useMemo(() =>
    fishList.filter(f =>
      f.common_name.toLowerCase().includes(fishSearch.toLowerCase()) ||
      f.scientific_name.toLowerCase().includes(fishSearch.toLowerCase())
    ), [fishList, fishSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openEdit(fish: EditableFish) { setEditingFish({ ...fish }); setIsNewFish(false); setShowEditor(true); }

  function openNew() {
    setEditingFish({
      id: '', common_name: '', scientific_name: '', family: '', origin: '',
      adult_size_cm: 5, temp_min: 24, temp_max: 28, ph_min: 6.5, ph_max: 7.5,
      gh_min: 5, gh_max: 15, water_level: 'middle', aggression: 2,
      min_tank_liters: 40, diet: '', description: '', is_schooling: false,
      water_type: 'freshwater', tags: [], approved: true, created_by: 'admin', image_url: undefined,
    });
    setIsNewFish(true); setShowEditor(true);
  }

  async function openFromSuggestion(s: FishSuggestion) {
    setEditingFish({
      id: '', common_name: s.common_name, scientific_name: s.scientific_name,
      family: s.family ?? '', origin: s.origin ?? '', adult_size_cm: s.adult_size_cm ?? 5,
      temp_min: s.temp_min ?? 24, temp_max: s.temp_max ?? 28, ph_min: s.ph_min ?? 6.5,
      ph_max: s.ph_max ?? 7.5, gh_min: s.gh_min ?? 5, gh_max: s.gh_max ?? 15,
      water_level: 'middle', aggression: 2, min_tank_liters: s.min_tank_liters ?? 40,
      diet: '', description: s.description ?? '', image_url: s.image_url ?? undefined,
      is_schooling: false, water_type: s.water_type ?? 'freshwater',
      tags: [], approved: true, created_by: s.user_id ?? null,
    });
    setIsNewFish(true); setShowSuggDetail(false);
    await approveSuggestion(s.id); setShowEditor(true);
  }

  async function handleReject() {
    if (!selectedSugg) return;
    await rejectSuggestion(selectedSugg.id, rejectReason.trim() || undefined);
    setShowRejectInput(false); setRejectReason('');
    setShowSuggDetail(false); setSelectedSugg(null);
  }

  async function saveEdit() {
    if (!editingFish) return;
    if (!editingFish.common_name.trim() || !editingFish.scientific_name.trim()) {
      Alert.alert('Error', 'Nombre común y científico son obligatorios.'); return;
    }
    if (isNewFish) await addFish(editingFish); else await updateFish(editingFish.id, editingFish);
    setShowEditor(false); setEditingFish(null);
  }

  function confirmDelete(fish: EditableFish) {
    confirmAction('Eliminar especie', `¿Eliminar ${fish.common_name}?`, () => deleteFish(fish.id));
  }

  function patch(field: keyof EditableFish, value: any) {
    setEditingFish(prev => prev ? { ...prev, [field]: value } : prev);
  }

  // ── Editor field render helpers (called inline → no input focus loss) ────────
  const ef = editingFish;
  const txtField = (label: string, field: keyof EditableFish, multiline = false) => (
    <View style={S.fieldRow} key={field}>
      <Text style={S.fieldLabel}>{label}</Text>
      <TextInput
        style={[S.fieldInput, multiline && { minHeight: 70, textAlignVertical: 'top' }]}
        value={String(ef?.[field] ?? '')}
        onChangeText={v => patch(field, v)}
        placeholder={label} placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
      />
    </View>
  );
  const arrField = (label: string, field: keyof EditableFish, placeholder = 'Separar por comas') => (
    <View style={S.fieldRow} key={field}>
      <Text style={S.fieldLabel}>{label}</Text>
      <TextInput
        style={S.fieldInput}
        value={Array.isArray(ef?.[field]) ? (ef![field] as any[]).join(', ') : ''}
        onChangeText={v => patch(field, v.split(',').map(s => s.trim()).filter(Boolean))}
        placeholder={placeholder} placeholderTextColor={COLORS.textMuted}
      />
    </View>
  );
  const toggleField = (label: string, field: keyof EditableFish) => {
    const on = !!ef?.[field];
    return (
      <View style={S.toggleRow} key={field}>
        <Text style={S.fieldLabel}>{label}</Text>
        <TouchableOpacity style={[S.toggle, on && S.toggleOn]} onPress={() => patch(field, !on)}>
          <View style={[S.toggleThumb, on && S.toggleThumbOn]} />
        </TouchableOpacity>
      </View>
    );
  };
  const enumChips = (label: string, field: keyof EditableFish, options: { value: any; label: string }[]) => (
    <View style={S.fieldRow} key={field}>
      <Text style={S.fieldLabel}>{label}</Text>
      <View style={S.chipRow}>
        {options.map(opt => {
          const on = ef?.[field] === opt.value;
          return (
            <TouchableOpacity key={String(opt.value)} style={[S.chip, on && S.chipOn]} onPress={() => patch(field, opt.value)}>
              <Text style={[S.chipText, on && S.chipTextOn]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
  const numGrid = (fields: { label: string; field: keyof EditableFish }[]) => (
    <View style={S.paramGrid}>
      {fields.map(({ label, field }) => (
        <View key={field} style={S.paramField}>
          <Text style={S.paramLabel}>{label}</Text>
          <TextInput style={[S.fieldInput, { textAlign: 'center' }]}
            value={ef?.[field] != null ? String(ef[field]) : ''}
            onChangeText={v => patch(field, v === '' ? undefined : (parseFloat(v) || 0))}
            keyboardType="decimal-pad" placeholder="—" placeholderTextColor={COLORS.textMuted} />
        </View>
      ))}
    </View>
  );

  async function uploadFishImage(localUri: string): Promise<string | null> {
    if (IS_DEMO_MODE) return localUri; // demo mode: keep local URI
    try {
      const ext  = (localUri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
      const safeExt = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
      const mime = safeExt === 'png' ? 'image/png' : safeExt === 'gif' ? 'image/gif' : safeExt === 'webp' ? 'image/webp' : 'image/jpeg';
      const path = `fish/${Date.now()}.${safeExt}`;
      // Read file natively into Uint8Array (SDK 54 File API — no XHR, no crash)
      const file = new File(localUri);
      if (!file.exists) { console.warn('[AdminDash] file not found:', localUri); return null; }
      const bytes = await file.bytes();
      const { error } = await (supabase as any).storage
        .from('posts').upload(path, bytes, { contentType: mime, upsert: false });
      if (error) return null;
      const { data } = (supabase as any).storage.from('posts').getPublicUrl(path);
      return (data?.publicUrl as string) ?? null;
    } catch (e) { console.warn('[AdminDash] Image upload failed:', e); return null; }
  }

  async function pickImage(source: 'gallery' | 'camera') {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso denegado', 'Sin acceso a ' + source); return; }
    setPickingImg(true);
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!result.canceled && result.assets[0]?.uri) {
        const localUri = result.assets[0].uri;
        // Show local preview immediately
        patch('image_url', localUri);
        // Then upload to Supabase Storage and replace with public URL
        const publicUrl = await uploadFishImage(localUri);
        if (publicUrl) patch('image_url', publicUrl);
      }
    } finally { setPickingImg(false); }
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  //
  // SCROLL FIX: FlatList and ScrollView are DIRECT children of the root
  // LinearGradient (flex:1), same as CommunityScreen. No intermediate wrapper
  // Views — they would break the height chain on web.
  //
  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={S.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <View style={S.headerLeft}>
          <Pill name={user?.full_name ?? 'Admin'} size={44} />
          <View>
            <Text style={S.headerName}>{user?.full_name ?? 'Administrador'}</Text>
            <View style={S.adminBadge}>
              <Ionicons name="shield-checkmark" size={10} color={COLORS.warning} />
              <Text style={S.adminBadgeText}>Panel de administración</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={S.logoutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <View style={S.tabBar}>
        {([
          { key: 'dashboard',   label: 'Inicio',      icon: 'grid',        iconO: 'grid-outline' },
          { key: 'metrics',     label: 'Métricas',     icon: 'stats-chart', iconO: 'stats-chart-outline' },
          { key: 'chat',        label: 'Chats',        icon: 'chatbubbles', iconO: 'chatbubbles-outline' },
          { key: 'fish',        label: 'Peces',        icon: 'fish',        iconO: 'fish-outline' },
          { key: 'suggestions', label: 'Sugerencias',  icon: 'bulb',        iconO: 'bulb-outline' },
          { key: 'tickets',     label: 'Tickets',      icon: 'bug',         iconO: 'bug-outline' },
        ] as const).map(t => {
          const on = activeTab === t.key;
          return (
            <TouchableOpacity key={t.key} style={[S.tab, on && S.tabOn]} onPress={() => setActiveTab(t.key)}>
              <View>
                <Ionicons name={(on ? t.icon : t.iconO) as any} size={19} color={on ? COLORS.primary : COLORS.textMuted} />
                {t.key === 'suggestions' && pendingCount > 0 && (
                  <View style={S.dot}><Text style={S.dotText}>{pendingCount}</Text></View>
                )}
                {t.key === 'tickets' && openTickets > 0 && (
                  <View style={S.dot}><Text style={S.dotText}>{openTickets}</Text></View>
                )}
              </View>
              <Text style={[S.tabLabel, on && S.tabLabelOn]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          DASHBOARD — ScrollView direct child of root
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && (
        <View style={{ height: Math.max(winH - 180, 300), width: '100%' }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.screen, paddingTop: SPACING.md, paddingBottom: SPACING.xxl }}>

          {/* Stats grid */}
          <Text style={S.sectionTitle}>Resumen</Text>
          <View style={S.statsGrid}>
            {[
              { label: 'Usuarios',       value: userCount === null ? '…' : `${userCount}`, icon: 'people-outline', color: COLORS.primary },
              { label: 'Posts',          value: postCount === null ? '…' : `${postCount}`, icon: 'newspaper-outline', color: COLORS.accent },
              { label: 'Acuarios',       value: aquariumCount === null ? '…' : `${aquariumCount}`, icon: 'cube-outline', color: COLORS.primary },
              { label: 'Especies',       value: `${fishList.length}`, icon: 'fish-outline', color: COLORS.success },
              { label: 'Aprobadas',      value: `${fishList.filter(f => f.approved).length}`, icon: 'checkmark-circle-outline', color: COLORS.success },
              { label: 'Ocultas',        value: `${fishList.filter(f => !f.approved).length}`, icon: 'eye-off-outline', color: COLORS.warning },
              { label: 'Ficha media',    value: fishList.length ? `${Math.round(fishList.reduce((a, f) => a + fishCompleteness(f), 0) / fishList.length)}%` : '—', icon: 'stats-chart-outline', color: COLORS.accent },
              { label: 'Conversaciones', value: `${conversations.length}`, icon: 'chatbubbles-outline', color: COLORS.accent },
              { label: 'Sin responder',  value: `${conversations.filter(c => c.unread > 0).length}`, icon: 'time-outline', color: COLORS.warning },
            ].map(s => (
              <View key={s.label} style={S.statCard}>
                <View style={[S.statIcon, { backgroundColor: s.color + '18' }]}>
                  <Ionicons name={s.icon as any} size={20} color={s.color} />
                </View>
                <Text style={S.statValue}>{s.value}</Text>
                <Text style={S.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Pending suggestions banner */}
          {pendingCount > 0 && (
            <TouchableOpacity style={S.banner} onPress={() => setActiveTab('suggestions')}>
              <View style={S.bannerIcon}>
                <Ionicons name="bulb" size={18} color={COLORS.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.bannerTitle}>{pendingCount} sugerencia{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''}</Text>
                <Text style={S.bannerSub}>Revisar especies propuestas por usuarios</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.warning} />
            </TouchableOpacity>
          )}

          {/* Recent conversations */}
          <Text style={S.sectionTitle}>Conversaciones recientes</Text>
          {conversations.length === 0 ? (
            <View style={S.empty}>
              <Ionicons name="chatbubble-outline" size={36} color={COLORS.textMuted} />
              <Text style={S.emptyText}>Sin conversaciones aún</Text>
            </View>
          ) : conversations.map(c => (
            <TouchableOpacity key={c.id} style={S.convCard}
              onPress={() => { setSelectedConvId(c.id); setActiveTab('chat'); loadMessages(c.id); markRead(c.id); }}>
              <Pill name={c.userName} size={40} />
              <View style={S.convInfo}>
                <Text style={S.convName}>{c.userName}</Text>
                <Text style={S.convPreview} numberOfLines={1}>{c.lastMessage}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={S.convTime}>{c.time}</Text>
                {c.unread > 0 && <View style={S.unread}><Text style={S.unreadText}>{c.unread}</Text></View>}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MÉTRICAS — zona caliente y uso de la app
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'metrics' && (
        <View style={{ height: Math.max(winH - 180, 300), width: '100%' }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.screen, paddingTop: SPACING.md, paddingBottom: SPACING.xxl }}>

            <Text style={S.sectionTitle}>Uso de la app · últimos 30 días</Text>

            {analytics.loading ? (
              <Text style={S.emptyText}>Cargando métricas…</Text>
            ) : analytics.totalViews === 0 ? (
              <View style={S.empty}>
                <Ionicons name="stats-chart-outline" size={36} color={COLORS.textMuted} />
                <Text style={S.emptyText}>Aún no hay datos de uso</Text>
                <Text style={[S.emptyText, { fontSize: 12 }]}>Se registran cuando los usuarios navegan por la app (build publicado).</Text>
              </View>
            ) : (
              <>
                {/* Resumen */}
                <View style={S.statsGrid}>
                  <View style={S.statCard}>
                    <View style={[S.statIcon, { backgroundColor: COLORS.primary + '18' }]}>
                      <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
                    </View>
                    <Text style={S.statValue}>{analytics.totalViews}</Text>
                    <Text style={S.statLabel}>Vistas de pantalla</Text>
                  </View>
                  <View style={S.statCard}>
                    <View style={[S.statIcon, { backgroundColor: COLORS.success + '18' }]}>
                      <Ionicons name="people-outline" size={20} color={COLORS.success} />
                    </View>
                    <Text style={S.statValue}>{analytics.activeUsers}</Text>
                    <Text style={S.statLabel}>Usuarios activos</Text>
                  </View>
                </View>

                {/* Zona caliente */}
                <Text style={S.sectionTitle}>🔥 Zona caliente (pantallas más usadas)</Text>
                {analytics.hotScreens.slice(0, 10).map((s, i) => (
                  <View key={s.screen} style={S.hotRow}>
                    <Text style={S.hotRank}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={S.hotLabelRow}>
                        <Text style={S.hotLabel}>{s.label}</Text>
                        <Text style={S.hotCount}>{s.count} · {s.pct}%</Text>
                      </View>
                      <View style={S.hotBarTrack}>
                        <View style={[S.hotBarFill, { width: `${Math.max(s.pct, 2)}%` }]} />
                      </View>
                    </View>
                  </View>
                ))}

                {/* Vistas por día (últimos 7) */}
                <Text style={S.sectionTitle}>Vistas por día (últimos 7)</Text>
                <View style={S.dayChart}>
                  {(() => {
                    const max = Math.max(...analytics.viewsByDay.map(d => d.count), 1);
                    return analytics.viewsByDay.map(d => (
                      <View key={d.day} style={S.dayCol}>
                        <Text style={S.dayCount}>{d.count}</Text>
                        <View style={[S.dayBar, { height: Math.max((d.count / max) * 90, 3) }]} />
                        <Text style={S.dayLabel}>{d.day.slice(8, 10)}/{d.day.slice(5, 7)}</Text>
                      </View>
                    ));
                  })()}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CHAT — View (flex:1) direct child of root
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'chat' && (
        <View style={[S.flex, S.chatRow]}>
          {/* Left: conversation list */}
          <View style={S.convList}>
            <Text style={S.convListHeader}>Conversaciones</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {conversations.map(c => (
                <TouchableOpacity key={c.id}
                  style={[S.convListItem, selectedConv?.id === c.id && S.convListItemOn]}
                  onPress={() => { setSelectedConvId(c.id); loadMessages(c.id); markRead(c.id); }}>
                  <Pill name={c.userName} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={[S.convName, { fontSize: 12 }]} numberOfLines={1}>{c.userName}</Text>
                    <Text style={S.convPreview} numberOfLines={1}>{c.lastMessage}</Text>
                  </View>
                  {c.unread > 0 && <View style={S.unread}><Text style={S.unreadText}>{c.unread}</Text></View>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Right: messages */}
          {selectedConv ? (
            <View style={S.chatPanel}>
              <View style={S.chatPanelTop}>
                <Pill name={selectedConv.userName} size={30} />
                <Text style={S.chatPanelName}>{selectedConv.userName}</Text>
              </View>
              <ScrollView style={S.flex} contentContainerStyle={{ padding: SPACING.sm }}>
                {selectedConv.messages.map(msg => (
                  <View key={msg.id} style={[S.msgRow, msg.sender !== 'user' && S.msgRowR]}>
                    <View style={[S.bubble,
                      msg.sender === 'user' ? S.bubbleUser :
                      msg.sender === 'ai'   ? S.bubbleAI  : S.bubbleAdmin]}>
                      {msg.sender !== 'user' && (
                        <Text style={S.bubbleSender}>{msg.sender === 'ai' ? '🤖 IA' : '🛡 Admin'}</Text>
                      )}
                      <Text style={S.bubbleText}>{msg.content}</Text>
                      <Text style={S.bubbleTime}>{msg.time}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={S.replyBar}>
                <TextInput style={S.replyInput} value={adminReply} onChangeText={setAdminReply}
                  placeholder="Responder como admin..." placeholderTextColor={COLORS.textMuted} multiline />
                <TouchableOpacity
                  style={[S.sendBtn, !adminReply.trim() && { backgroundColor: COLORS.border }]}
                  onPress={() => { if (!adminReply.trim() || !selectedConv) return; persistReply(selectedConv.id, adminReply.trim()); setAdminReply(''); }}
                  disabled={!adminReply.trim()}>
                  <Ionicons name="send" size={15} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[S.flex, S.chatEmpty]}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={COLORS.textMuted} />
              <Text style={S.chatEmptyTitle}>Selecciona una conversación</Text>
              <Text style={S.chatEmptySub}>El hilo aparecerá aquí</Text>
            </View>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          FISH — explicit height ScrollView. Reliable scroll on web.
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'fish' && (
        <View style={{ height: Math.max(winH - 180, 300), width: '100%' }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={S.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <View style={S.fishToolbar}>
              <View style={S.searchBox}>
                <Ionicons name="search-outline" size={15} color={COLORS.textMuted} />
                <TextInput style={S.searchInput} value={fishSearch} onChangeText={setFishSearch}
                  placeholder="Buscar especie..." placeholderTextColor={COLORS.textMuted} />
                {fishSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setFishSearch('')}>
                    <Ionicons name="close-circle" size={15} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={S.addBtn} onPress={openNew}>
                <Ionicons name="add" size={17} color="#fff" />
                <Text style={S.addBtnText}>Nueva</Text>
              </TouchableOpacity>
            </View>
            <Text style={S.listMeta}>{filteredFish.length} / {fishList.length} especies</Text>

            {filteredFish.map(item => {
              const pct = fishCompleteness(item);
              const pc = completenessColor(pct);
              return (
              <View key={item.id} style={S.fishCard}>
                {item.image_url
                  ? <Image source={{ uri: item.image_url }} style={S.fishThumb} resizeMode="cover" />
                  : <View style={S.fishThumbEmpty}><Ionicons name="fish-outline" size={22} color={COLORS.textMuted} /></View>
                }
                <View style={S.fishInfo}>
                  <Text style={S.fishName} numberOfLines={1}>{item.common_name}</Text>
                  <Text style={S.fishSci} numberOfLines={1}>{item.scientific_name}</Text>
                  <View style={S.fishPills}>
                    <View style={[S.pill, { backgroundColor: pc + '1f' }]}>
                      <Text style={[S.pillText, { color: pc }]}>{pct}% ficha</Text>
                    </View>
                    <View style={S.pill}><Text style={S.pillText}>{item.temp_min}–{item.temp_max}°C</Text></View>
                    {!item.approved && (
                      <View style={[S.pill, { backgroundColor: COLORS.warning + '1f' }]}>
                        <Text style={[S.pillText, { color: COLORS.warning }]}>Oculto</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <TouchableOpacity style={S.iconBtnBlue} onPress={() => openEdit(item)}>
                    <Ionicons name="pencil" size={14} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={S.iconBtnRed} onPress={() => confirmDelete(item)}>
                    <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
              );
            })}

            <TouchableOpacity style={S.resetBtn}
              onPress={() => {
                if (Platform.OS === 'web') {
                  if ((window as any).confirm('¿Restaurar todos los peces a los valores originales?')) resetToDefault();
                } else {
                  Alert.alert('Restaurar', '¿Restaurar todos los peces?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Restaurar', style: 'destructive', onPress: resetToDefault },
                  ]);
                }
              }}>
              <Ionicons name="refresh-outline" size={13} color={COLORS.textMuted} />
              <Text style={S.resetBtnText}>Restaurar base de datos original</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SUGGESTIONS — stats strip (fixed) + FlatList DIRECT children of root
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'suggestions' && (
        <View style={{ height: Math.max(winH - 180, 300), width: '100%' }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={S.listContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={S.suggStrip}>
              {[
                { label: 'Pendientes', n: suggestions.filter(s => s.status === 'pending').length,  color: COLORS.warning },
                { label: 'Aprobadas',  n: suggestions.filter(s => s.status === 'approved').length, color: COLORS.success },
                { label: 'Rechazadas', n: suggestions.filter(s => s.status === 'rejected').length, color: COLORS.error },
              ].map(({ label, n, color }) => (
                <View key={label} style={S.suggStatCard}>
                  <Text style={[S.suggStatN, { color }]}>{n}</Text>
                  <Text style={S.suggStatLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {sortedSuggestions.length === 0 ? (
              <View style={[S.empty, { paddingVertical: SPACING.xxl }]}>
                <Ionicons name="bulb-outline" size={52} color={COLORS.textMuted} />
                <Text style={S.emptyTitle}>Sin sugerencias aún</Text>
                <Text style={S.emptyText}>Los usuarios pueden sugerir especies desde el catálogo.</Text>
              </View>
            ) : sortedSuggestions.map(s => {
              const sc = s.status === 'pending' ? COLORS.warning : s.status === 'approved' ? COLORS.success : COLORS.error;
              const si = s.status === 'pending' ? 'time-outline' : s.status === 'approved' ? 'checkmark-circle' : 'close-circle';
              const sl = s.status === 'pending' ? 'Pendiente' : s.status === 'approved' ? 'Aprobada' : 'Rechazada';
              return (
                <TouchableOpacity key={s.id} style={S.suggCard}
                  onPress={() => { setSelectedSugg(s); setShowSuggDetail(true); setShowRejectInput(false); setRejectReason(''); }}>
                  <View style={[S.suggAvatar, { backgroundColor: sc + '1A' }]}>
                    <Text style={[S.suggAvatarText, { color: sc }]}>{s.user_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.suggName}>{s.common_name}</Text>
                    <Text style={S.suggSci}>{s.scientific_name}</Text>
                    <Text style={S.suggMeta}>por {s.user_name} · {new Date(s.created_at).toLocaleDateString('es-ES')}</Text>
                  </View>
                  <View style={[S.badge, { backgroundColor: sc + '18' }]}>
                    <Ionicons name={si as any} size={10} color={sc} />
                    <Text style={[S.badgeText, { color: sc }]}>{sl}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TICKETS — soporte / errores reportados
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tickets' && (
        <View style={{ height: Math.max(winH - 180, 300), width: '100%' }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.screen, paddingTop: SPACING.md, paddingBottom: SPACING.xxl }}>
            <Text style={S.sectionTitle}>Tickets de soporte</Text>
            <Text style={S.listMeta}>{tickets.length} reportes · {openTickets} abiertos</Text>
            {tickets.length === 0 ? (
              <View style={S.empty}>
                <Ionicons name="bug-outline" size={36} color={COLORS.textMuted} />
                <Text style={S.emptyText}>Sin reportes aún</Text>
              </View>
            ) : tickets.map(t => {
              const catIcon = t.category === 'bug' ? 'bug' : t.category === 'suggestion' ? 'bulb' : 'ellipsis-horizontal';
              return (
                <View key={t.id} style={S.ticketCard}>
                  <View style={S.ticketHead}>
                    <Ionicons name={catIcon as any} size={15} color={COLORS.primary} />
                    <Text style={S.ticketUser} numberOfLines={1}>{t.user_name}</Text>
                    <Text style={S.ticketWhen}>
                      {new Date(t.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={S.ticketBody}>{t.description}</Text>
                  {t.image_url ? (
                    <Image source={{ uri: t.image_url }} style={S.ticketShot} resizeMode="cover" />
                  ) : null}
                  <View style={S.ticketStatusRow}>
                    {(['open', 'in_progress', 'resolved'] as TicketStatus[]).map(st => {
                      const on = t.status === st;
                      const cl = st === 'open' ? COLORS.warning : st === 'in_progress' ? COLORS.primary : COLORS.success;
                      const lb = st === 'open' ? 'Abierto' : st === 'in_progress' ? 'En proceso' : 'Resuelto';
                      return (
                        <TouchableOpacity key={st}
                          style={[S.tStatusChip, on && { backgroundColor: cl, borderColor: cl }]}
                          onPress={() => updateTicketStatus(t.id, st)}>
                          <Text style={[S.tStatusChipText, on && { color: '#fff' }]}>{lb}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════ */}

      {/* Suggestion detail */}
      <Modal visible={showSuggDetail} animationType="slide" transparent>
        <View style={S.overlay}>
          <View style={S.sheet}>
            <View style={S.handle} />
            {selectedSugg && (() => {
              const s  = selectedSugg;
              const sc = s.status === 'pending' ? COLORS.warning : s.status === 'approved' ? COLORS.success : COLORS.error;
              return (
                <>
                  <View style={S.sheetHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={S.sheetTitle}>💡 Sugerencia de especie</Text>
                      <View style={[S.badge, { backgroundColor: sc + '18', alignSelf: 'flex-start', marginTop: 4 }]}>
                        <Text style={[S.badgeText, { color: sc }]}>
                          {s.status === 'pending' ? 'Pendiente' : s.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity style={S.closeBtn} onPress={() => setShowSuggDetail(false)}>
                      <Ionicons name="close" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.md }}>
                    <View style={S.suggUser}>
                      <Pill name={s.user_name} size={32} />
                      <View>
                        <Text style={S.suggUserName}>{s.user_name}</Text>
                        <Text style={S.suggUserDate}>{new Date(s.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                      </View>
                    </View>
                    {s.image_url && <Image source={{ uri: s.image_url }} style={S.suggImg} resizeMode="cover" />}

                    <Text style={S.sheetSection}>🐟 Datos del pez</Text>
                    {[
                      { label: 'Nombre común', value: s.common_name },
                      { label: 'Científico',   value: s.scientific_name },
                      { label: 'Familia',      value: s.family },
                      { label: 'Origen',       value: s.origin },
                      { label: 'Tipo de agua', value: s.water_type },
                    ].filter(r => r.value).map(({ label, value }) => (
                      <View key={label} style={S.detailRow}>
                        <Text style={S.detailLabel}>{label}</Text>
                        <Text style={S.detailValue}>{value}</Text>
                      </View>
                    ))}

                    {(s.temp_min || s.ph_min) && (
                      <>
                        <Text style={S.sheetSection}>🌡️ Parámetros</Text>
                        <View style={S.paramGrid}>
                          {[
                            { label: 'Temp mín', v: s.temp_min, u: '°C' },
                            { label: 'Temp máx', v: s.temp_max, u: '°C' },
                            { label: 'pH mín',   v: s.ph_min,   u: '' },
                            { label: 'pH máx',   v: s.ph_max,   u: '' },
                            { label: 'GH mín',   v: s.gh_min,   u: 'dGH' },
                            { label: 'GH máx',   v: s.gh_max,   u: 'dGH' },
                            { label: 'Tamaño',   v: s.adult_size_cm, u: 'cm' },
                            { label: 'Min L',    v: s.min_tank_liters, u: 'L' },
                          ].filter(p => p.v !== undefined).map(({ label, v, u }) => (
                            <View key={label} style={S.paramChip}>
                              <Text style={S.paramLabel}>{label}</Text>
                              <Text style={S.paramValue}>{v}{u}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    {s.description ? (
                      <><Text style={S.sheetSection}>📝 Descripción</Text>
                        <Text style={S.descText}>{s.description}</Text></>
                    ) : null}
                    {s.notes ? (
                      <View style={S.notesBox}>
                        <Ionicons name="chatbubble-ellipses-outline" size={15} color={COLORS.accent} />
                        <View style={{ flex: 1 }}>
                          <Text style={S.notesTitle}>Mensaje del usuario</Text>
                          <Text style={S.notesText}>{s.notes}</Text>
                        </View>
                      </View>
                    ) : null}
                    {s.status === 'rejected' && s.reject_reason ? (
                      <View style={[S.notesBox, { borderColor: COLORS.error + '44', backgroundColor: COLORS.error + '0D' }]}>
                        <Ionicons name="close-circle-outline" size={15} color={COLORS.error} />
                        <View style={{ flex: 1 }}>
                          <Text style={[S.notesTitle, { color: COLORS.error }]}>Motivo de rechazo</Text>
                          <Text style={S.notesText}>{s.reject_reason}</Text>
                        </View>
                      </View>
                    ) : null}
                    {showRejectInput && (
                      <View style={{ marginTop: SPACING.sm }}>
                        <Text style={S.fieldLabel}>Motivo del rechazo (opcional)</Text>
                        <TextInput style={[S.fieldInput, { minHeight: 60, textAlignVertical: 'top' }]}
                          value={rejectReason} onChangeText={setRejectReason}
                          placeholder="Ej: Ya existe en el catálogo..." placeholderTextColor={COLORS.textMuted} multiline />
                      </View>
                    )}
                    <View style={{ height: SPACING.lg }} />
                  </ScrollView>

                  {s.status === 'pending' && (
                    <View style={S.sheetActions}>
                      {showRejectInput ? (
                        <>
                          <TouchableOpacity style={S.btnGhost} onPress={() => setShowRejectInput(false)}>
                            <Text style={S.btnGhostText}>Atrás</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={S.btnDanger} onPress={handleReject}>
                            <Text style={S.btnWhiteText}>Confirmar rechazo</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity style={S.btnDanger} onPress={() => setShowRejectInput(true)}>
                            <Ionicons name="close-circle-outline" size={15} color="#fff" />
                            <Text style={S.btnWhiteText}>Rechazar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={S.btnSuccess} onPress={() => openFromSuggestion(s)}>
                            <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                            <Text style={S.btnWhiteText}>Aprobar y editar</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  )}
                  {s.status !== 'pending' && (
                    <View style={S.sheetActions}>
                      <TouchableOpacity style={S.btnOutlineDanger}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            if ((window as any).confirm('¿Eliminar esta sugerencia?')) {
                              deleteSuggestion(s.id); setShowSuggDetail(false);
                            }
                          } else {
                            Alert.alert('Eliminar', '¿Eliminar esta sugerencia?', [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Eliminar', style: 'destructive', onPress: async () => {
                                await deleteSuggestion(s.id); setShowSuggDetail(false);
                              }},
                            ]);
                          }
                        }}>
                        <Ionicons name="trash-outline" size={15} color={COLORS.error} />
                        <Text style={[S.btnWhiteText, { color: COLORS.error }]}>Eliminar sugerencia</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Fish editor modal */}
      <Modal visible={showEditor} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={S.overlay}>
            <View style={S.sheet}>
              <View style={S.handle} />
              <View style={S.sheetHeader}>
                <Text style={S.sheetTitle}>{isNewFish ? '➕ Nueva especie' : '✏️ Editar especie'}</Text>
                <TouchableOpacity style={S.closeBtn} onPress={() => setShowEditor(false)}>
                  <Ionicons name="close" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl }}>

                {/* Photo */}
                <Text style={S.sheetSection}>📸 Fotografía</Text>
                {editingFish?.image_url ? (
                  <View style={{ marginBottom: SPACING.sm }}>
                    <Image source={{ uri: editingFish.image_url }} style={S.photoPreview} resizeMode="cover" />
                    <TouchableOpacity style={S.photoRemove} onPress={() => patch('image_url', undefined)}>
                      <Ionicons name="close-circle" size={26} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={S.photoEmpty}>
                    {pickingImg ? <ActivityIndicator color={COLORS.primary} size="large" /> : (
                      <><Ionicons name="image-outline" size={40} color={COLORS.textMuted} />
                        <Text style={S.photoEmptyText}>Sin fotografía</Text></>
                    )}
                  </View>
                )}
                <View style={S.photoRow}>
                  <TouchableOpacity style={S.photoBtn} onPress={() => pickImage('gallery')} disabled={pickingImg}>
                    <Ionicons name="images-outline" size={17} color={COLORS.primary} />
                    <Text style={S.photoBtnText}>Galería</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.photoBtn} onPress={() => pickImage('camera')} disabled={pickingImg}>
                    <Ionicons name="camera-outline" size={17} color={COLORS.primary} />
                    <Text style={S.photoBtnText}>Cámara</Text>
                  </TouchableOpacity>
                </View>

                {/* Basic info */}
                <Text style={S.sheetSection}>🐟 Información básica</Text>
                {([
                  { label: 'Nombre común *',      field: 'common_name' as const },
                  { label: 'Nombre científico *',  field: 'scientific_name' as const },
                  { label: 'Familia',              field: 'family' as const },
                  { label: 'Origen',               field: 'origin' as const },
                  { label: 'Dieta',                field: 'diet' as const },
                ]).map(({ label, field }) => (
                  <View key={field} style={S.fieldRow}>
                    <Text style={S.fieldLabel}>{label}</Text>
                    <TextInput style={S.fieldInput}
                      value={String(editingFish?.[field] ?? '')} onChangeText={v => patch(field, v)}
                      placeholder={label} placeholderTextColor={COLORS.textMuted} />
                  </View>
                ))}
                <View style={S.fieldRow}>
                  <Text style={S.fieldLabel}>Descripción</Text>
                  <TextInput style={[S.fieldInput, { minHeight: 76, textAlignVertical: 'top' }]}
                    value={editingFish?.description ?? ''} onChangeText={v => patch('description', v)}
                    placeholder="Descripción..." placeholderTextColor={COLORS.textMuted} multiline numberOfLines={4} />
                </View>

                {/* Parameters */}
                <Text style={S.sheetSection}>🌡️ Parámetros de agua</Text>
                <View style={S.paramGrid}>
                  {([
                    { label: 'Temp mín °C', field: 'temp_min' as const },
                    { label: 'Temp máx °C', field: 'temp_max' as const },
                    { label: 'pH mín',       field: 'ph_min' as const },
                    { label: 'pH máx',       field: 'ph_max' as const },
                    { label: 'GH mín',       field: 'gh_min' as const },
                    { label: 'GH máx',       field: 'gh_max' as const },
                    { label: 'Tamaño (cm)',  field: 'adult_size_cm' as const },
                    { label: 'Min litros',   field: 'min_tank_liters' as const },
                  ]).map(({ label, field }) => (
                    <View key={field} style={S.paramField}>
                      <Text style={S.paramLabel}>{label}</Text>
                      <TextInput style={[S.fieldInput, { textAlign: 'center' }]}
                        value={String(editingFish?.[field] ?? '')}
                        onChangeText={v => patch(field, parseFloat(v) || 0)}
                        keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textMuted} />
                    </View>
                  ))}
                </View>

                {/* Config */}
                <Text style={S.sheetSection}>⚙️ Configuración</Text>
                <Text style={S.fieldLabel}>Tipo de agua</Text>
                <View style={S.chipRow}>
                  {(['freshwater', 'saltwater', 'brackish'] as WaterType[]).map(wt => (
                    <TouchableOpacity key={wt} style={[S.chip, editingFish?.water_type === wt && S.chipOn]}
                      onPress={() => patch('water_type', wt)}>
                      <Text style={[S.chipText, editingFish?.water_type === wt && S.chipTextOn]}>
                        {wt === 'freshwater' ? '💧 Dulce' : wt === 'saltwater' ? '🌊 Salada' : '〰️ Salobre'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={S.fieldLabel}>Agresividad (1–5)</Text>
                <View style={S.chipRow}>
                  {([1, 2, 3, 4, 5] as AggressionLevel[]).map(lvl => {
                    const cs = ['#00b894','#55efc4','#fdcb6e','#e17055','#d63031'];
                    const on = editingFish?.aggression === lvl;
                    return (
                      <TouchableOpacity key={lvl}
                        style={[S.aggrChip, on && { backgroundColor: cs[lvl-1], borderColor: cs[lvl-1] }]}
                        onPress={() => patch('aggression', lvl)}>
                        <Text style={[S.aggrChipText, on && { color: '#fff' }]}>{lvl}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={S.fieldRow}>
                  <Text style={S.fieldLabel}>Tags (separados por coma)</Text>
                  <TextInput style={S.fieldInput}
                    value={(editingFish?.tags ?? []).join(', ')}
                    onChangeText={v => patch('tags', v.split(',').map(t => t.trim()).filter(Boolean))}
                    placeholder="popular, cardumen, colorido..." placeholderTextColor={COLORS.textMuted} />
                </View>

                <View style={S.toggleRow}>
                  <Text style={S.fieldLabel}>¿Pez de cardumen?</Text>
                  <TouchableOpacity style={[S.toggle, editingFish?.is_schooling && S.toggleOn]}
                    onPress={() => patch('is_schooling', !editingFish?.is_schooling)}>
                    <View style={[S.toggleThumb, editingFish?.is_schooling && S.toggleThumbOn]} />
                  </TouchableOpacity>
                </View>
                {editingFish?.is_schooling && (
                  <View style={S.fieldRow}>
                    <Text style={S.fieldLabel}>Mínimo cardumen</Text>
                    <TextInput style={S.fieldInput}
                      value={String(editingFish?.schooling_min ?? 6)}
                      onChangeText={v => patch('schooling_min', parseInt(v) || 6)}
                      keyboardType="number-pad" placeholder="6" placeholderTextColor={COLORS.textMuted} />
                  </View>
                )}

                {/* Identidad extendida */}
                <Text style={S.sheetSection}>🪪 Identidad</Text>
                {txtField('Subfamilia / tribu', 'subfamily')}
                {txtField('Hábitat específico', 'habitat')}
                {arrField('Otros nombres', 'alt_names', 'Tetra neón, Cardenal...')}

                {/* Físico */}
                <Text style={S.sheetSection}>📏 Físico</Text>
                {numGrid([
                  { label: 'Tam. juvenil cm', field: 'juvenile_size_cm' },
                  { label: 'Vida (años)',     field: 'lifespan_years' },
                  { label: 'Litros ideal',    field: 'ideal_tank_liters' },
                ])}

                {/* Parámetros avanzados */}
                <Text style={S.sheetSection}>🧪 Parámetros avanzados</Text>
                {numGrid([
                  { label: 'KH mín',  field: 'kh_min' },
                  { label: 'KH máx',  field: 'kh_max' },
                  { label: 'TDS mín', field: 'tds_min' },
                  { label: 'TDS máx', field: 'tds_max' },
                ])}

                {/* Hábitat y preferencias */}
                <Text style={S.sheetSection}>🪸 Hábitat y preferencias</Text>
                {enumChips('Nivel de nado', 'water_level', [
                  { value: 'top', label: 'Superior' }, { value: 'middle', label: 'Medio' },
                  { value: 'bottom', label: 'Fondo' }, { value: 'all', label: 'Todo' },
                ])}
                {enumChips('Dificultad', 'difficulty', [
                  { value: 'beginner', label: 'Principiante' }, { value: 'intermediate', label: 'Intermedio' },
                  { value: 'advanced', label: 'Avanzado' }, { value: 'expert', label: 'Experto' },
                ])}
                {enumChips('Corriente', 'flow_preference', [
                  { value: 'still', label: 'Nula' }, { value: 'gentle', label: 'Suave' },
                  { value: 'moderate', label: 'Moderada' }, { value: 'strong', label: 'Fuerte' },
                ])}
                {enumChips('Luz', 'light_preference', [
                  { value: 'dim', label: 'Tenue' }, { value: 'moderate', label: 'Media' }, { value: 'bright', label: 'Intensa' },
                ])}
                {enumChips('Sustrato', 'substrate_preference', [
                  { value: 'sand', label: 'Arena' }, { value: 'fine-gravel', label: 'Grava fina' },
                  { value: 'gravel', label: 'Grava' }, { value: 'bare-bottom', label: 'Desnudo' }, { value: 'any', label: 'Cualquiera' },
                ])}
                {toggleField('Compatible con plantas', 'plant_compatible')}
                {toggleField('Necesita troncos / madera', 'needs_driftwood')}
                {toggleField('Necesita escondites', 'needs_hiding')}
                {toggleField('Tolera sal (salobre)', 'salt_tolerant')}

                {/* Dieta y comportamiento */}
                <Text style={S.sheetSection}>🍤 Dieta y comportamiento</Text>
                {arrField('Tipos de alimento', 'food_types', 'pellets, artemia, escamas...')}
                {txtField('Frecuencia de alimentación', 'feeding_frequency')}
                {enumChips('Actividad', 'activity', [
                  { value: 'diurnal', label: 'Diurno' }, { value: 'nocturnal', label: 'Nocturno' }, { value: 'crepuscular', label: 'Crepuscular' },
                ])}
                {arrField('Notas de comportamiento', 'behavior_notes', 'saltador, cavador...')}

                {/* Reproducción */}
                <Text style={S.sheetSection}>🥚 Reproducción</Text>
                {enumChips('Método', 'breeding_method', [
                  { value: 'egg-scatter', label: 'Dispersor' }, { value: 'cave-spawner', label: 'Cueva' },
                  { value: 'mouthbrooder', label: 'Incub. bucal' }, { value: 'livebearer', label: 'Vivíparo' },
                  { value: 'bubble-nest', label: 'Nido burbujas' }, { value: 'plant-spawner', label: 'En plantas' },
                  { value: 'substrate-spawner', label: 'Sustrato' }, { value: 'unknown', label: 'Desconocido' },
                ])}
                {enumChips('Dificultad de cría', 'breeding_difficulty', [
                  { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5' },
                ])}
                {txtField('Dimorfismo sexual', 'sexual_dimorphism', true)}
                {txtField('Notas de cría', 'breeding_notes', true)}

                {/* Compatibilidad */}
                <Text style={S.sheetSection}>🤝 Compatibilidad</Text>
                {arrField('Compatible con', 'compatible_with', 'Corydoras, Tetras...')}
                {arrField('Evitar con', 'avoid_with', 'Cíclidos grandes...')}

                {/* Salud */}
                <Text style={S.sheetSection}>🩺 Salud</Text>
                {arrField('Enfermedades comunes', 'common_diseases', 'Ich, hidropesía...')}

                {/* Conservación y origen */}
                <Text style={S.sheetSection}>🌍 Conservación y origen</Text>
                {enumChips('Estado (IUCN)', 'conservation_status', [
                  { value: 'LC', label: 'LC' }, { value: 'NT', label: 'NT' }, { value: 'VU', label: 'VU' },
                  { value: 'EN', label: 'EN' }, { value: 'CR', label: 'CR' }, { value: 'EW', label: 'EW' },
                  { value: 'EX', label: 'EX' }, { value: 'DD', label: 'DD' }, { value: 'NE', label: 'NE' },
                ])}
                {enumChips('Origen', 'sourcing', [
                  { value: 'wild', label: 'Salvaje' }, { value: 'captive', label: 'Criadero' }, { value: 'both', label: 'Ambos' },
                ])}
                {enumChips('CITES', 'cites', [
                  { value: 'I', label: 'I' }, { value: 'II', label: 'II' }, { value: 'III', label: 'III' },
                ])}

                {/* Variantes */}
                <Text style={S.sheetSection}>🎨 Variantes / morfos</Text>
                {arrField('Variantes', 'variants', 'Halfmoon, Plakat...')}

                {/* Estado de publicación (admin) */}
                <Text style={S.sheetSection}>🔓 Publicación</Text>
                {toggleField('Aprobado (visible en el catálogo)', 'approved')}

                <TouchableOpacity style={S.saveBtn} onPress={saveEdit}>
                  <Ionicons name="checkmark-circle" size={19} color="#fff" />
                  <Text style={S.saveBtnText}>{isNewFish ? 'Agregar especie' : 'Guardar cambios'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  // Header — white card on gradient bg (Airbnb style)
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    marginHorizontal: SPACING.screen, marginTop: SPACING.xl, marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
    },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerName: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  adminBadgeText: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.sans },
  logoutBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },

  // Tab bar — Airbnb bottom-style top navigation
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    marginHorizontal: SPACING.screen, marginBottom: SPACING.sm,
    paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.border,
    },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2,
    borderRadius: BORDER_RADIUS.lg,
  },
  tabOn: { backgroundColor: COLORS.primary + '12' },
  tabLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.sans },
  tabLabelOn: { color: COLORS.primary, fontWeight: '600', fontFamily: FONTS.sansSb },
  dot: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: COLORS.error, borderRadius: 8,
    minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
  },
  dotText: { color: '#fff', fontSize: 9, fontWeight: 'bold', fontFamily: FONTS.sansBd },

  // Dashboard
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONTS.sansBd },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: {
    flex: 1, minWidth: '44%',
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.border,
    },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 26, fontWeight: '800', color: COLORS.text, fontFamily: FONTS.sansEb },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sans },

  // Tickets (admin)
  ticketCard: {
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  ticketHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticketUser: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  ticketWhen: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sans },
  ticketBody: { fontSize: 13, color: COLORS.text, lineHeight: 19, fontFamily: FONTS.sans },
  ticketShot: { width: '100%', height: 160, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.backgroundLight },
  ticketStatusRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  tStatusChip: {
    flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10,
    backgroundColor: COLORS.backgroundLight, borderWidth: 1, borderColor: COLORS.border,
  },
  tStatusChipText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, fontFamily: FONTS.sansBd },

  // Métricas — zona caliente
  hotRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  hotRank: { width: 22, fontSize: 14, fontWeight: '800', color: COLORS.textMuted, fontFamily: FONTS.sansEb, textAlign: 'center' },
  hotLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  hotLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  hotCount: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.sans },
  hotBarTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.backgroundLight, overflow: 'hidden' },
  hotBarFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  // Métricas — vistas por día
  dayChart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 4, minHeight: 150,
  },
  dayCol: { flex: 1, alignItems: 'center', gap: 4 },
  dayCount: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.sans },
  dayBar: { width: '70%', borderRadius: 4, backgroundColor: COLORS.primary, minHeight: 3 },
  dayLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: FONTS.sans },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.warning + '55',
    },
  bannerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.warning + '18', alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 13, fontWeight: '700', color: COLORS.warning, fontFamily: FONTS.sansBd },
  bannerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, fontFamily: FONTS.sans },

  convCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  convInfo: { flex: 1 },
  convName: { fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  convPreview: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: FONTS.sans },
  convTime: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.sans },
  unread: { width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#fff', fontSize: 9, fontWeight: 'bold', fontFamily: FONTS.sansBd },

  empty: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.xl },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansEb },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, fontFamily: FONTS.sans },

  // Chat
  chatRow: { flexDirection: 'row' },
  convList: { width: '36%', backgroundColor: COLORS.backgroundCard, borderRightWidth: 1, borderRightColor: COLORS.border },
  convListHeader: {
    fontSize: 10, fontWeight: '700', color: COLORS.textMuted,
    paddingHorizontal: SPACING.sm, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONTS.sansBd,
  },
  convListItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  convListItemOn: { backgroundColor: COLORS.primary + '0F' },
  chatPanel: { flex: 1 },
  chatPanelTop: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    padding: SPACING.sm, backgroundColor: COLORS.backgroundCard,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  chatPanelName: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  msgRow: { marginBottom: SPACING.sm },
  msgRowR: { alignItems: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: BORDER_RADIUS.lg, padding: 10 },
  bubbleUser:  { backgroundColor: COLORS.backgroundCard, borderWidth: 1, borderColor: COLORS.border },
  bubbleAI:    { backgroundColor: COLORS.accent + '14', borderWidth: 1, borderColor: COLORS.accent + '33' },
  bubbleAdmin: { backgroundColor: COLORS.primaryDark + 'EE', borderWidth: 1, borderColor: COLORS.primary },
  bubbleSender: { fontSize: 9, color: COLORS.textMuted, marginBottom: 2, fontFamily: FONTS.sans },
  bubbleText: { color: COLORS.text, fontSize: 13, lineHeight: 19, fontFamily: FONTS.sans },
  bubbleTime: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, fontFamily: FONTS.sans },
  replyBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
  },
  replyInput: {
    flex: 1, color: COLORS.text, fontSize: 13, maxHeight: 80,
    backgroundColor: COLORS.backgroundLight, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border, fontFamily: FONTS.sans,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  chatEmpty: { alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  chatEmptyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  chatEmptySub: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.sans },

  // Fish
  fishToolbar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm, height: 42,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, fontFamily: FONTS.sans },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md, height: 42,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, fontFamily: FONTS.sansBd },
  listMeta: { color: COLORS.textMuted, fontSize: 11, marginBottom: 4, fontFamily: FONTS.sans },
  listContent: { paddingHorizontal: SPACING.screen, paddingBottom: SPACING.xxl },
  fishCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  fishThumb: { width: 54, height: 54, borderRadius: BORDER_RADIUS.lg },
  fishThumbEmpty: { width: 54, height: 54, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.backgroundLight, alignItems: 'center', justifyContent: 'center' },
  fishInfo: { flex: 1, marginHorizontal: SPACING.sm },
  fishName: { fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  fishSci: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 1, fontFamily: FONTS.sans },
  fishPills: { flexDirection: 'row', gap: 4, marginTop: 5, flexWrap: 'wrap' },
  pill: { backgroundColor: COLORS.primary + '14', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 7, paddingVertical: 2 },
  pillText: { fontSize: 10, color: COLORS.primary, fontFamily: FONTS.sans },
  iconBtnBlue: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary + '12', alignItems: 'center', justifyContent: 'center' },
  iconBtnRed:  { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.error   + '12', alignItems: 'center', justifyContent: 'center' },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: SPACING.md, marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
  },
  resetBtnText: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.sans },

  // Suggestions
  suggStrip: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  suggStatCard: {
    flex: 1, alignItems: 'center',
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  suggStatN: { fontSize: 22, fontWeight: '800', fontFamily: FONTS.sansEb },
  suggStatLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.sans },
  suggCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  suggAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  suggAvatarText: { fontSize: 18, fontWeight: '700', fontFamily: FONTS.sansBd },
  suggName: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  suggSci: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 1, fontFamily: FONTS.sans },
  suggMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.sans },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.sansBd },

  // Modals / Sheets
  overlay: { flex: 1, backgroundColor: 'rgba(12,30,45,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.backgroundCard, borderTopLeftRadius: BORDER_RADIUS.xxl, borderTopRightRadius: BORDER_RADIUS.xxl, maxHeight: '92%', minHeight: '50%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  sheetSection: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginTop: SPACING.md, marginBottom: SPACING.sm, fontFamily: FONTS.sansBd },
  sheetActions: {
    flexDirection: 'row', gap: SPACING.sm,
    padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.backgroundLight, alignItems: 'center', justifyContent: 'center' },

  // Suggestion detail
  suggUser: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.backgroundLight, borderRadius: BORDER_RADIUS.lg, padding: SPACING.sm, marginBottom: SPACING.sm },
  suggUserName: { fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  suggUserDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, fontFamily: FONTS.sans },
  suggImg: { width: '100%', height: 160, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.backgroundLight, marginBottom: SPACING.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 12, color: COLORS.textMuted, flex: 1, fontFamily: FONTS.sans },
  detailValue: { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 2, textAlign: 'right', fontFamily: FONTS.sansSb },
  descText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, backgroundColor: COLORS.backgroundLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, fontFamily: FONTS.sans },
  notesBox: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, backgroundColor: COLORS.accent + '0E', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.accent + '33' },
  notesTitle: { fontSize: 12, fontWeight: '700', color: COLORS.accent, marginBottom: 4, fontFamily: FONTS.sansBd },
  notesText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, fontFamily: FONTS.sans },

  // Fish editor
  fieldRow: { marginBottom: SPACING.sm },
  fieldLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4, fontWeight: '600', fontFamily: FONTS.sansSb },
  fieldInput: {
    color: COLORS.text, fontSize: 14,
    backgroundColor: COLORS.backgroundLight, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border, fontFamily: FONTS.sans,
  },
  paramGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  paramField: { width: '48%' },
  paramLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4, fontFamily: FONTS.sans },
  paramChip: { width: '48%', backgroundColor: COLORS.backgroundLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  paramValue: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 2, fontFamily: FONTS.sansBd },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.backgroundLight },
  chipOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '18' },
  chipText: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.sans },
  chipTextOn: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },
  aggrChip: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.backgroundLight },
  aggrChipText: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMuted, fontFamily: FONTS.sansBd },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: COLORS.border, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: COLORS.primary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  photoPreview: { width: '100%', height: 175, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.sm },
  photoRemove: { position: 'absolute', top: 8, right: 8, backgroundColor: COLORS.backgroundCard, borderRadius: 14 },
  photoEmpty: { width: '100%', height: 120, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.backgroundLight, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', marginBottom: SPACING.sm },
  photoEmptyText: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.sans },
  photoRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.backgroundLight, borderWidth: 1, borderColor: COLORS.primary + '44' },
  photoBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600', fontFamily: FONTS.sansSb },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.xl, padding: SPACING.md, marginTop: SPACING.lg },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, fontFamily: FONTS.sansBd },
  btnSuccess: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.success },
  btnDanger:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.error },
  btnGhost:   { flex: 1, padding: 13, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.backgroundLight, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  btnGhostText: { color: COLORS.textSecondary, fontWeight: '600', fontFamily: FONTS.sansSb },
  btnOutlineDanger: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.error + '55', backgroundColor: COLORS.error + '0D' },
  btnWhiteText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: FONTS.sansBd },
});
