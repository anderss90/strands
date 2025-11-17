-- Migration: Create strands tables
-- Run this in Supabase SQL Editor
-- This migration creates the strands system to replace image-only sharing

-- Strands table
CREATE TABLE IF NOT EXISTS strands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  image_id UUID REFERENCES images(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  CHECK (content IS NOT NULL OR image_id IS NOT NULL)
);

-- Strand group shares table
CREATE TABLE IF NOT EXISTS strand_group_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strand_id UUID NOT NULL REFERENCES strands(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(strand_id, group_id)
);

-- Strand pins table
CREATE TABLE IF NOT EXISTS strand_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strand_id UUID NOT NULL REFERENCES strands(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pinned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(strand_id, group_id)
);

-- Strand comments table (replaces image_comments)
CREATE TABLE IF NOT EXISTS strand_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strand_id UUID NOT NULL REFERENCES strands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (char_length(content) > 0 AND char_length(content) <= 1000)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_strands_user_id ON strands(user_id);
CREATE INDEX IF NOT EXISTS idx_strands_created_at ON strands(created_at);
CREATE INDEX IF NOT EXISTS idx_strands_image_id ON strands(image_id);
CREATE INDEX IF NOT EXISTS idx_strands_updated_at ON strands(updated_at);

CREATE INDEX IF NOT EXISTS idx_strand_group_shares_strand_id ON strand_group_shares(strand_id);
CREATE INDEX IF NOT EXISTS idx_strand_group_shares_group_id ON strand_group_shares(group_id);

CREATE INDEX IF NOT EXISTS idx_strand_pins_strand_id ON strand_pins(strand_id);
CREATE INDEX IF NOT EXISTS idx_strand_pins_group_id ON strand_pins(group_id);
CREATE INDEX IF NOT EXISTS idx_strand_pins_pinned_at ON strand_pins(pinned_at);

CREATE INDEX IF NOT EXISTS idx_strand_comments_strand_id ON strand_comments(strand_id);
CREATE INDEX IF NOT EXISTS idx_strand_comments_user_id ON strand_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_strand_comments_created_at ON strand_comments(created_at);

-- Create trigger for updated_at on strands
CREATE TRIGGER update_strands_updated_at BEFORE UPDATE ON strands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE strand_group_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE strand_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE strand_comments ENABLE ROW LEVEL SECURITY;
