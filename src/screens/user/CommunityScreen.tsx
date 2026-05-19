import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, Share, RefreshControl,
} from 'react-native';
import { FishImage as Image } from '../../components/FishImage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeOut, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SPACING, BORDER_RADIUS as RADII } from '../../constants/theme';
import { Post, PostComment } from '../../types';
import { COMMUNITY_TAGS } from '../../data/communityData';
import { useAuth } from '../../hooks/useAuth';
import { useCommunity } from '../../hooks/useCommunity';
import { useAchievements, ACHIEVEMENTS } from '../../hooks/useAchievements';
import UserProfileModal from '../../components/community/UserProfileModal';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const colors = ['#00b4d8', '#0077b6', '#48cae4', '#90e0ef', '#7209b7', '#560bad', '#f72585'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

function TagBadge({ tag }: { tag: string }) {
  return (
    <View style={styles.tagBadge}>
      <Text style={styles.tagBadgeText}>#{tag}</Text>
    </View>
  );
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onLike: (id: string) => void;
  onOpenComments: (post: Post) => void;
  onShare: (post: Post) => void;
  onUserPress: (userId: string, userName: string) => void;
}

function PostCard({ post, currentUserId, onLike, onOpenComments, onShare, onUserPress }: PostCardProps) {
  const liked = post.likes.includes(currentUserId);
  const achievement = post.achievement_id
    ? ACHIEVEMENTS.find(a => a.id === post.achievement_id)
    : null;
  return (
    <Animated.View
      entering={FadeInDown.duration(380).springify().damping(16)}
      layout={Layout.springify()}
      style={[styles.card, achievement && styles.cardAchievement]}>
      {/* Achievement banner — visually pops the post */}
      {achievement && (
        <View style={styles.achBanner}>
          <Text style={styles.achBannerEmoji}>{(achievement as any).icon ?? '🏆'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.achBannerLabel}>🏆 Logro desbloqueado</Text>
            <Text style={styles.achBannerTitle}>{achievement.title}</Text>
          </View>
        </View>
      )}
      {/* Header — tap avatar/name OR explicit button to open profile */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={() => onUserPress(post.user_id, post.user_name)}
          activeOpacity={0.7}
        >
          <Avatar name={post.user_name} />
          <View style={styles.cardHeaderText}>
            <Text style={styles.userName}>{post.user_name}</Text>
            <Text style={styles.timeAgo}>{timeAgo(post.created_at)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
            backgroundColor: COLORS.primary + '14', flexDirection: 'row',
            alignItems: 'center', gap: 4,
          }}
          onPress={() => onUserPress(post.user_id, post.user_name)}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={13} color={COLORS.primary} />
          <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '700' }}>Perfil</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Text style={styles.postContent}>{post.content}</Text>

      {/* Image */}
      {post.image_url ? (
        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      ) : null}

      {/* Tags */}
      {post.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.slice(0, 4).map(t => <TagBadge key={t} tag={t} />)}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(post.id)}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? '#f72585' : COLORS.textMuted}
          />
          <Text style={[styles.actionCount, liked && { color: '#f72585' }]}>
            {post.likes.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onOpenComments(post)}>
          <Ionicons name="chatbubble-outline" size={19} color={COLORS.textMuted} />
          <Text style={styles.actionCount}>{post.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onShare(post)}>
          <Ionicons name="share-social-outline" size={19} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ────────────────────────────────────────────────────────────
// Comments Modal
// ────────────────────────────────────────────────────────────
interface CommentsModalProps {
  post: Post | null;
  comments: PostComment[];
  currentUserId: string;
  currentUserName: string;
  visible: boolean;
  onClose: () => void;
  onAddComment: (postId: string, text: string) => void;
}

