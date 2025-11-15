-- Migration: Add image_comments table
-- Run this in Supabase SQL Editor if the table doesn't exist yet

-- Image comments table
CREATE TABLE IF NOT EXISTS image_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (char_length(content) > 0 AND char_length(content) <= 1000)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_image_comments_image_id ON image_comments(image_id);
CREATE INDEX IF NOT EXISTS idx_image_comments_user_id ON image_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_image_comments_created_at ON image_comments(created_at);

-- Enable RLS on comments table
ALTER TABLE image_comments ENABLE ROW LEVEL SECURITY;

