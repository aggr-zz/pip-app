-- ============================================================
-- 014: Avatar photo & emoji support
-- ============================================================

-- 1. New columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_emoji TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT;

-- 2. Storage bucket for avatars (public read, 2 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies
--    Anyone can read (public bucket)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'avatars_select'
  ) THEN
    CREATE POLICY "avatars_select" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'avatars');
  END IF;
END $$;

--    Authenticated users can upload
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'avatars_insert'
  ) THEN
    CREATE POLICY "avatars_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars');
  END IF;
END $$;

--    Authenticated users can update any avatar
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'avatars_update'
  ) THEN
    CREATE POLICY "avatars_update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars');
  END IF;
END $$;

--    Authenticated users can delete
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'avatars_delete'
  ) THEN
    CREATE POLICY "avatars_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'avatars');
  END IF;
END $$;