function CommentsModal({
  post, comments, currentUserId, currentUserName, visible, onClose, onAddComment,
}: CommentsModalProps) {
  const [text, setText] = useState('');

  function submit() {
    if (!text.trim() || !post) return;
    onAddComment(post.id, text.trim());
    setText('');
  }

  if (!post) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.commentsSheet}
        >
          {/* Handle */}
          <View style={styles.sheetHandle} />

          {/* Post preview */}
          <View style={styles.commentPostPreview}>
            <Avatar name={post.user_name} size={32} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.userName}>{post.user_name}</Text>
              <Text style={styles.commentPostText} numberOfLines={2}>{post.content}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Comments list */}
          <FlatList
            data={comments}
            keyExtractor={c => c.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: SPACING.md }}
            ListEmptyComponent={
              <Text style={styles.emptyComments}>Sé el primero en comentar</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <Avatar name={item.user_name} size={32} />
                <View style={styles.commentBubble}>
                  <Text style={styles.commentUser}>{item.user_name}</Text>
                  <Text style={styles.commentText}>{item.content}</Text>
                  <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                </View>
              </View>
            )}
          />

          {/* Input */}
          <View style={styles.commentInputRow}>
            <Avatar name={currentUserName} size={32} />
            <TextInput
              style={styles.commentInput}
              placeholder="Escribe un comentario..."
              placeholderTextColor={COLORS.textMuted}
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}
              onPress={submit}
              disabled={!text.trim()}
            >
              <Ionicons name="send" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeSheetBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Create Post Modal
// ────────────────────────────────────────────────────────────
const AVAILABLE_TAGS = [
  'freshwater', 'saltwater', 'planted', 'cichlidos', 'betta',
  'puestas', 'consulta', 'acuario', 'algas', 'marino', 'logro', 'alerta', 'plantas',
];

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, imageUrl: string, tags: string[], achievementId?: string) => void;
  userName: string;
  /** If set, opens directly with this achievement attached */
  initialAchievementId?: string;
}

