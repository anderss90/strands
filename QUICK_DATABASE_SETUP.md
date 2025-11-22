# Quick Database Setup Guide

## Step 1: Get Your Database Connection URLs

1. **Go to Supabase Dashboard**
   - Visit [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Get Connection Strings**
   - Go to **Settings** → **Database**
   - Scroll down to **Connection string**
   - Copy the **Connection string** (port 5432) - this is for `DATABASE_URL`
   - Copy the **Connection pooler** (port 6543) - this is for `DATABASE_POOLER_URL`
   - ⚠️ **Important**: Make sure to replace `[YOUR-PASSWORD]` with your actual database password!

3. **Add to .env.local**
   ```env
   DATABASE_URL=postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:5432/postgres
   DATABASE_POOLER_URL=postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres
   ```

## Step 2: Run the Database Schema

1. **Open SQL Editor**
   - In Supabase Dashboard, click **SQL Editor** in the left sidebar
   - Click **New query**

2. **Run schema.sql**
   - Open `supabase/schema.sql` from your project
   - Copy ALL the contents (Ctrl+A, Ctrl+C)
   - Paste into the SQL Editor (Ctrl+V)
   - Click **Run** (or press Ctrl+Enter)
   - ✅ You should see "Success. No rows returned"

3. **Disable RLS (Required for app-level auth)**
   - Open `supabase/schema-rls-policies.sql` from your project
   - Copy ALL the contents
   - Paste into the SQL Editor
   - Click **Run**
   - ✅ This disables Row Level Security on all tables

## Step 3: Verify Setup

Run the database check:

```bash
npm run init-db
```

You should see:
- ✅ Database connection successful!
- ✅ All required tables exist!

## Troubleshooting

### Can't find Connection Strings?
- Make sure you're in **Settings** → **Database**
- Look for **Connection string** section
- You might need to click "Show connection string" or similar

### Password not working?
- The password shown in the connection string is a placeholder `[YOUR-PASSWORD]`
- Replace it with your actual database password
- Find your password in: **Settings** → **Database** → **Database password**

### Tables already exist?
- If you see errors about tables already existing, that's okay
- The schema uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times

### RLS blocking queries?
- Make sure you ran `schema-rls-policies.sql` to disable RLS
- Or create RLS policies that allow service_role access

## Next Steps

After completing these steps:
1. ✅ Database connection is configured
2. ✅ All tables are created
3. ✅ RLS is disabled for application-level auth
4. ✅ You can now test account creation!

Try creating an account at `/signup` - it should work now!

