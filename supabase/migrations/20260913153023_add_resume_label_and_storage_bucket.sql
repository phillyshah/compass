/*
# Add resume label column and storage bucket

## Changes
1. Add `label` column to `resumes` table for version names (e.g. "Engineering Resume", "Finance Resume")
2. Create `resumes` storage bucket for file uploads
3. Add storage policies so authenticated users can manage their own resume files

## Modified Tables
- **resumes** - Added `label` text column for descriptive version names

## Security
- Storage bucket is private (not public)
- Users can only upload to their own folder (path prefix = auth.uid())
- Users can only read/delete their own files
*/

-- Add label column for resume versions
DO $$ BEGIN
  ALTER TABLE resumes ADD COLUMN label text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can manage files in their own folder
DROP POLICY IF EXISTS "Users upload own resumes" ON storage.objects;
CREATE POLICY "Users upload own resumes" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users read own resumes" ON storage.objects;
CREATE POLICY "Users read own resumes" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own resumes" ON storage.objects;
CREATE POLICY "Users delete own resumes" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own resumes" ON storage.objects;
CREATE POLICY "Users update own resumes" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
