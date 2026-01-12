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

# Push Notifications (VAPID Keys)
# Generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Application URL
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Service (Resend)
# Get your API key from https://resend.com/api-keys
RESEND_API_KEY=re_your_resend_api_key
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

## Getting Resend API Key

1. Go to [Resend Dashboard](https://resend.com)
2. Sign up or log in to your account
3. Go to API Keys section
4. Create a new API key
5. Copy the API key and add it to `RESEND_API_KEY` in your `.env.local` file
6. Note: You'll need to verify a domain in Resend to send emails from a custom domain. For testing, you can use the default Resend domain.

## Security Notes

- Never commit `.env.local` to version control
- The service_role key should only be used server-side
- Use the connection pooler URL for serverless functions (port 6543)
- Use the direct connection URL for migrations and admin tasks
- Keep your Resend API key secret and never expose it in client-side code

