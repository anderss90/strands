-- Migration: Migrate existing images to strands
-- Run this in Supabase SQL Editor AFTER running 003_create_strands.sql
-- This migration converts existing images and their shares/comments to strands

-- Create strands from existing images
INSERT INTO strands (user_id, image_id, created_at, updated_at)
SELECT 
  user_id,
  id as image_id,
  created_at,
  created_at as updated_at
FROM images
ON CONFLICT DO NOTHING;

-- Create strand_group_shares from image_group_shares
INSERT INTO strand_group_shares (strand_id, group_id, created_at)
SELECT 
  s.id as strand_id,
  igs.group_id,
  igs.created_at
FROM image_group_shares igs
INNER JOIN strands s ON s.image_id = igs.image_id
ON CONFLICT (strand_id, group_id) DO NOTHING;

-- Migrate comments from image_comments to strand_comments
INSERT INTO strand_comments (strand_id, user_id, content, created_at)
SELECT 
  s.id as strand_id,
  ic.user_id,
  ic.content,
  ic.created_at
FROM image_comments ic
INNER JOIN strands s ON s.image_id = ic.image_id
ON CONFLICT DO NOTHING;
