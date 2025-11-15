# Supabase Database Setup

This directory contains the database schema and setup scripts for the Strands application.

## Setup Instructions

1. **Create a Supabase Project**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create a new project
   - Wait for the database to be provisioned

2. **Run the Schema SQL**
   - Go to the SQL Editor in your Supabase dashboard
   - Copy the contents of `schema.sql`
   - Paste and run it in the SQL Editor
   - This will create all necessary tables, indexes, and triggers

3. **Configure Connection Pooler**
   - Go to Settings > Database in your Supabase dashboard
   - Enable the connection pooler (Transaction mode recommended for serverless)
   - Copy the connection pooler URL (port 6543)
   - Use this URL in your `DATABASE_POOLER_URL` environment variable

4. **Set Up Storage Bucket**
   - Go to Storage in your Supabase dashboard
   - Create a new bucket named `images`
   - Configure the bucket as public or private based on your needs
   - Set up RLS policies for the bucket

5. **Environment Variables**
   - Add the Supabase credentials to your `.env.local` file
   - See `ENV_TEMPLATE.md` for the required variables

## Database Schema

The schema includes the following tables:

- **users** - User accounts and profiles
- **friends** - Friend relationships and requests
- **groups** - User groups
- **group_members** - Group membership
- **images** - Uploaded images
- **image_group_shares** - Image shares to groups

## Row Level Security (RLS)

RLS is enabled on all tables. You may need to create policies based on your authentication strategy. For now, the application uses application-level authorization.

## Connection Pooling

For serverless functions (Vercel), use the connection pooler URL (port 6543) in Transaction mode. This allows efficient connection management in serverless environments.

