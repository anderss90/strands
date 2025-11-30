# ⚠️ URGENT: Run Database Migration

## Problem
The `strand_media` table is missing in production, causing errors when creating strands with multiple images.

## Solution: Run Migration Immediately

### Step 1: Go to Supabase Dashboard
1. Visit [https://app.supabase.com](https://app.supabase.com)
2. Select your **production project** (not local/dev)

### Step 2: Open SQL Editor
1. Click **SQL Editor** in the left sidebar
2. Click **New query**

### Step 3: Run the Migration
Copy and paste the following SQL into the editor:

```sql
-- Migration: Add support for multiple media files per strand
-- This migration adds a strand_media table to support multiple images/videos per strand

-- Strand media table (supports multiple images/videos per strand)
CREATE TABLE IF NOT EXISTS strand_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strand_id UUID NOT NULL REFERENCES strands(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(strand_id, image_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_strand_media_strand_id ON strand_media(strand_id);
CREATE INDEX IF NOT EXISTS idx_strand_media_display_order ON strand_media(strand_id, display_order);

-- Migrate existing strands with image_id to strand_media
-- This ensures backward compatibility
INSERT INTO strand_media (strand_id, image_id, display_order, created_at)
SELECT 
  id as strand_id,
  image_id,
  0 as display_order,
  created_at
FROM strands
WHERE image_id IS NOT NULL
ON CONFLICT (strand_id, image_id) DO NOTHING;
```

### Step 4: Execute
1. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
2. You should see: **"Success. No rows returned"** or similar success message

### Step 5: Verify
Run this query to verify the table was created:

```sql
SELECT COUNT(*) FROM strand_media;
```

You should see a number (may be 0 if no strands with images exist yet).

## After Running Migration

The error should be resolved immediately. New strands with multiple images will work correctly.

## File Location
The migration file is also saved at: `supabase/migrations/005_add_strand_media.sql`

