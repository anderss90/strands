# Quick Start Guide - Testing Account Creation

## Prerequisites

Before you can test account creation, you need to:

1. **Create a Supabase Project**
   - Go to https://app.supabase.com
   - Click "New Project"
   - Fill in project details and wait for provisioning (~2 minutes)

2. **Set Up Database Schema**
   - In Supabase Dashboard, go to SQL Editor
   - Copy and paste the contents of `supabase/schema.sql`
   - Click "Run" to execute the schema

3. **Get Your Credentials**
   - Go to Settings > API
   - Copy your Project URL (NEXT_PUBLIC_SUPABASE_URL)
   - Copy your anon/public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Copy your service_role key (SUPABASE_SERVICE_ROLE_KEY) - Keep this secret!
   - Go to Settings > Database
   - Copy your Connection string (DATABASE_URL)
   - Copy your Connection pooler URL (DATABASE_POOLER_URL) - Use port 6543

4. **Create Environment File**
   - Create a `.env.local` file in the project root
   - Add the following (replace with your actual values):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=your_supabase_database_direct_connection_url
DATABASE_POOLER_URL=your_supabase_connection_pooler_url

# JWT Configuration (generate random strings)
JWT_SECRET=your_random_jwt_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_random_jwt_refresh_secret_key_min_32_chars

# Storage Configuration
SUPABASE_STORAGE_BUCKET=images

# Application URL
NEXTAUTH_URL=http://localhost:3000
```

5. **Generate JWT Secrets**
   - You can use any random string generator
   - Or run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` twice
   - Make sure each secret is at least 32 characters long

6. **Restart the Dev Server**
   - Stop the current server (Ctrl+C)
   - Run `npm run dev` again
   - The server will be available at http://localhost:3000

## Testing Account Creation

Once everything is set up:

1. Open http://localhost:3000 in your browser
2. You should be redirected to the login page
3. Click "Sign up" or go to /signup
4. Fill in the registration form:
   - Email: your-email@example.com
   - Username: your-username
   - Display Name: Your Display Name
   - Password: your-password (min 8 characters)
5. Click "Sign Up"
6. If successful, you'll be logged in and redirected to the home page

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify all dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run build`

### Database connection errors
- Verify your DATABASE_URL and DATABASE_POOLER_URL are correct
- Check if your Supabase project is active
- Verify the schema has been run successfully

### Authentication errors
- Verify JWT_SECRET and JWT_REFRESH_SECRET are set
- Check if SUPABASE_SERVICE_ROLE_KEY is correct
- Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set

### Account creation fails
- Check the browser console for errors
- Check the server logs for detailed error messages
- Verify the users table exists in your Supabase database
- Check if email/username already exists

## Next Steps

After successfully creating an account:
- Test the login functionality
- Test the friend system
- Test the profile page
- Set up image storage (Supabase Storage bucket)

