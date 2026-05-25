-- ═══════════════════════════════════════════════════════════════════════════
-- AquaManager · Permitir borrar el comentario propio en la comunidad
-- ───────────────────────────────────────────────────────────────────────────
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente: seguro de correr varias veces.
--
-- POR QUÉ:
--   La tabla post_comments tenía políticas de lectura (comments_read) e
--   inserción (comments_insert) pero NINGUNA de DELETE. Sin esto, el borrado
--   de comentarios desde la app falla en silencio (RLS lo bloquea).
--
--   Esta política permite que CADA usuario borre ÚNICAMENTE sus propios
--   comentarios (auth.uid() = user_id). No puede borrar los de otros.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "comments_delete" ON public.post_comments;
CREATE POLICY "comments_delete" ON public.post_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Verificación (debe listar comments_delete):
--   SELECT policyname FROM pg_policies WHERE tablename = 'post_comments';
