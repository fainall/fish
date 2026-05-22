import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, IS_DEMO_MODE } from '../services/supabase';
import { Post, PostComment } from '../types';
import { DEMO_POSTS, DEMO_COMMENTS } from '../data/communityData';
import { useAuth } from './useAuth';

const PAGE_SIZE = 15;

// AsyncStorage keys
const POSTS_KEY    = '@aquamanager_community_posts';
const COMMENTS_KEY = '@aquamanager_community_comments';

// ── Mappers ───────────────────────────────────────────────────────────────────
function rowToPost(row: any): Post {
  return {
    id:             row.id,
    user_id:        row.user_id,
    user_name:      row.user_name,
    content:        row.content,
    image_url:      row.image_url ?? undefined,
    tags:           row.tags ?? [],
    likes:          (row.likes as string[] | null) ?? [],
    comments_count: Number(row.comments_count ?? 0),
    created_at:     row.created_at,
    achievement_id: row.achievement_id ?? undefined,
  };
}

// ── Local persistence helpers ─────────────────────────────────────────────────
async function loadLocalPosts(): Promise<Post[]> {
  try {
    const raw = await AsyncStorage.getItem(POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { console.warn('[Community] loadLocalPosts failed:', e); return []; }
}

async function saveLocalPosts(posts: Post[]) {
  try {
    // Only persist user-created posts (not demo ones)
    const userPosts = posts.filter(p => !DEMO_POSTS.some(d => d.id === p.id));
    await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(userPosts));
  } catch (e) { console.warn('[Community] saveLocalPosts failed:', e); }
}

async function loadLocalComments(): Promise<Record<string, PostComment[]>> {
  try {
    const raw = await AsyncStorage.getItem(COMMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { console.warn('[Community] loadLocalComments failed:', e); return {}; }
}

async function saveLocalComments(comments: Record<string, PostComment[]>) {
  try {
    // Only persist comments on non-demo posts or user-added comments on demo posts
    const filtered: Record<string, PostComment[]> = {};
    for (const [postId, cmts] of Object.entries(comments)) {
      const demoComments = DEMO_COMMENTS[postId] ?? [];
      const demoIds = new Set(demoComments.map(c => c.id));
      const userAdded = cmts.filter(c => !demoIds.has(c.id));
      if (userAdded.length > 0) filtered[postId] = userAdded;
    }
    await AsyncStorage.setItem(COMMENTS_KEY, JSON.stringify(filtered));
  } catch (e) { console.warn('[Community] saveLocalComments failed:', e); }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useCommunity() {
  const { user } = useAuth();
  const uid = user?.id ?? '';

  const [posts,       setPosts]       = useState<Post[]>(IS_DEMO_MODE ? DEMO_POSTS : []);
  const [comments,    setComments]    = useState<Record<string, PostComment[]>>(IS_DEMO_MODE ? DEMO_COMMENTS : {});
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(!IS_DEMO_MODE);
  const [creating,    setCreating]    = useState(false);
  const initialized = useRef(false);

  // ── Persist changes to AsyncStorage (demo mode only) ────────────────────────
  // In real mode, Supabase is the source of truth — no local persistence needed
  useEffect(() => {
    if (!initialized.current || !IS_DEMO_MODE) return;
    saveLocalPosts(posts);
  }, [posts]);

  useEffect(() => {
    if (!initialized.current || !IS_DEMO_MODE) return;
    saveLocalComments(comments);
  }, [comments]);

  // ── Load first page ────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    setLoading(true);

    if (IS_DEMO_MODE) {
      // Load user-created posts from AsyncStorage and merge with demo posts
      const localPosts    = await loadLocalPosts();
      const localComments = await loadLocalComments();

      // Merge: user posts first (newest), then demo posts
      const demoIds = new Set(DEMO_POSTS.map(p => p.id));
      const userPosts = localPosts.filter(p => !demoIds.has(p.id));
      const merged = [...userPosts, ...DEMO_POSTS].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setPosts(merged);

      // Merge comments: demo + locally saved user comments
      const mergedComments = { ...DEMO_COMMENTS };
      for (const [postId, cmts] of Object.entries(localComments)) {
        const existing = mergedComments[postId] ?? [];
        const existingIds = new Set(existing.map(c => c.id));
        const newCmts = cmts.filter(c => !existingIds.has(c.id));
        mergedComments[postId] = [...existing, ...newCmts];
      }
      setComments(mergedComments);

      setHasMore(false);
      initialized.current = true;
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('posts_with_counts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);
      if (!error && data) {
        setPosts(data.map(rowToPost));
        setHasMore(data.length === PAGE_SIZE);
      } else {
        setPosts([]);
        setHasMore(false);
      }
    } catch (e) {
      console.warn('[Community] Supabase reload failed:', e);
      setPosts([]);
      setHasMore(false);
    }
    initialized.current = true;
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── Load more (pagination) ─────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (IS_DEMO_MODE || !hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const offset = posts.length;
      const { data, error } = await supabase
        .from('posts_with_counts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (!error && data) {
        const existingIds = new Set(posts.map(p => p.id));
        const newPosts = data.map(rowToPost).filter(p => !existingIds.has(p.id));
        setPosts(prev => [...prev, ...newPosts]);
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (e) { console.warn('[Community] loadMore failed:', e); }
    setLoadingMore(false);
  }, [hasMore, loadingMore, loading, posts]);

  // ── Upload image to Supabase Storage ──────────────────────────────────────
  const uploadPostImage = useCallback(async (localUri: string): Promise<string | null> => {
    if (!localUri || !uid) return null;
    try {
      const rawExt = (localUri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
      const safe   = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(rawExt) ? rawExt : 'jpg';
      const mime   = safe === 'png' ? 'image/png' : safe === 'gif' ? 'image/gif' : safe === 'webp' ? 'image/webp' : 'image/jpeg';
      const path   = `${uid}/${Date.now()}.${safe === 'jpeg' ? 'jpg' : safe}`;

      const response = await fetch(localUri);
      const arrayBuffer = await response.arrayBuffer();

      const { error } = await (supabase as any).storage
        .from('posts')
        .upload(path, arrayBuffer, { contentType: mime, upsert: false });

      if (error) return null;

      const { data } = (supabase as any).storage.from('posts').getPublicUrl(path);
      return (data?.publicUrl as string) ?? null;
    } catch (e) {
      console.warn('[Community] uploadPostImage failed:', e);
      return null;
    }
  }, [uid]);

  // ── toggleLike ─────────────────────────────────────────────────────────────
  const toggleLike = useCallback(async (postId: string) => {
    if (!uid) return;

    const post    = posts.find(p => p.id === postId);
    const isLiked = post?.likes.includes(uid) ?? false;

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const newLikes = isLiked
        ? p.likes.filter(id => id !== uid)
        : [uid, ...p.likes];
      return { ...p, likes: newLikes };
    }));

    if (!IS_DEMO_MODE) {
      try {
        if (isLiked) {
          await supabase.from('post_likes').delete().match({ post_id: postId, user_id: uid });
        } else {
          await supabase.from('post_likes').insert({ post_id: postId, user_id: uid });
        }
      } catch (e) {
        console.warn('[Community] toggleLike rollback:', e);
        setPosts(prev => prev.map(p => {
          if (p.id !== postId) return p;
          const rolled = isLiked ? [uid, ...p.likes] : p.likes.filter(id => id !== uid);
          return { ...p, likes: rolled };
        }));
      }
    }
  }, [posts, uid]);

  // ── loadComments ───────────────────────────────────────────────────────────
  const loadComments = useCallback(async (postId: string) => {
    if (comments[postId]) return;

    if (!IS_DEMO_MODE) {
      try {
        const { data, error } = await supabase
          .from('post_comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at');
        if (!error && data) {
          setComments(prev => ({ ...prev, [postId]: data as PostComment[] }));
          return;
        }
      } catch (e) { console.warn('[Community] loadComments failed:', e); }
    }
    setComments(prev => ({ ...prev, [postId]: IS_DEMO_MODE ? (DEMO_COMMENTS[postId] ?? []) : [] }));
  }, [comments]);

  // ── addComment ─────────────────────────────────────────────────────────────
  const addComment = useCallback(async (postId: string, text: string) => {
    if (!user) return;

    const optimistic: PostComment = {
      id:         `c_${Date.now()}`,
      post_id:    postId,
      user_id:    uid,
      user_name:  user.full_name ?? 'Usuario',
      content:    text,
      created_at: new Date().toISOString(),
    };

    setComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), optimistic] }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));

    if (!IS_DEMO_MODE) {
      try {
        const { data, error } = await supabase.from('post_comments').insert({
          post_id:   postId,
          user_id:   uid,
          user_name: user.full_name ?? 'Usuario',
          content:   text,
        }).select().single();
        if (!error && data) {
          setComments(prev => ({
            ...prev,
            [postId]: (prev[postId] ?? []).map(c => c.id === optimistic.id ? (data as PostComment) : c),
          }));
        }
      } catch (e) { console.warn('[Community] addComment failed:', e); }
    }
  }, [user, uid]);

  // ── createPost ─────────────────────────────────────────────────────────────
  const createPost = useCallback(async (content: string, localImageUri: string, tags: string[], achievementId?: string) => {
    if (!user || creating) return;
    setCreating(true);

    const optimistic: Post = {
      id:             `p_${Date.now()}`,
      user_id:        uid,
      user_name:      user.full_name ?? 'Usuario',
      content,
      image_url:      localImageUri || undefined,
      tags,
      likes:          [],
      comments_count: 0,
      created_at:     new Date().toISOString(),
      achievement_id: achievementId,
    };

    setPosts(prev => [optimistic, ...prev]);
    setComments(prev => ({ ...prev, [optimistic.id]: [] }));

    if (!IS_DEMO_MODE) {
      try {
        let finalImageUrl: string | null = null;
        if (localImageUri) {
          finalImageUrl = await uploadPostImage(localImageUri);
          if (finalImageUrl) {
            setPosts(prev => prev.map(p =>
              p.id === optimistic.id ? { ...p, image_url: finalImageUrl! } : p
            ));
          }
        }

        const { data, error } = await supabase.from('posts').insert({
          user_id:   uid,
          user_name: user.full_name ?? 'Usuario',
          content,
          image_url: finalImageUrl,
          tags,
          achievement_id: achievementId ?? null,
        }).select().single();

        if (!error && data) {
          setPosts(prev => prev.map(p =>
            p.id === optimistic.id ? { ...p, id: data.id } : p
          ));
          setComments(prev => {
            const existing = prev[optimistic.id] ?? [];
            const { [optimistic.id]: _drop, ...rest } = prev;
            return { ...rest, [data.id]: existing };
          });
        }
      } catch (e) { console.warn('[Community] createPost failed:', e); }
    }
    setCreating(false);
  }, [user, uid, creating, uploadPostImage]);

  return {
    posts, comments, loading, loadingMore, hasMore, creating,
    toggleLike, loadComments, addComment, createPost, reload, loadMore,
  };
}
