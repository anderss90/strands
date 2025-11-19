-- Add unread tracking and push notification support

-- User group read status - tracks when user last viewed a group
CREATE TABLE IF NOT EXISTS user_group_read_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_group_read_status_user_group ON user_group_read_status(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_user_group_read_status_group ON user_group_read_status(group_id);

-- Push notification subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Enable Row Level Security (RLS)
ALTER TABLE user_group_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_group_read_status
-- Allow authenticated users to read their own read status
CREATE POLICY "Allow users to read own read status" ON user_group_read_status
FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Allow authenticated users to insert/update their own read status
CREATE POLICY "Allow users to manage own read status" ON user_group_read_status
FOR ALL TO authenticated USING (user_id = auth.uid());

-- RLS Policies for push_subscriptions
-- Allow authenticated users to read their own subscriptions
CREATE POLICY "Allow users to read own subscriptions" ON push_subscriptions
FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Allow authenticated users to manage their own subscriptions
CREATE POLICY "Allow users to manage own subscriptions" ON push_subscriptions
FOR ALL TO authenticated USING (user_id = auth.uid());

