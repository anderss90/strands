-- RLS Policies for Application-Level Authentication
-- These policies allow the application to access tables when using application-level authentication
-- Run this AFTER running schema.sql if you're using application-level authentication

-- Disable RLS temporarily (or create policies)
-- For application-level auth, we'll disable RLS on all tables
-- This allows our application (using service_role key) to access all data
-- You can add more restrictive policies later if needed

-- Note: If you want to use Supabase Auth instead, you'll need different policies
-- that check auth.uid() instead of disabling RLS

-- Disable RLS on all tables (for application-level authentication)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE friends DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE images DISABLE ROW LEVEL SECURITY;
ALTER TABLE image_group_shares DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS enabled, create policies that allow service_role access
-- The service_role key bypasses RLS, so these aren't strictly necessary
-- but they're here for reference if you want to use Supabase Auth later

-- Example policy for users table (if using Supabase Auth):
-- CREATE POLICY "Users can read own profile" ON users
--   FOR SELECT USING (auth.uid() = id);
-- 
-- CREATE POLICY "Service role can do anything" ON users
--   FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- For now, with application-level authentication, RLS is disabled
-- The application handles authorization through JWT tokens and application logic

