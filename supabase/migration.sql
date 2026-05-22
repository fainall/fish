-- ═══════════════════════════════════════════════════════════════════════════════
-- AquaManager — Migración completa de Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query → Pegar todo → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabla pública de usuarios (mirror de auth.users) ─────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT,
  role       TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer perfiles públicos
DROP POLICY IF EXISTS "users_public_read" ON public.users;
CREATE POLICY "users_public_read" ON public.users
  FOR SELECT TO authenticated USING (true);

-- Solo el propio usuario puede actualizar su perfil
DROP POLICY IF EXISTS "users_self_update" ON public.users;
CREATE POLICY "users_self_update" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Trigger: crear fila en public.users cuando se registra en auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 2. Perfil de usuario (onboarding + preferencias) ────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  experience            TEXT DEFAULT 'beginner',
  knows_cycling         BOOLEAN,
  has_aquarium          BOOLEAN DEFAULT false,
  goals                 JSONB DEFAULT '[]'::jsonb,
  water_types           JSONB DEFAULT '["freshwater"]'::jsonb,
  onboarding_completed  BOOLEAN DEFAULT false,
  completed_at          TIMESTAMPTZ,
  display_name          TEXT,
  onboard_volume_liters NUMERIC,
  onboard_water_type    TEXT,
  onboard_style         TEXT,
  onboard_length_cm     NUMERIC,
  onboard_width_cm      NUMERIC,
  onboard_height_cm     NUMERIC,
  updated_at            TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_all" ON public.user_profiles;
CREATE POLICY "profiles_self_all" ON public.user_profiles
  FOR ALL TO authenticated USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger: crear perfil vacío al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_profile ON auth.users;
CREATE TRIGGER on_auth_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ─── 3. Acuarios ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aquariums (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  volume_liters  NUMERIC NOT NULL,
  length_cm      NUMERIC,
  width_cm       NUMERIC,
  height_cm      NUMERIC,
  water_type     TEXT DEFAULT 'freshwater',
  aquarium_style TEXT,
  description    TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aquariums ENABLE ROW LEVEL SECURITY;

-- Dueño: CRUD completo
DROP POLICY IF EXISTS "aquariums_owner" ON public.aquariums;
CREATE POLICY "aquariums_owner" ON public.aquariums
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Lectura pública (para perfiles de comunidad)
DROP POLICY IF EXISTS "aquariums_public_read" ON public.aquariums;
CREATE POLICY "aquariums_public_read" ON public.aquariums
  FOR SELECT TO authenticated USING (true);

-- ─── 4. Peces en acuarios ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aquarium_fish (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aquarium_id UUID NOT NULL REFERENCES public.aquariums(id) ON DELETE CASCADE,
  fish_id     TEXT NOT NULL,
  quantity    INTEGER DEFAULT 1,
  UNIQUE(aquarium_id, fish_id)
);
ALTER TABLE public.aquarium_fish ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aquarium_fish_owner" ON public.aquarium_fish;
CREATE POLICY "aquarium_fish_owner" ON public.aquarium_fish
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.aquariums WHERE id = aquarium_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.aquariums WHERE id = aquarium_id AND user_id = auth.uid())
  );

-- Lectura pública (perfiles comunidad)
DROP POLICY IF EXISTS "aquarium_fish_public_read" ON public.aquarium_fish;
CREATE POLICY "aquarium_fish_public_read" ON public.aquarium_fish
  FOR SELECT TO authenticated USING (true);

-- ─── 5. Registros de parámetros ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parameter_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aquarium_id TEXT NOT NULL,
  date        TEXT NOT NULL,
  temperature NUMERIC,
  ph          NUMERIC,
  ammonia     NUMERIC,
  nitrite     NUMERIC,
  nitrate     NUMERIC,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.parameter_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "params_owner" ON public.parameter_records;
