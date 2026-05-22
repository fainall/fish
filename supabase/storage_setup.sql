-- ═══════════════════════════════════════════════════════════════════════════
-- AquaManager · Storage setup (buckets + RLS policies)
-- ───────────────────────────────────────────────────────────────────────────
-- Run this in:  Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to run multiple times.
--
-- WHY THIS FILE EXISTS:
--   The storage section of supabase/migration.sql used
--   `CREATE POLICY IF NOT EXISTS ...`, which is NOT valid PostgreSQL syntax.
--   That syntax error aborted the migration transaction, so the buckets and
--   the aquarium_photos table were never created → uploads failed with
--   "Bucket not found". This script fixes that with valid, idempotent SQL.
--
-- Buckets used by the app:
--   posts            → community post images + aquarium gallery photos
--                      paths: {uid}/{ts}.jpg   and   {uid}/{aquariumId}/{ts}.jpg
--                      admin fish images:        fish/{ts}.jpg
--   avatars          → user profile pictures   ({uid}/...)
--   aquarium-photos  → reserved (legacy)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 0. Table aquarium_photos (gallery rows) ────────────────────────────────
-- Lives only in migration.sql, which never applied (the policy syntax error
-- rolled it back). The gallery upload writes a row here AFTER the storage
-- upload succeeds, so without this table the upload fails at the DB step.
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

DROP POLICY IF EXISTS "photos_public_read" ON public.aquarium_photos;
CREATE POLICY "photos_public_read" ON public.aquarium_photos
  FOR SELECT TO authenticated USING (true);

-- ─── 1. Create public buckets ───────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES
  ('posts',           'posts',           true),
  ('avatars',         'avatars',         true),
  ('aquarium-photos', 'aquarium-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ─── 2. Storage RLS policies ─────────────────────────────────────────────────
-- INSERT : any authenticated user may upload into the bucket. The app namespaces
--          files by {uid}/ (gallery, community) or fish/ (admin), and uses a
--          timestamped filename + upsert:false, so collisions are impossible.
-- SELECT : public read (buckets are public; explicit policy for clarity).
-- UPDATE : only the file owner.
-- DELETE : only the file owner.
DO $$
DECLARE
  b       TEXT;
  buckets TEXT[] := ARRAY['posts', 'avatars', 'aquarium-photos'];
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    -- Drop any prior policies (new + legacy names) so this script is idempotent
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_insert');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_select');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_update');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_delete');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_upload'); -- legacy
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_read');   -- legacy

    -- INSERT
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)',
      b || '_insert', b
    );
    -- SELECT (public)
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR SELECT TO public USING (bucket_id = %L)',
      b || '_select', b
    );
    -- UPDATE (owner only)
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L AND owner = auth.uid())',
      b || '_update', b
    );
    -- DELETE (owner only)
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND owner = auth.uid())',
      b || '_delete', b
    );
  END LOOP;
END $$;

-- ─── 3. Verify ───────────────────────────────────────────────────────────────
-- After running, this should list the three buckets:
--   SELECT id, public FROM storage.buckets;
-- And these policies on storage.objects:
--   SELECT policyname FROM pg_policies WHERE tablename = 'objects';
