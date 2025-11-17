-- Migration: Add group_invites table for shareable invite links
-- Created: 2024

-- Group invites table
CREATE TABLE IF NOT EXISTS group_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_group_invites_token ON group_invites(token);
CREATE INDEX IF NOT EXISTS idx_group_invites_group_id ON group_invites(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_expires_at ON group_invites(expires_at);

-- RLS Policies
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Group members can create invites for their groups
CREATE POLICY "Group members can create invites"
  ON group_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_invites.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Policy: Anyone can read valid (non-expired) invites
CREATE POLICY "Anyone can read valid invites"
  ON group_invites
  FOR SELECT
  USING (
    expires_at > NOW()
  );

-- Policy: Group members can view all invites for their groups
CREATE POLICY "Group members can view group invites"
  ON group_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_invites.group_id
      AND group_members.user_id = auth.uid()
    )
  );

