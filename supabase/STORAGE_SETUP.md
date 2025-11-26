# Supabase Storage Setup for Direct Uploads

This document describes how to configure Supabase Storage for direct client-side uploads of images and videos.

## Storage Bucket Configuration

### 1. Create or Configure Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the sidebar
3. If the `images` bucket doesn't exist, create it:
   - Click **New bucket**
   - Name: `images`
   - Public bucket: **Yes** (for public access to media)
   - File size limit: Set to your desired maximum (e.g., 100MB for videos)
   - Allowed MIME types: Leave empty to allow all, or specify:
     - `image/*` for images
     - `video/*` for videos

### 2. Configure Row Level Security (RLS) Policies

The bucket needs RLS policies to allow:
- Authenticated users to upload files
- Public read access to files
- Users to manage their own files

Run these SQL commands in the Supabase SQL Editor:

```sql
-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images');

-- Policy: Allow public read access
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

-- Policy: Allow users to delete their own files
CREATE POLICY "Allow users to delete own files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy: Allow users to update their own files
CREATE POLICY "Allow users to update own files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 3. Configure CORS (if needed)

For direct browser uploads, ensure CORS is properly configured:

1. Go to **Storage** > **Settings** in Supabase Dashboard
2. Configure CORS to allow requests from your domain
3. Or use Supabase's default CORS settings which should work for most cases

### 4. File Organization

Files are organized in the bucket with the following structure:
- `{user_id}/{file_name}` - Each user's files in their own folder

This structure:
- Makes it easy to identify file ownership
- Allows RLS policies to work effectively
- Keeps files organized

## Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_STORAGE_BUCKET=images
```

## Testing Direct Uploads

After configuration, test direct uploads:

1. Use the Supabase Storage JavaScript client
2. Upload a test file from the browser console
3. Verify the file appears in the Storage dashboard
4. Verify public URL is accessible

## Notes

- The `images` bucket name is configurable via `SUPABASE_STORAGE_BUCKET` env variable
- File size limits are enforced at the bucket level
- RLS policies ensure users can only manage their own files
- Public read access allows media to be displayed without authentication