CREATE POLICY "params_owner" ON public.parameter_records
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 6. Tareas de mantenimiento ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aquarium_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aquarium_id     TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT DEFAULT 'custom',
  due_date        TEXT NOT NULL,
  recurrence      TEXT DEFAULT 'none',
  completed       BOOLEAN DEFAULT false,
  completed_at    TIMESTAMPTZ,
  notification_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aquarium_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_owner" ON public.aquarium_tasks;
CREATE POLICY "tasks_owner" ON public.aquarium_tasks
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Lectura pública (perfiles comunidad)
DROP POLICY IF EXISTS "tasks_public_read" ON public.aquarium_tasks;
CREATE POLICY "tasks_public_read" ON public.aquarium_tasks
  FOR SELECT TO authenticated USING (true);

-- ─── 7. Wishlist ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wishlist (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fish_id  TEXT NOT NULL,
  note     TEXT,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, fish_id)
);
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlist_owner" ON public.wishlist;
CREATE POLICY "wishlist_owner" ON public.wishlist
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 8. Historial de peces ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fish_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aquarium_id TEXT NOT NULL,
  fish_id     TEXT NOT NULL,
  fish_name   TEXT,
  action      TEXT NOT NULL, -- 'added' | 'removed'
  reason      TEXT,
  qty         INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fish_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history_owner" ON public.fish_history;
CREATE POLICY "history_owner" ON public.fish_history
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 9. Logros desbloqueados ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "achievements_owner" ON public.user_achievements;
CREATE POLICY "achievements_owner" ON public.user_achievements
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 10. Fotos de acuarios ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aquarium_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aquarium_id TEXT NOT NULL,
  image_url   TEXT NOT NULL,
  caption     TEXT,
  taken_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aquarium_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photos_owner" ON public.aquarium_photos;
CREATE POLICY "photos_owner" ON public.aquarium_photos
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Lectura pública (perfiles comunidad)
DROP POLICY IF EXISTS "photos_public_read" ON public.aquarium_photos;
CREATE POLICY "photos_public_read" ON public.aquarium_photos
  FOR SELECT TO authenticated USING (true);

-- ─── 11. Posts de comunidad ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name      TEXT NOT NULL,
  content        TEXT NOT NULL,
  image_url      TEXT,
  tags           JSONB DEFAULT '[]'::jsonb,
  achievement_id TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_public_read" ON public.posts;
CREATE POLICY "posts_public_read" ON public.posts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "posts_owner_insert" ON public.posts;
CREATE POLICY "posts_owner_insert" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_owner_delete" ON public.posts;
CREATE POLICY "posts_owner_delete" ON public.posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 12. Likes de posts ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_likes (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_all" ON public.post_likes;
CREATE POLICY "likes_all" ON public.post_likes
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "likes_read" ON public.post_likes;
CREATE POLICY "likes_read" ON public.post_likes
  FOR SELECT TO authenticated USING (true);

-- ─── 13. Comentarios de posts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name  TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_read" ON public.post_comments;
CREATE POLICY "comments_read" ON public.post_comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "comments_insert" ON public.post_comments;
CREATE POLICY "comments_insert" ON public.post_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ─── 14. Vista: posts con conteo de comentarios y likes ──────────────────────
CREATE OR REPLACE VIEW public.posts_with_counts AS
SELECT
  p.*,
  COALESCE(
    (SELECT jsonb_agg(pl.user_id) FROM public.post_likes pl WHERE pl.post_id = p.id),
    '[]'::jsonb
  ) AS likes,
  (SELECT COUNT(*) FROM public.post_comments pc WHERE pc.post_id = p.id)::integer AS comments_count
FROM public.posts p;

-- ─── 15. Sugerencias de peces ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fish_suggestions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name  TEXT,
  fish_name  TEXT NOT NULL,
  notes      TEXT,
  status     TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fish_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suggestions_owner" ON public.fish_suggestions;
CREATE POLICY "suggestions_owner" ON public.fish_suggestions
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 16. Metas de crianza ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.breeding_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aquarium_id   TEXT,
  species_a     TEXT NOT NULL,
  species_b     TEXT,
  status        TEXT DEFAULT 'planning',
  notes         TEXT,
  target_date   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.breeding_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "breeding_owner" ON public.breeding_goals;
CREATE POLICY "breeding_owner" ON public.breeding_goals
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.breeding_checklist (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breeding_goal_id  UUID NOT NULL REFERENCES public.breeding_goals(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  checked           BOOLEAN DEFAULT false
);
ALTER TABLE public.breeding_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_via_goal" ON public.breeding_checklist;
CREATE POLICY "checklist_via_goal" ON public.breeding_checklist
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.breeding_goals WHERE id = breeding_goal_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.breeding_goals WHERE id = breeding_goal_id AND user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.breeding_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breeding_goal_id  UUID NOT NULL REFERENCES public.breeding_goals(id) ON DELETE CASCADE,
  date              TEXT NOT NULL,
  note              TEXT,
  event_type        TEXT
);
ALTER TABLE public.breeding_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logs_via_goal" ON public.breeding_logs;
CREATE POLICY "logs_via_goal" ON public.breeding_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.breeding_goals WHERE id = breeding_goal_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.breeding_goals WHERE id = breeding_goal_id AND user_id = auth.uid())
  );

