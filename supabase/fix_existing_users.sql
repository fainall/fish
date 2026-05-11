-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix: Backfill users and profiles for accounts created before triggers existed
-- Run this in Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Create public.users rows for any auth user that doesn't have one
INSERT INTO public.users (id, email, full_name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email), 'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Create user_profiles rows for any user that doesn't have one
INSERT INTO public.user_profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. Grant SELECT on the posts_with_counts view to authenticated users
GRANT SELECT ON public.posts_with_counts TO authenticated;
GRANT SELECT ON public.posts_with_counts TO anon;

-- 4. Verify: show all users and their profiles
SELECT u.id, u.email, u.full_name, up.onboarding_completed
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.id;
