-- Migration: Add support for multiple media files per strand
-- Run this in Supabase SQL Editor
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

-- Note: We keep the image_id column in strands table for backward compatibility
-- but new strands should use strand_media table for multiple media support

