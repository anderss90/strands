-- Migration: Add audio support to images table
-- Extends the images table to support audio files in addition to images and videos

-- Update media_type CHECK constraint to include 'audio'
ALTER TABLE images 
DROP CONSTRAINT IF EXISTS images_media_type_check;

ALTER TABLE images 
ADD CONSTRAINT images_media_type_check 
CHECK (media_type IN ('image', 'video', 'audio'));

-- Add comment to clarify the table now handles images, videos, and audio
COMMENT ON TABLE images IS 'Stores images, videos, and audio files. Use media_type column to distinguish.';

