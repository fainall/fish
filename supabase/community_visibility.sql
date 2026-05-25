-- ═══════════════════════════════════════════════════════════════════════════
-- AquaManager · Visibilidad pública para perfiles de comunidad
-- ───────────────────────────────────────────────────────────────────────────
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente: seguro de correr varias veces.
--
-- POR QUÉ:
--   El UserProfileModal muestra los acuarios, peces y rutinas de OTROS usuarios.
--   Pero las políticas RLS de esas tablas eran solo-dueño (auth.uid() = user_id),
--   así que al consultar el perfil de otro acuarista Supabase devolvía vacío
--   → no se veían sus peces ni acuarios.
--
--   Esto añade SOLO lectura pública (SELECT). Las escrituras (INSERT/UPDATE/
--   DELETE) siguen restringidas al dueño por las políticas "propio" existentes
--   (en SELECT, Postgres combina políticas con OR, así que basta con añadir una
--   política de lectura pública; no hay que tocar las de escritura).
--
--   aquarium_photos ya tiene lectura pública (creada en storage_setup.sql).
-- ═══════════════════════════════════════════════════════════════════════════

-- Acuarios (públicos para ver perfiles)
DROP POLICY IF EXISTS "aquariums_public_read" ON public.aquariums;
CREATE POLICY "aquariums_public_read" ON public.aquariums
  FOR SELECT TO authenticated USING (true);

-- Peces de cada acuario (necesario para el join aquarium_fish)
DROP POLICY IF EXISTS "aqfish_public_read" ON public.aquarium_fish;
CREATE POLICY "aqfish_public_read" ON public.aquarium_fish
  FOR SELECT TO authenticated USING (true);

-- Rutinas / tareas (pestaña "Rutinas" del perfil)
DROP POLICY IF EXISTS "tasks_public_read" ON public.aquarium_tasks;
CREATE POLICY "tasks_public_read" ON public.aquarium_tasks
  FOR SELECT TO authenticated USING (true);

-- Verificación:
--   SELECT policyname FROM pg_policies
--   WHERE tablename IN ('aquariums','aquarium_fish','aquarium_tasks');
