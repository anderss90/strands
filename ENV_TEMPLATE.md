# Environment Variables Template

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=your_supabase_database_direct_connection_url
DATABASE_POOLER_URL=your_supabase_connection_pooler_url

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key

# Storage Configuration
SUPABASE_STORAGE_BUCKET=images

# Application URL
NEXTAUTH_URL=http://localhost:3000
```

## Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select an existing one
3. Go to Settings > API to get:
   - Project URL (NEXT_PUBLIC_SUPABASE_URL)
   - anon/public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_ROLE_KEY) - Keep this secret!
4. Go to Settings > Database to get:
   - Connection string (DATABASE_URL)
   - Connection pooler URL (DATABASE_POOLER_URL) - Use port 6543 for transaction mode

## Security Notes

- Never commit `.env.local` to version control
- The service_role key should only be used server-side
- Use the connection pooler URL for serverless functions (port 6543)
- Use the direct connection URL for migrations and admin tasks

