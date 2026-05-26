-- ═══════════════════════════════════════════════════════════════════════════
-- AquaManager · Tickets de soporte / reporte de errores
-- ───────────────────────────────────────────────────────────────────────────
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente: seguro de correr varias veces.
--
-- Permite que los usuarios levanten tickets (errores/sugerencias) con captura
-- de pantalla opcional. El admin los ve todos y cambia su estado.
-- Las capturas se suben al bucket 'posts' bajo la carpeta tickets/.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name   TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'bug' CHECK (category IN ('bug', 'suggestion', 'other')),
  description TEXT NOT NULL,
  image_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_user   ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Crear / ver el propio ticket
DROP POLICY IF EXISTS "tickets_insert_own" ON public.support_tickets;
CREATE POLICY "tickets_insert_own" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tickets_select_own" ON public.support_tickets;
CREATE POLICY "tickets_select_own" ON public.support_tickets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admin: ver TODOS y actualizar estado
DROP POLICY IF EXISTS "tickets_admin_select" ON public.support_tickets;
CREATE POLICY "tickets_admin_select" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "tickets_admin_update" ON public.support_tickets;
CREATE POLICY "tickets_admin_update" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Verificación:
--   SELECT policyname FROM pg_policies WHERE tablename = 'support_tickets';
