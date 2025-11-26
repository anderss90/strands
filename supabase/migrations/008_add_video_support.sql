-- Migration: Add video support to images table
-- Extends the images table to support both images and videos

-- Add media_type column to distinguish between images and videos
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) DEFAULT 'image' CHECK (media_type IN ('image', 'video'));

-- Add video-specific fields
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS duration INTEGER, -- Duration in seconds for videos
ADD COLUMN IF NOT EXISTS width INTEGER, -- Video/image width in pixels
ADD COLUMN IF NOT EXISTS height INTEGER; -- Video/image height in pixels

-- Update existing rows to have media_type = 'image'
UPDATE images SET media_type = 'image' WHERE media_type IS NULL;

-- Make media_type NOT NULL after setting defaults
ALTER TABLE images 
ALTER COLUMN media_type SET NOT NULL,
ALTER COLUMN media_type SET DEFAULT 'image';

-- Rename image_url to media_url for clarity (it can hold both image and video URLs)
-- We'll keep image_url for backward compatibility but add media_url as an alias
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Copy image_url to media_url for existing rows
UPDATE images SET media_url = image_url WHERE media_url IS NULL;

-- Create index on media_type for faster queries
CREATE INDEX IF NOT EXISTS idx_images_media_type ON images(media_type);

-- Create index on user_id and media_type for user media queries
CREATE INDEX IF NOT EXISTS idx_images_user_media_type ON images(user_id, media_type);

-- Add comment to clarify the table now handles both images and videos
COMMENT ON TABLE images IS 'Stores both images and videos. Use media_type column to distinguish.';