-- ─── 17. Recordatorios de fertilización ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fert_reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aquarium_id TEXT NOT NULL,
  product     TEXT NOT NULL,
  dose_ml     NUMERIC,
  frequency   TEXT,
  last_dose   TIMESTAMPTZ,
  next_dose   TIMESTAMPTZ,
  enabled     BOOLEAN DEFAULT true,
  UNIQUE(user_id, aquarium_id, product)
);
ALTER TABLE public.fert_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fert_owner" ON public.fert_reminders;
CREATE POLICY "fert_owner" ON public.fert_reminders
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 18. Storage buckets ─────────────────────────────────────────────────────
-- Avatares de usuario
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

-- Fotos de acuarios
INSERT INTO storage.buckets (id, name, public) VALUES ('aquarium-photos', 'aquarium-photos', true)
  ON CONFLICT (id) DO NOTHING;

-- Imágenes de posts
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true)
  ON CONFLICT (id) DO NOTHING;

-- Políticas de storage: upload autenticado, lectura pública
-- NOTA: PostgreSQL NO soporta `CREATE POLICY IF NOT EXISTS` → hay que hacer
--       DROP POLICY IF EXISTS antes de CREATE (de lo contrario la migración
--       lanza un error de sintaxis y revierte TODO en una transacción).
-- NOTA: el INSERT solo valida bucket_id (no la carpeta uid/) porque el admin
--       sube imágenes de peces a la carpeta `fish/`, no a `uid/`.
DO $$
DECLARE
  buckets TEXT[] := ARRAY['avatars', 'aquarium-photos', 'posts'];
  b TEXT;
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    -- Idempotencia: borra políticas previas (nombres nuevos y legacy)
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_insert');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_select');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_delete');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_upload');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_read');

    -- Upload: cualquier usuario autenticado (la app separa por uid/ o fish/)
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)',
      b || '_insert', b
    );
    -- Read: público
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR SELECT TO public USING (bucket_id = %L)',
      b || '_select', b
    );
    -- Delete: solo el dueño del archivo
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND owner = auth.uid())',
      b || '_delete', b
    );
  END LOOP;
END $$;

-- ─── 19. Backfill: crear filas para usuarios que existían antes del trigger ──
-- Esto asegura que usuarios ya registrados tengan su fila en public.users y user_profiles.
INSERT INTO public.users (id, email, full_name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email), 'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ─── 20. Permisos de la vista posts_with_counts ─────────────────────────────
GRANT SELECT ON public.posts_with_counts TO authenticated;
GRANT SELECT ON public.posts_with_counts TO anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ Migración completa. Todas las tablas, vistas, triggers, RLS y storage
--    están configurados. La app ahora sincronizará datos entre dispositivos.
-- ═══════════════════════════════════════════════════════════════════════════════
