-- ═══════════════════════════════════════════════════════════════════════════
-- AquaManager · Analítica de uso (zona caliente)
-- ───────────────────────────────────────────────────────────────────────────
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente.
--
-- Registra eventos de uso (screen_view y acciones) para el panel de Métricas
-- del admin. El usuario solo puede insertar SUS eventos; el admin los ve todos.
--
-- NOTA DE ESCALA: screen_view genera muchas filas con el tiempo. Para launch
-- está bien; a futuro conviene podar eventos viejos (ej. borrar > 90 días) o
-- migrar a una herramienta dedicada (PostHog). Ver índice por created_at.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event      TEXT NOT NULL,
  screen     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_created ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_screen  ON public.analytics_events(screen);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- El usuario inserta solo sus propios eventos
DROP POLICY IF EXISTS "analytics_insert_own" ON public.analytics_events;
CREATE POLICY "analytics_insert_own" ON public.analytics_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- El admin ve todos los eventos
DROP POLICY IF EXISTS "analytics_admin_select" ON public.analytics_events;
CREATE POLICY "analytics_admin_select" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Verificación:
--   SELECT policyname FROM pg_policies WHERE tablename = 'analytics_events';
