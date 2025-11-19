-- Add strand fires (reactions) table

CREATE TABLE IF NOT EXISTS strand_fires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strand_id UUID NOT NULL REFERENCES strands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(strand_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_strand_fires_strand_id ON strand_fires(strand_id);
CREATE INDEX IF NOT EXISTS idx_strand_fires_user_id ON strand_fires(user_id);
CREATE INDEX IF NOT EXISTS idx_strand_fires_created_at ON strand_fires(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE strand_fires ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strand_fires
-- Allow authenticated users to read fires
CREATE POLICY "Allow authenticated to read strand fires" ON strand_fires
FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to create fires
CREATE POLICY "Allow authenticated to create strand fires" ON strand_fires
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to delete their own fires
CREATE POLICY "Allow authenticated to delete own strand fires" ON strand_fires
FOR DELETE TO authenticated USING (user_id = auth.uid());

