/**
 * UserProfileModal — Public profile with rich content (community feature).
 *
 * Shows when tapping a user from a Community post:
 *  - Avatar + name + member-since + stats
 *  - Tabs: Acuarios (with fish), Galería (photos), Rutinas (tasks), Posts
 *
 * Data fetched from Supabase per visited user_id (real mode only).
 * Demo posts (user_id = u1..u8) show synthetic placeholders.
 *
 * NOTE: For full data visibility across users, RLS policies in Supabase must
 * allow public SELECT on aquariums, aquarium_photos, aquarium_tasks. See SQL
 * at the bottom of this file.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity,
} from 'react-native';
import { FishImage as Image } from '../FishImage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { Post } from '../../types';
import { supabase, IS_DEMO_MODE } from '../../services/supabase';
import { useFishDatabase } from '../../hooks/useFishDatabase';

interface Props {
  visible: boolean;
  userId: string;
  userName: string;
  posts: Post[];
  onClose: () => void;
}

interface PublicAquarium {
  id:            string;
  name:          string;
  volume_liters: number;
  water_type:    string;
  aquarium_style?: string;
  fish:          { fishId: string; qty: number }[];
}

interface PublicPhoto {
  id:          string;
  aquarium_id: string;
  image_url:   string;
  caption?:    string | null;
  taken_at:    string;
}

interface PublicTask {
  id:          string;
  aquarium_id: string;
  title:       string;
  type:        string;
  recurrence:  string;
  due_date:    string;
  completed:   boolean;
}

type Tab = 'aquariums' | 'gallery' | 'tasks' | 'posts';

// ── Synthetic data for demo users ─────────────────────────────────────────────
const DEMO_AQUARIUMS: Record<string, PublicAquarium[]> = {
  u2: [{ id: 'aq-u2-1', name: 'Acuario Plantado 300L', volume_liters: 300, water_type: 'freshwater', aquarium_style: 'planted', fish: [{ fishId: 'tetra-cardinal', qty: 15 }, { fishId: 'corydoras-panda', qty: 6 }] }],
  u3: [{ id: 'aq-u3-1', name: 'Betta Palace', volume_liters: 120, water_type: 'freshwater', aquarium_style: 'natural', fish: [{ fishId: 'betta-splendens', qty: 3 }] }],
  u4: [{ id: 'aq-u4-1', name: 'Cíclidos Sudamericanos', volume_liters: 250, water_type: 'freshwater', aquarium_style: 'biotope', fish: [{ fishId: 'apistogramma-cacatuoides', qty: 4 }] }],
  u5: [{ id: 'aq-u5-1', name: 'Nano Plantado', volume_liters: 60, water_type: 'freshwater', aquarium_style: 'planted', fish: [] }],
  u6: [{ id: 'aq-u6-1', name: 'Comunitario 200L', volume_liters: 200, water_type: 'freshwater', aquarium_style: 'community', fish: [{ fishId: 'corydoras-aeneus', qty: 8 }] }],
  u7: [{ id: 'aq-u7-1', name: 'Reef 200L', volume_liters: 200, water_type: 'saltwater', aquarium_style: 'reef', fish: [{ fishId: 'clownfish', qty: 2 }] }],
  u8: [{ id: 'aq-u8-1', name: 'Dutch Style 180L', volume_liters: 180, water_type: 'freshwater', aquarium_style: 'planted', fish: [] }],
};

const DEMO_PHOTOS: Record<string, PublicPhoto[]> = {
  u2: [
    { id: 'ph-u2-1', aquarium_id: 'aq-u2-1', image_url: 'https://images.unsplash.com/photo-1544552866-d3ed42536cfd?w=400&q=80', caption: 'Acuario recién ciclado', taken_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  ],
  u4: [
    { id: 'ph-u4-1', aquarium_id: 'aq-u4-1', image_url: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400&q=80', caption: 'Huevos de Apistogramma', taken_at: new Date(Date.now() - 86400000).toISOString() },
  ],
  u5: [
    { id: 'ph-u5-1', aquarium_id: 'aq-u5-1', image_url: 'https://images.unsplash.com/photo-1534361960057-19f4434a4d78?w=400&q=80', caption: 'Setup plantado', taken_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  ],
  u7: [
    { id: 'ph-u7-1', aquarium_id: 'aq-u7-1', image_url: 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=400&q=80', caption: 'Reef 1 año', taken_at: new Date(Date.now() - 4 * 86400000).toISOString() },
  ],
};

function Avatar({ name, size = 80 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'A';
  const palette  = ['#00b4d8', '#0077b6', '#48cae4', '#7209b7', '#560bad', '#f72585', '#3a86ff'];
  const color    = palette[(name.charCodeAt(0) || 0) % palette.length];
  return (
    <View style={[S.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[S.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

export default function UserProfileModal({ visible, userId, userName, posts, onClose }: Props) {
  const { fish: fishDb } = useFishDatabase();
  const [tab, setTab] = useState<Tab>('aquariums');

  const [aquariums, setAquariums] = useState<PublicAquarium[]>([]);
  const [photos,    setPhotos]    = useState<PublicPhoto[]>([]);
  const [tasks,     setTasks]     = useState<PublicTask[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<PublicPhoto | null>(null);

  const isDemoUser = /^u\d+$/.test(userId);

  // Posts authored by this user
  const userPosts = useMemo(
    () => posts.filter(p => p.user_id === userId).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [posts, userId],
  );
  const totalLikes = useMemo(
    () => userPosts.reduce((s, p) => s + (p.likes?.length ?? 0), 0),
    [userPosts],
  );

  // Reset tab when opening a different profile
  useEffect(() => {
    if (visible) setTab('aquariums');
  }, [visible, userId]);

  // Fetch user's public data (or use synthetic data for demo users)
  useEffect(() => {
    if (!visible) {
      setAquariums([]); setPhotos([]); setTasks([]); setViewingPhoto(null);
      return;
    }

    // Demo mode or demo user IDs → use synthetic placeholder data
    if (IS_DEMO_MODE || isDemoUser) {
      setAquariums(DEMO_AQUARIUMS[userId] ?? []);
      setPhotos(DEMO_PHOTOS[userId] ?? []);
      setTasks([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const [aqs, phs, tks] = await Promise.all([
          supabase.from('aquariums')
            .select('id, name, volume_liters, water_type, aquarium_style, aquarium_fish(fish_id, quantity)')
            .eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('aquarium_photos')
            .select('id, aquarium_id, image_url, caption, taken_at')
            .eq('user_id', userId).order('taken_at', { ascending: false }).limit(12),
          supabase.from('aquarium_tasks')
            .select('id, aquarium_id, title, type, recurrence, due_date, completed')
            .eq('user_id', userId).order('due_date').limit(20),
        ]);
        if (aqs.data) setAquariums(aqs.data.map((row: any) => ({
          id: row.id,
          name: row.name,
          volume_liters: row.volume_liters,
          water_type: row.water_type,
          aquarium_style: row.aquarium_style,
          fish: (row.aquarium_fish ?? []).map((af: any) => ({ fishId: af.fish_id, qty: af.quantity })),
        })));
        if (phs.data) setPhotos(phs.data as PublicPhoto[]);
        if (tks.data) setTasks(tks.data as PublicTask[]);
      } catch (e) { console.warn('[UserProfileModal] Load failed:', e); }
      setLoading(false);
    })();
  }, [visible, userId, isDemoUser]);

  const memberSince = userPosts.length > 0
    ? new Date(userPosts[userPosts.length - 1].created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : null;

  const totalFish = useMemo(() =>
    aquariums.reduce((sum, aq) =>
      sum + (Array.isArray(aq.fish) ? aq.fish.reduce((s, f) => s + (f.qty || 0), 0) : 0), 0),
    [aquariums]);

  const aquariumName = (id: string) => aquariums.find(a => a.id === id)?.name ?? '';

  const TABS: { id: Tab; label: string; icon: string; count: number }[] = [
    { id: 'aquariums', label: 'Acuarios', icon: 'cube-outline',     count: aquariums.length },
    { id: 'gallery',   label: 'Galería',  icon: 'images-outline',   count: photos.length },
    { id: 'tasks',     label: 'Rutinas',  icon: 'calendar-outline', count: tasks.length },
    { id: 'posts',     label: 'Posts',    icon: 'document-text-outline', count: userPosts.length },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={S.overlay}>
        <View style={S.sheet}>
          <View style={S.handle} />

          {/* Top bar */}
          <View style={S.topBar}>
            <Text style={S.topTitle}>Perfil de usuario</Text>
            <TouchableOpacity style={S.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero */}
            <View style={S.hero}>
              <Avatar name={userName} size={84} />
              <Text style={S.userName}>{userName}</Text>
              {memberSince && <Text style={S.memberSince}>Activo desde {memberSince}</Text>}
            </View>

            {/* Stats — 4 boxes */}
            <View style={S.statsRow}>
              <Stat value={userPosts.length} label="Posts" icon="📝" />
              <Stat value={aquariums.length} label="Acuarios" icon="🐠" />
              <Stat value={totalFish}        label="Peces"    icon="🐟" />
              <Stat value={totalLikes}       label="Likes"    icon="❤️" />
            </View>

            {/* Tabs */}
            <View style={S.tabs}>
              {TABS.map(t => {
                const on = tab === t.id;
                return (
                  <TouchableOpacity key={t.id} style={[S.tab, on && S.tabOn]} onPress={() => setTab(t.id)}>
                    <Ionicons name={t.icon as any} size={16} color={on ? COLORS.primary : COLORS.textMuted} />
                    <Text style={[S.tabText, on && S.tabTextOn]}>{t.label}</Text>
                    {t.count > 0 && (
                      <View style={[S.badge, on && S.badgeOn]}>
                        <Text style={[S.badgeText, on && S.badgeTextOn]}>{t.count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tab content */}
            <View style={{ paddingBottom: SPACING.xxl }}>
              {loading && (
                <Text style={S.muted}>Cargando…</Text>
              )}

              {/* AQUARIUMS */}
              {tab === 'aquariums' && !loading && (
                aquariums.length === 0 ? (
                  <EmptyState
                    icon="cube-outline"
                    title="Sin acuarios públicos"
                    text="Este usuario no comparte sus acuarios o aún no ha creado ninguno."
                  />
                ) : aquariums.map(aq => {
                  const fishList = (aq.fish ?? []).flatMap(entry => {
                    const f = fishDb.find(fd => fd.id === entry.fishId);
                    return f ? [{ ...f, qty: entry.qty }] : [];
                  });
                  const totalQty = (aq.fish ?? []).reduce((s, f) => s + (f.qty || 0), 0);
                  return (
                    <View key={aq.id} style={S.aqCard}>
                      <View style={S.aqHeader}>
                        <View style={S.aqIcon}>
                          <Ionicons name="cube-outline" size={20} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={S.aqName}>{aq.name}</Text>
                          <Text style={S.aqMeta}>
                            💧 {aq.volume_liters}L · {
                              aq.water_type === 'saltwater' ? 'Marino' :
                              aq.water_type === 'brackish'  ? 'Salobre' : 'Dulce'
                            }
                            {totalQty > 0 ? ` · 🐠 ${totalQty}` : ''}
                          </Text>
                        </View>
                      </View>
                      {fishList.length > 0 && (
                        <View style={S.fishGrid}>
                          {fishList.map(f => (
                            <View key={f.id} style={S.fishChip}>
                              {f.image_url && (
                                <Image source={{ uri: f.image_url }} style={S.fishThumb} />
                              )}
                              <Text style={S.fishQty}>×{f.qty}</Text>
                              <Text style={S.fishName} numberOfLines={1}>{f.common_name}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              )}

              {/* GALLERY */}
              {tab === 'gallery' && !loading && (
                photos.length === 0 ? (
                  <EmptyState
                    icon="images-outline"
                    title="Sin fotos públicas"
                    text="Este usuario no ha compartido fotos de sus acuarios."
                  />
                ) : (
                  <View style={S.photoGrid}>
                    {photos.map(p => (
                      <TouchableOpacity key={p.id} style={S.photoItem} activeOpacity={0.85}
                        onPress={() => setViewingPhoto(p)}>
                        <Image source={{ uri: p.image_url }} style={S.photoImg} />
                        {p.caption && (
                          <View style={S.photoCaption}>
                            <Text style={S.photoCaptionText} numberOfLines={1}>{p.caption}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              )}

              {/* TASKS / RUTINAS */}
              {tab === 'tasks' && !loading && (
                tasks.length === 0 ? (
                  <EmptyState
                    icon="calendar-outline"
                    title="Sin rutinas públicas"
                    text="Este usuario no comparte sus tareas o aún no ha creado ninguna."
                  />
                ) : (
                  tasks.slice(0, 12).map(t => {
                    const due = new Date(t.due_date);
                    return (
                      <View key={t.id} style={[S.taskCard, t.completed && S.taskCardDone]}>
                        <View style={[S.taskIcon, { backgroundColor: t.completed ? COLORS.success + '22' : COLORS.primary + '22' }]}>
                          <Ionicons
                            name={t.completed ? 'checkmark-circle' : 'time-outline'}
                            size={18}
                            color={t.completed ? COLORS.success : COLORS.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[S.taskTitle, t.completed && S.taskTitleDone]}>{t.title}</Text>
                          <Text style={S.taskMeta}>
                            📦 {aquariumName(t.aquarium_id) || 'Acuario'}
                            {t.recurrence && t.recurrence !== 'none' ? ` · 🔁 ${t.recurrence}` : ''}
                          </Text>
                          <Text style={S.taskDate}>
                            {due.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )
              )}

              {/* POSTS */}
              {tab === 'posts' && (
                userPosts.length === 0 ? (
                  <EmptyState
                    icon="document-text-outline"
                    title="Aún no ha publicado"
                    text="Cuando publique algo en la comunidad aparecerá aquí."
                  />
                ) : (
                  userPosts.map(p => (
                    <View key={p.id} style={S.postCard}>
                      {p.image_url ? (
                        <Image source={{ uri: p.image_url }} style={S.postThumb} resizeMode="cover" />
                      ) : (
                        <View style={[S.postThumb, S.postThumbEmpty]}>
                          <Ionicons name="document-text-outline" size={20} color={COLORS.textMuted} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={S.postContent} numberOfLines={2}>{p.content}</Text>
                        <View style={S.postMeta}>
                          <Ionicons name="heart" size={11} color="#f72585" />
                          <Text style={S.postMetaText}>{p.likes.length}</Text>
                          <Ionicons name="chatbubble-outline" size={11} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
                          <Text style={S.postMetaText}>{p.comments_count}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )
              )}
            </View>
          </ScrollView>
        </View>

        {/* Fullscreen photo viewer */}
        {viewingPhoto && (
          <View style={S.viewerRoot}>
            <TouchableOpacity style={S.viewerClose} onPress={() => setViewingPhoto(null)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: viewingPhoto.image_url }} style={S.viewerImg} resizeMode="contain" />
            {viewingPhoto.caption && (
              <View style={S.viewerCaptionWrap}>
                <Text style={S.viewerCaption}>{viewingPhoto.caption}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Sub components ──────────────────────────────────────────────────────────
function Stat({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <View style={S.statBox}>
      <Text style={S.statIcon}>{icon}</Text>
      <Text style={S.statValue}>{value}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
}
function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <View style={S.empty}>
      <Ionicons name={icon as any} size={48} color={COLORS.textMuted} />
      <Text style={S.emptyTitle}>{title}</Text>
      <Text style={S.emptyText}>{text}</Text>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: '92%', paddingHorizontal: SPACING.md, paddingTop: 8,
  },
  handle: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, marginBottom: 8,
  },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  topTitle: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.sansBd, textTransform: 'uppercase', letterSpacing: 0.5 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },

  hero: { alignItems: 'center', paddingVertical: SPACING.lg, gap: 6 },
  userName:    { fontSize: 22, fontWeight: '800', color: COLORS.text, fontFamily: FONTS.sansEb },
  memberSince: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.sans },

  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontFamily: FONTS.sansBd },

  statsRow: { flexDirection: 'row', gap: 6, marginBottom: SPACING.md },
  statBox: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.sm, gap: 2,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statIcon:  { fontSize: 16 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: FONTS.sansEb },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.sans },

  // Tabs
  tabs: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 4, gap: 4, borderRadius: BORDER_RADIUS.lg,
    minWidth: '22%',
  },
  tabOn:    { backgroundColor: COLORS.primary + '14' },
  tabText:  { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sansSb },
  tabTextOn:{ color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },
  badge: {
    backgroundColor: COLORS.border, borderRadius: 8, minWidth: 16,
    paddingHorizontal: 4, alignItems: 'center',
  },
  badgeOn:   { backgroundColor: COLORS.primary },
  badgeText: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, fontFamily: FONTS.sansBd },
  badgeTextOn: { color: '#fff' },

  // Aquariums
  aqCard: {
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  aqHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  aqIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '14', alignItems: 'center', justifyContent: 'center' },
  aqName: { fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  aqMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.sans },

  fishGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fishChip: {
    width: '31%', alignItems: 'center', padding: 6, borderRadius: 10,
    backgroundColor: COLORS.backgroundLight,
  },
  fishThumb: { width: 50, height: 50, borderRadius: 8, marginBottom: 3 },
  fishQty:   { fontSize: 9, fontWeight: '800', color: COLORS.primary, fontFamily: FONTS.sansBd, position: 'absolute', top: 2, right: 4, backgroundColor: '#fff', paddingHorizontal: 4, borderRadius: 5 },
  fishName:  { fontSize: 10, color: COLORS.text, textAlign: 'center', fontFamily: FONTS.sans },

  // Photo grid
  photoGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  photoItem:  { width: '32.5%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.backgroundCard },
  photoImg:   { width: '100%', height: '100%' },
  photoCaption: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 4, backgroundColor: 'rgba(0,0,0,0.5)' },
  photoCaptionText: { color: '#fff', fontSize: 9, fontFamily: FONTS.sans },

  // Tasks
  taskCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  taskCardDone: { opacity: 0.6 },
  taskIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  taskMeta:  { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.sans },
  taskDate:  { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.sans },

  // Posts
  postCard: {
    flexDirection: 'row', gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  postThumb:      { width: 56, height: 56, borderRadius: 10 },
  postThumbEmpty: { backgroundColor: COLORS.backgroundLight, alignItems: 'center', justifyContent: 'center' },
  postContent:    { fontSize: 13, color: COLORS.text, fontFamily: FONTS.sans, lineHeight: 18 },
  postMeta:       { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  postMetaText:   { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sans },

  // Fullscreen photo viewer
  viewerRoot: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  viewerClose: {
    position: 'absolute', top: 44, right: 20, zIndex: 101,
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  viewerImg: { width: '100%', height: '72%' },
  viewerCaptionWrap: {
    position: 'absolute', bottom: 48, left: 20, right: 20,
    padding: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: BORDER_RADIUS.lg,
  },
  viewerCaption: { color: '#fff', fontSize: 14, textAlign: 'center', fontFamily: FONTS.sans },

  // Empty state
  empty: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansEb },
  emptyText:  { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 17, fontFamily: FONTS.sans, paddingHorizontal: SPACING.md },

  muted: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: SPACING.lg, fontFamily: FONTS.sans },
});

/* ─────────────────────────────────────────────────────────────────────────────
 * SQL needed in Supabase for community visibility (run in SQL Editor):
 *
 * -- Allow anyone to read aquariums (public profiles)
 * DROP POLICY IF EXISTS "public read aquariums" ON aquariums;
 * CREATE POLICY "public read aquariums" ON aquariums FOR SELECT TO authenticated
 *   USING (true);
 *
 * -- Allow anyone to read public photos
 * DROP POLICY IF EXISTS "public read photos" ON aquarium_photos;
 * CREATE POLICY "public read photos" ON aquarium_photos FOR SELECT TO authenticated
 *   USING (true);
 *
 * -- Allow anyone to read public tasks
 * DROP POLICY IF EXISTS "public read tasks" ON aquarium_tasks;
 * CREATE POLICY "public read tasks" ON aquarium_tasks FOR SELECT TO authenticated
 *   USING (true);
 *
 * Note: write policies (INSERT/UPDATE/DELETE) should remain restricted to
 * the owner via auth.uid() = user_id.
 * ─────────────────────────────────────────────────────────────────────────── */
