-- ============================================================
-- AquaManager — Backfill usuarios existentes
-- Ejecutar DESPUÉS de supabase_schema.sql
-- Necesario porque el trigger handle_new_user no existía
-- cuando te registraste → tu usuario no tiene fila en public.users
-- ============================================================

-- 1. Inserta filas en public.users para cualquier auth.user que no tenga registro aún
INSERT INTO public.users (id, email, full_name, avatar_url, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email),
  au.raw_user_meta_data->>'avatar_url',
  'user'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 2. Inserta filas en public.user_profiles para cualquier user sin perfil
INSERT INTO public.user_profiles (id)
SELECT u.id
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 3. (Opcional) Verifica cuántos usuarios y perfiles quedaron
SELECT
  (SELECT count(*) FROM auth.users)       AS auth_users,
  (SELECT count(*) FROM public.users)     AS public_users,
  (SELECT count(*) FROM public.user_profiles) AS profiles;
