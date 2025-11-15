# Database Setup Guide

## Overview

The database needs to be initialized before the application can work. This involves:
1. Creating all necessary tables
2. Setting up Row Level Security (RLS) policies
3. Verifying the connection

## Quick Setup

### Step 1: Run the Schema

1. **Go to Supabase Dashboard**
   - Visit [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Schema**
   - Open `supabase/schema.sql` in your project
   - Copy ALL the contents
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - You should see "Success. No rows returned"

4. **Disable RLS (for application-level auth)**
   - Open `supabase/schema-rls-policies.sql` in your project
   - Copy ALL the contents
   - Paste into the SQL Editor
   - Click "Run"
   - This disables RLS on all tables (needed for application-level authentication)

### Step 2: Verify Connection

Run the database initialization check:

```bash
npm run init-db
```

This will:
- ✅ Test your database connection
- ✅ Check if all tables exist
- ✅ Verify RLS settings
- ✅ Report any missing tables or configuration issues

## What Gets Created

The schema creates:

### Tables
- **users** - User accounts and profiles
- **friends** - Friend relationships and requests
- **groups** - User groups
- **group_members** - Group membership
- **images** - Uploaded images
- **image_group_shares** - Image shares to groups

### Features
- UUID primary keys
- Foreign key constraints
- Indexes for performance
- Automatic `updated_at` triggers
- Row Level Security (RLS) enabled (then disabled for app-level auth)

## Troubleshooting

### Connection Issues

If you get connection errors:

1. **Check Environment Variables**
   ```bash
   npm run check-setup
   ```
   Make sure `DATABASE_URL` or `DATABASE_POOLER_URL` is set correctly.

2. **Test Connection**
   ```bash
   npm run init-db
   ```
   This will show detailed error messages.

3. **Common Issues**
   - **Password authentication failed**: Check your database password in the connection string
   - **Connection timeout**: Verify your DATABASE_URL/DATABASE_POOLER_URL is correct
   - **SSL required**: Supabase requires SSL - the connection string should include `?sslmode=require`

### Missing Tables

If tables don't exist:
1. Make sure you ran `supabase/schema.sql` completely
2. Check for any SQL errors in the Supabase SQL Editor
3. Verify you're connected to the correct database

### RLS Issues

If queries are being blocked:
1. Run `supabase/schema-rls-policies.sql` to disable RLS
2. Or create appropriate RLS policies if using Supabase Auth

## Manual Setup (Alternative)

If you have `psql` installed locally:

```bash
# Using direct connection
psql "$DATABASE_URL" < supabase/schema.sql

# Then disable RLS
psql "$DATABASE_URL" < supabase/schema-rls-policies.sql
```

## Verification

After setup, try:

1. **Check tables exist:**
   ```bash
   npm run init-db
   ```

2. **Test the app:**
   - Start the dev server: `npm run dev`
   - Try to create an account at `/signup`
   - If it works, the database is properly initialized!

## Next Steps

After database initialization:
- ✅ Tables are created
- ✅ RLS is disabled (or policies are set)
- ✅ You can now test account creation
- ✅ Friends, groups, and images features will work

