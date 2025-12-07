-- Migration: Add group_id to strand_comments for group-specific comments
-- Run this in Supabase SQL Editor
-- This allows comments to be scoped to specific groups when a strand is shared to multiple groups

-- Add group_id column (nullable to support existing comments)
ALTER TABLE strand_comments 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_strand_comments_strand_group ON strand_comments(strand_id, group_id);
CREATE INDEX IF NOT EXISTS idx_strand_comments_group_id ON strand_comments(group_id);

-- Existing comments will have group_id = NULL and remain visible in all groups
-- New comments will have group_id set based on the group context where they are created

