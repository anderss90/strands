-- Migration: Configure Storage RLS policies for direct uploads
-- This app uses custom JWT authentication, not Supabase Auth
-- So we need to configure storage policies that don't require auth.uid()

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow file deletion" ON storage.objects;
DROP POLICY IF EXISTS "Allow file updates" ON storage.objects;

-- Policy: Allow anyone to upload files to the images bucket
-- The app validates authentication before calling direct upload
-- Files are organized as {userId}/{filename} for organization
CREATE POLICY "Allow uploads to images bucket" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'images');

-- Policy: Allow public read access (for displaying media)
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

-- Policy: Allow file deletion (app handles authorization server-side)
CREATE POLICY "Allow file deletion" ON storage.objects
FOR DELETE TO public
USING (bucket_id = 'images');

-- Policy: Allow file updates (app handles authorization server-side)
CREATE POLICY "Allow file updates" ON storage.objects
FOR UPDATE TO public
USING (bucket_id = 'images');

