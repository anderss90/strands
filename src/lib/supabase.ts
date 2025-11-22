import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (uses public anon key)
export const createClientSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

// Server-side Supabase client with service role key
export const createServerSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Database connection using connection pooler (for serverless functions)
export const getDatabaseUrl = () => {
  const poolerUrl = process.env.DATABASE_POOLER_URL;
  const directUrl = process.env.DATABASE_URL;
  
  // Prefer connection pooler for serverless functions
  return poolerUrl || directUrl || '';
};

