-- ═══════════════════════════════════════════════════════════════════════════
-- AquaManager · Parches de seguridad CRÍTICOS (auditoría 2026-06-10)
-- ───────────────────────────────────────────────────────────────────────────
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente: seguro de correr varias veces.
--
-- Cierra dos agujeros explotables HOY desde una cuenta normal con la anon key:
--   #1  Escalada de privilegios: cualquiera podía hacerse admin con
--       update({role:'admin'}) sobre su propia fila de public.users.
--   #2  Fuga de PII: public.users era de lectura pública (TO authenticated
--       USING true), incluida la columna email → cosecha masiva de correos.
--
-- La app solo lee su PROPIA fila de users (useAuth.fetchProfile con el id
-- propio) y nunca la actualiza desde el cliente → estos cambios no rompen
-- login ni perfil. El admin sigue viendo a todos (panel) vía is_admin().
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Helper: is_admin() sin recursión de RLS ────────────────────────────────
-- SECURITY DEFINER → la subconsulta a public.users NO vuelve a disparar la RLS
-- de users (evita recursión infinita al usarla dentro de sus propias policies).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ═══ #2 — Lectura: cerrar la lectura pública de emails ══════════════════════
DROP POLICY IF EXISTS "users_public_read" ON public.users;

-- El usuario lee SOLO su propia fila (lo único que la app necesita).
DROP POLICY IF EXISTS "users_self_read" ON public.users;
CREATE POLICY "users_self_read" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- El admin puede leer todas las filas (panel de administración, conteos).
DROP POLICY IF EXISTS "users_admin_read" ON public.users;
CREATE POLICY "users_admin_read" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ═══ #1 — Escritura: impedir que el cliente cambie su propio rol ════════════
-- La policy de UPDATE sigue restringida a la propia fila, pero un trigger
-- BEFORE UPDATE bloquea cualquier cambio de `role` hecho por los roles del
-- cliente (authenticated/anon). El SQL Editor (postgres) y service_role SÍ
-- pueden cambiar el rol → puedes seguir promoviendo admins manualmente aquí.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'No autorizado a cambiar el rol del usuario.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.users;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- (Opcional, defensa en profundidad) reasegurar la policy de UPDATE por fila.
DROP POLICY IF EXISTS "users_self_update" ON public.users;
CREATE POLICY "users_self_update" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── Verificación ────────────────────────────────────────────────────────────
--   SELECT policyname FROM pg_policies WHERE tablename = 'users';
--     → users_self_read, users_admin_read, users_self_update
--   Prueba (debe FALLAR para un usuario normal):
--     update public.users set role='admin' where id = auth.uid();