function CreatePostModal({ visible, onClose, onSubmit, userName, initialAchievementId }: CreatePostModalProps) {
  const { unlocked } = useAchievements();
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [achievementId, setAchievementId] = useState<string | undefined>(initialAchievementId);

  // Reset achievement when modal opens with a new initial value
  React.useEffect(() => {
    if (visible) {
      setAchievementId(initialAchievementId);
      // Pre-fill content for achievement posts
      if (initialAchievementId) {
        const ach = ACHIEVEMENTS.find(a => a.id === initialAchievementId);
        if (ach) {
          setContent(`¡Acabo de desbloquear "${ach.title}"! ${ach.description}`);
          setSelectedTags(['logro']);
        }
      }
    }
  }, [visible, initialAchievementId]);

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  async function pickImage(source: 'gallery' | 'camera') {
    let perm: ImagePicker.PermissionResponse;
    if (source === 'camera') {
      perm = await ImagePicker.requestCameraPermissionsAsync();
    } else {
      perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
    if (!perm.granted) {
      Alert.alert(
        'Permiso denegado',
        source === 'camera'
          ? 'Necesitamos acceso a la cámara para tomar fotos.'
          : 'Necesitamos acceso a la galería para seleccionar fotos.'
      );
      return;
    }
    setPicking(true);
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8,
          });
      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } finally {
      setPicking(false);
    }
  }

  function handleClose() {
    setContent('');
    setImageUri(null);
    setSelectedTags([]);
    setAchievementId(undefined);
    onClose();
  }

  function submit() {
    if (!content.trim()) {
      Alert.alert('Error', 'Escribe algo para publicar');
      return;
    }
    onSubmit(content.trim(), imageUri ?? '', selectedTags, achievementId);
    setContent('');
    setImageUri(null);
    setSelectedTags([]);
    setAchievementId(undefined);
    onClose();
  }

  // List of achievements user actually has unlocked (most recent first)
  const myAchievements = React.useMemo(() => {
    const map = new Map(ACHIEVEMENTS.map(a => [a.id, a]));
    return [...unlocked]
      .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
      .map(u => map.get(u.id))
      .filter(Boolean) as typeof ACHIEVEMENTS;
  }, [unlocked]);

  const attachedAchievement = achievementId
    ? ACHIEVEMENTS.find(a => a.id === achievementId)
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.createSheet}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.createHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={userName} size={36} />
              <Text style={styles.createTitle}>Nueva publicación</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {/* Text input */}
            <TextInput
              style={styles.createTextInput}
              placeholder="¿Qué quieres compartir con la comunidad acuarista?"
              placeholderTextColor={COLORS.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            {/* ── Photo section ── */}
            <Text style={styles.createLabel}>Foto (opcional)</Text>

            {imageUri ? (
              /* Preview with remove button */
              <View style={styles.photoPreviewWrapper}>
                <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.photoRemoveBtn}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="close-circle" size={30} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              /* Placeholder + picker buttons */
              <View style={styles.photoPlaceholder}>
                {picking ? (
                  <ActivityIndicator color={COLORS.primary} size="large" />
                ) : (
                  <Ionicons name="image-outline" size={44} color={COLORS.textMuted} />
                )}
                <Text style={styles.photoPlaceholderText}>
                  {picking ? 'Cargando...' : 'Sin imagen adjunta'}
                </Text>
              </View>
            )}

            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => pickImage('gallery')}
                disabled={picking}
              >
                <Ionicons name="images-outline" size={20} color={COLORS.primary} />
                <Text style={styles.photoBtnText}>Galería</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => pickImage('camera')}
                disabled={picking}
              >
                <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
                <Text style={styles.photoBtnText}>Cámara</Text>
              </TouchableOpacity>
              {imageUri && (
                <TouchableOpacity
                  style={[styles.photoBtn, styles.photoBtnRemove]}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  <Text style={[styles.photoBtnText, { color: COLORS.error }]}>Quitar</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tags */}
            <Text style={styles.createLabel}>Etiquetas</Text>
            <View style={styles.tagsGrid}>
              {AVAILABLE_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagOption, selectedTags.includes(tag) && styles.tagOptionActive]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[
                    styles.tagOptionText,
                    selectedTags.includes(tag) && styles.tagOptionTextActive,
                  ]}>
                    #{tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Achievement picker (#share-logros) */}
            {myAchievements.length > 0 && (
              <>
                <Text style={styles.createLabel}>🏆 Adjuntar logro (opcional)</Text>
                {attachedAchievement ? (
                  <View style={styles.attachedAchBox}>
                    <Text style={{ fontSize: 28 }}>{(attachedAchievement as any).icon ?? '🏆'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attachedAchTitle}>{attachedAchievement.title}</Text>
                      <Text style={styles.attachedAchDesc} numberOfLines={2}>{attachedAchievement.description}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setAchievementId(undefined)} style={styles.attachedAchRemove}>
                      <Ionicons name="close" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    {myAchievements.slice(0, 12).map(a => (
                      <TouchableOpacity
                        key={a.id}
                        style={styles.achPickerItem}
                        onPress={() => setAchievementId(a.id)}
                      >
                        <Text style={{ fontSize: 28 }}>{(a as any).icon ?? '🏆'}</Text>
                        <Text style={styles.achPickerName} numberOfLines={1}>{a.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.publishBtn, !content.trim() && { opacity: 0.5 }]}
            onPress={submit}
            disabled={!content.trim()}
          >
            <Ionicons name="paper-plane" size={18} color="#fff" />
            <Text style={styles.publishBtnText}>Publicar</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────
export default function CommunityScreen() {
  const { user } = useAuth();
  const currentUserId   = user?.id ?? 'u1';
  const currentUserName = user?.full_name ?? 'Usuario Demo';

  const {
    posts, comments, loading, loadingMore, hasMore,
    toggleLike, loadComments, addComment, createPost, reload, loadMore,
  } = useCommunity();

  const { unlocked } = useAchievements();

  // My unlocked achievements (newest first) for the share-logros shortcut
  const achievementsList = useMemo(() => {
    const map = new Map(ACHIEVEMENTS.map(a => [a.id, a]));
    return [...unlocked]
      .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
      .map(u => map.get(u.id))
      .filter(Boolean) as typeof ACHIEVEMENTS;
  }, [unlocked]);

  // Top users derived from feed posts (proxy for "most active this week")
  const topUsers = useMemo(() => {
    const map: Record<string, { id: string; name: string; posts: number; likes: number }> = {};
    posts.forEach(p => {
      if (!map[p.user_id]) map[p.user_id] = { id: p.user_id, name: p.user_name, posts: 0, likes: 0 };
      map[p.user_id].posts++;
      map[p.user_id].likes += p.likes.length;
    });
    return Object.values(map).sort((a, b) => (b.posts * 2 + b.likes) - (a.posts * 2 + a.likes)).slice(0, 8);
  }, [posts]);

  const [activeTag,    setActiveTag]    = useState('todos');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showCreate,   setShowCreate]   = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [profileUser,  setProfileUser]  = useState<{ id: string; name: string } | null>(null);
  /** When set, opens the create modal with this achievement pre-attached */
  const [shareAchId,   setShareAchId]   = useState<string | undefined>(undefined);

  const filteredPosts = activeTag === 'todos'
    ? posts
    : posts.filter(p => p.tags.includes(activeTag));

  // ── Handlers ───────────────────────────────────────────────
  function handleLike(postId: string) {
    toggleLike(postId);
  }

  function handleOpenComments(post: Post) {
    setSelectedPost(post);
    setShowComments(true);
    loadComments(post.id);
  }

  function handleAddComment(postId: string, text: string) {
    // useCommunity already increments comments_count optimistically;
    // selectedPost is re-derived from posts elsewhere — don't double-bump.
    addComment(postId, text);
  }

  function handleCreatePost(content: string, imageUrl: string, tags: string[], achievementId?: string) {
    createPost(content, imageUrl, tags, achievementId);
    setShareAchId(undefined);
  }

  // ── Pull-to-refresh ────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  // ── Share ──────────────────────────────────────────────────
  const handleShare = useCallback(async (post: Post) => {
    const message = `${post.user_name} en Aquaria:\n\n${post.content}`;
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        try { await (navigator as any).share({ text: message, title: 'Aquaria' }); } catch (e) { console.warn('[Community] Share cancelled:', e); }
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(message);
          Alert.alert('Copiado', 'Texto copiado al portapapeles');
        } catch (e) { console.warn('[Community] Clipboard copy failed:', e); }
      }
      return;
    }
    try {
      await Share.share({ message });
    } catch (e) { console.warn('[Community] Share cancelled:', e); }
  }, []);

  // ── Pagination footer ──────────────────────────────────────
  // Spinner removed — silent loading on scroll (no visual noise)
  const renderFooter = () => {
    if (!hasMore && filteredPosts.length > 0 && !loadingMore) {
      return <Text style={styles.footerEnd}>— Fin del feed —</Text>;
    }
    return null;
  };

  return (
    <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Comunidad</Text>
          <Text style={styles.headerSub}>Comparte tu pasión acuarista</Text>
        </View>
        <TouchableOpacity style={styles.newPostBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newPostBtnText}>Publicar</Text>
        </TouchableOpacity>
      </View>

      {/* Tag filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tagScroll}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 8 }}
      >
        {COMMUNITY_TAGS.map(tag => (
          <TouchableOpacity
            key={tag}
            style={[styles.filterTag, activeTag === tag && styles.filterTagActive]}
            onPress={() => setActiveTag(tag)}
          >
            <Text style={[styles.filterTagText, activeTag === tag && styles.filterTagTextActive]}>
              {tag === 'todos' ? 'Todo' : `#${tag}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Feed */}
      <FlatList
        data={filteredPosts}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: SPACING.md, gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            {/* ── Inline composer (Facebook-style tappable card) ────────── */}
            <View style={styles.composerCard}>
              <Avatar name={currentUserName} size={40} />
              <TouchableOpacity
                style={styles.composerPlaceholder}
                onPress={() => setShowCreate(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.composerText}>¿Qué tal tu acuario hoy, {currentUserName.split(' ')[0]}?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.composerImgBtn}
                onPress={() => setShowCreate(true)}
              >
                <Ionicons name="image-outline" size={20} color={COLORS.success} />
              </TouchableOpacity>
            </View>

            {/* ── Compartir logro (shortcut) ────────────────────────────── */}
            {achievementsList.length > 0 && (
              <View style={styles.shareLogroCard}>
                <View style={styles.shareLogroHeader}>
                  <Text style={styles.shareLogroTitle}>🏆 Comparte tus logros</Text>
                  <Text style={styles.shareLogroSub}>Tus seguidores adoran tus victorias</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {achievementsList.slice(0, 8).map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={styles.shareLogroItem}
                      onPress={() => { setShareAchId(a.id); setShowCreate(true); }}
                    >
                      <Text style={{ fontSize: 24 }}>{(a as any).icon ?? '🏆'}</Text>
                      <Text style={styles.shareLogroName} numberOfLines={1}>{a.title}</Text>
                      <View style={styles.shareLogroBtn}>
                        <Text style={styles.shareLogroBtnText}>Compartir</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Top users (rivalidad) ──────────────────────────────────── */}
            {topUsers.length > 1 && (
              <View style={styles.topUsersCard}>
                <View style={styles.topUsersHeader}>
                  <Text style={styles.topUsersTitle}>⭐ Comunidad estrella</Text>
                  <Text style={styles.topUsersSub}>Los más activos esta semana</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {topUsers.map((u, i) => (
                    <TouchableOpacity
                      key={u.id}
                      style={styles.topUserItem}
                      onPress={() => setProfileUser({ id: u.id, name: u.name })}
                    >
                      <View style={{ position: 'relative' }}>
                        <Avatar name={u.name} size={48} />
                        <View style={[styles.rankBadge, i === 0 && { backgroundColor: '#FFD700' }, i === 1 && { backgroundColor: '#C0C0C0' }, i === 2 && { backgroundColor: '#CD7F32' }]}>
                          <Text style={styles.rankBadgeText}>{i + 1}</Text>
                        </View>
                      </View>
                      <Text style={styles.topUserName} numberOfLines={1}>{u.name.split(' ')[0]}</Text>
                      <Text style={styles.topUserScore}>{u.posts} 📝 · {u.likes} ❤️</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        }
        // Pull-to-refresh
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        // Infinite scroll
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="ellipsis-horizontal" size={36} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText}>Cargando publicaciones…</Text>
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={56} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText}>Aún no hay publicaciones</Text>
              <Text style={[styles.emptyStateText, { fontSize: 13, marginTop: 4 }]}>¡Sé el primero en publicar!</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="filter-outline" size={56} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText}>No hay publicaciones con #{activeTag}</Text>
              <Text style={[styles.emptyStateText, { fontSize: 13, marginTop: 4 }]}>Prueba con otra etiqueta</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={currentUserId}
            onLike={handleLike}
            onOpenComments={handleOpenComments}
            onShare={handleShare}
            onUserPress={(id, name) => setProfileUser({ id, name })}
          />
        )}
      />

      {/* User profile modal */}
      <UserProfileModal
        visible={!!profileUser}
        userId={profileUser?.id ?? ''}
        userName={profileUser?.name ?? ''}
        posts={posts}
        onClose={() => setProfileUser(null)}
      />

      <CommentsModal
        post={selectedPost}
        comments={selectedPost ? (comments[selectedPost.id] ?? []) : []}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        visible={showComments}
        onClose={() => setShowComments(false)}
        onAddComment={handleAddComment}
      />

      <CreatePostModal
        visible={showCreate}
        onClose={() => { setShowCreate(false); setShareAchId(undefined); }}
        onSubmit={handleCreatePost}
        userName={currentUserName}
        initialAchievementId={shareAchId}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansEb },
  headerSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.sans },

  newPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  newPostBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, fontFamily: FONTS.sansSb },

  tagScroll: { maxHeight: 44, marginBottom: 4 },
  filterTag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundCard,
  },
  filterTagActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterTagText: { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.sans },
  filterTagTextActive: { color: '#fff', fontWeight: '600', fontFamily: FONTS.sansSb },

  // Post card
  card: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADII.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  cardHeaderText: { marginLeft: 10, flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.sansSb },
  timeAgo: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: FONTS.sans },

  postContent: { fontSize: 15, color: COLORS.text, lineHeight: 22, marginBottom: SPACING.sm, fontFamily: FONTS.sans },

  postImage: {
    width: '100%',
    height: 200,
    borderRadius: RADII.md,
    marginBottom: SPACING.sm,
  },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  tagBadge: {
    backgroundColor: 'rgba(0,180,216,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagBadgeText: { color: COLORS.primary, fontSize: 12, fontFamily: FONTS.sans },

  actionsRow: { flexDirection: 'row', gap: 20, marginTop: 4, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.sans },

  // Avatar
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontFamily: FONTS.sansBd },

  // Comments modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  commentsSheet: {
    backgroundColor: COLORS.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
  },
  createSheet: {
    backgroundColor: COLORS.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
    flex: 1,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 8,
  },
  commentPostPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  commentPostText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, fontFamily: FONTS.sans },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },

  commentRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  commentBubble: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    padding: 10,
  },
  commentUser: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 3, fontFamily: FONTS.sansSb },
  commentText: { fontSize: 14, color: COLORS.text, lineHeight: 20, fontFamily: FONTS.sans },
  commentTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontFamily: FONTS.sans },

  emptyComments: { textAlign: 'center', color: COLORS.textMuted, marginTop: 32, fontSize: 14, fontFamily: FONTS.sans },

  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.md,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    maxHeight: 100,
    fontFamily: FONTS.sans,
  },
  sendBtn: { paddingBottom: 8 },
  closeSheetBtn: { position: 'absolute', top: 16, right: 16 },

  // Create post
  createHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  createTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginLeft: 10, fontFamily: FONTS.sansBd },
  createLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginHorizontal: SPACING.md, marginTop: SPACING.md, marginBottom: 6, fontFamily: FONTS.sansSb },
  createTextInput: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
    fontFamily: FONTS.sans,
  },
  // Photo picker
  photoPreviewWrapper: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADII.md,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: RADII.md,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
  },
  photoPlaceholder: {
    marginHorizontal: SPACING.md,
    height: 110,
    borderRadius: RADII.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  photoPlaceholderText: { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.sans },
  photoActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADII.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
  },
  photoBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600', fontFamily: FONTS.sansSb },
  photoBtnRemove: { borderColor: COLORS.error + '55', flex: 0.8 },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: 8,
    marginBottom: SPACING.lg,
  },
  tagOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  tagOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tagOptionText: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.sans },
  tagOptionTextActive: { color: '#fff', fontWeight: '600', fontFamily: FONTS.sansSb },

  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.lg,
    paddingVertical: 14,
    gap: 8,
  },
  publishBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, fontFamily: FONTS.sansBd },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyStateText: { color: COLORS.textMuted, fontSize: 15, fontFamily: FONTS.sans },

  // Pagination footer
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  footerEnd: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 13,
    paddingVertical: 20,
    fontFamily: FONTS.sans,
  },

  // ── Inline composer (Facebook-style) ─────────────────────────────────────
  composerCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard, borderRadius: RADII.xl,
    padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  composerPlaceholder: {
    flex: 1, backgroundColor: COLORS.backgroundLight,
    borderRadius: RADII.full, paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  composerText: { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.sans },
  composerImgBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.success + '14',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Share-logro shortcut card ────────────────────────────────────────────
  shareLogroCard: {
    backgroundColor: COLORS.backgroundCard, borderRadius: RADII.xl,
    padding: SPACING.md, gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.warning + '44',
  },
  shareLogroHeader: { gap: 2 },
  shareLogroTitle:  { fontSize: 13, fontWeight: '700', color: COLORS.warning, fontFamily: FONTS.sansBd },
  shareLogroSub:    { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sans },
  shareLogroItem: {
    width: 96, padding: 8, alignItems: 'center', gap: 4, borderRadius: RADII.lg,
    backgroundColor: COLORS.backgroundLight,
  },
  shareLogroName: { fontSize: 11, fontWeight: '700', color: COLORS.text, textAlign: 'center', fontFamily: FONTS.sansSb },
  shareLogroBtn:  { backgroundColor: COLORS.warning, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  shareLogroBtnText: { color: '#fff', fontSize: 10, fontWeight: '800', fontFamily: FONTS.sansBd },

  // ── Top users card ───────────────────────────────────────────────────────
  topUsersCard: {
    backgroundColor: COLORS.backgroundCard, borderRadius: RADII.xl,
    padding: SPACING.md, gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  topUsersHeader: { gap: 2 },
  topUsersTitle:  { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  topUsersSub:    { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sans },
  topUserItem: { width: 80, alignItems: 'center', gap: 4 },
  topUserName: { fontSize: 11, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansSb },
  topUserScore:{ fontSize: 9, color: COLORS.textMuted, fontFamily: FONTS.sans },
  rankBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.primary,
    borderWidth: 2, borderColor: COLORS.backgroundCard,
    alignItems: 'center', justifyContent: 'center',
  },
  rankBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', fontFamily: FONTS.sansBd },

  // ── Achievement post styling ─────────────────────────────────────────────
  cardAchievement: { borderColor: COLORS.warning + '88', borderWidth: 2 },
  achBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.warning + '14',
    borderRadius: RADII.lg, padding: SPACING.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.warning + '33',
  },
  achBannerEmoji: { fontSize: 32 },
  achBannerLabel: { fontSize: 10, fontWeight: '800', color: COLORS.warning, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONTS.sansBd },
  achBannerTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },

  // ── Achievement picker in modal ──────────────────────────────────────────
  attachedAchBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.warning + '14',
    borderRadius: RADII.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.warning + '44',
    marginBottom: SPACING.md,
  },
  attachedAchTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.sansBd },
  attachedAchDesc:  { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.sans },
  attachedAchRemove: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.backgroundLight,
    alignItems: 'center', justifyContent: 'center',
  },
  achPickerItem: {
    width: 84, padding: 8, alignItems: 'center', gap: 4, borderRadius: RADII.lg,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1, borderColor: COLORS.border,
  },
  achPickerName: { fontSize: 10, fontWeight: '600', color: COLORS.text, textAlign: 'center', fontFamily: FONTS.sansSb },
});
