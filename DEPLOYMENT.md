# Deployment Guide - Vercel

This guide will help you deploy the Strands app to Vercel.

## Prerequisites

1. **GitHub Repository**: Ensure your code is pushed to a GitHub repository
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) if you don't have one
3. **Supabase Project**: Make sure your Supabase project is set up and running

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js framework

### 2. Configure Environment Variables

Before deploying, you must add all required environment variables in the Vercel dashboard:

#### In Vercel Project Settings → Environment Variables, add:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration (use connection pooler for serverless)
DATABASE_URL=your_supabase_database_direct_connection_url
DATABASE_POOLER_URL=your_supabase_connection_pooler_url

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_min_32_chars

# Storage Configuration
SUPABASE_STORAGE_BUCKET=images

# Application URL (update after first deployment)
NEXTAUTH_URL=https://your-app.vercel.app
```

#### Getting Supabase Credentials:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. **Settings → API**:
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - Copy **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)
4. **Settings → Database**:
   - Copy **Connection string** (direct) → `DATABASE_URL`
   - Copy **Connection pooler** (port 6543) → `DATABASE_POOLER_URL` ⭐ **Use this for serverless**

#### Generating JWT Secrets:

You can generate secure JWT secrets using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Run this twice to generate both `JWT_SECRET` and `JWT_REFRESH_SECRET`.

### 3. Configure Build Settings

Vercel will automatically detect Next.js and use the correct build command. The build process will:
1. Run tests (`npm run test`)
2. Build the Next.js app (`next build`)

If tests fail, the deployment will be cancelled.

### 4. Deploy

1. After adding environment variables, click **"Deploy"**
2. Vercel will:
   - Install dependencies
   - Run tests
   - Build the application
   - Deploy to a production URL

### 5. Update Application URL

After the first deployment:

1. Copy your Vercel deployment URL (e.g., `https://strands.vercel.app`)
2. Go to **Vercel Project Settings → Environment Variables**
3. Update `NEXTAUTH_URL` with your actual deployment URL
4. Redeploy (this will happen automatically if you've set up Git integration)

## Post-Deployment

### Verify Deployment

1. Check that your app loads at the Vercel URL
2. Test user signup/login
3. Verify database connections work
4. Test image uploads (Supabase Storage)

### Enable Automatic Deployments

With Git integration enabled:
- **Production**: Deployments from `main` or `master` branch
- **Preview**: Deployments from pull requests and other branches

### Custom Domain (Optional)

1. Go to **Project Settings → Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Troubleshooting

### Build Failures

**Tests failing:**
- Check that all environment variables are set correctly
- Review test output in Vercel build logs
- Run tests locally: `npm test`

**Build errors:**
- Check Next.js build logs in Vercel
- Verify all dependencies are in `package.json`
- Ensure TypeScript compiles: `npm run build`

### Runtime Errors

**Database connection issues:**
- Verify `DATABASE_POOLER_URL` is set (use port 6543 for serverless)
- Check Supabase project is active
- Ensure database schema is initialized

**Authentication errors:**
- Verify all Supabase keys are correct
- Check JWT secrets are set
- Ensure `NEXTAUTH_URL` matches your deployment URL

**Storage errors:**
- Verify `SUPABASE_STORAGE_BUCKET` matches your Supabase bucket name
- Check Supabase Storage is enabled
- Verify RLS policies are set correctly

### Environment Variable Issues

- **Missing variables**: Check Vercel build logs for specific missing variable errors
- **Wrong values**: Double-check all Supabase credentials
- **Public vs Private**: `NEXT_PUBLIC_*` variables are exposed to client, others are server-only

## Database Setup

Before deploying, ensure your Supabase database schema is initialized:

1. Go to **Supabase Dashboard → SQL Editor**
2. Run the schema from `supabase/schema.sql`
3. Run RLS policies from `supabase/schema-rls-policies.sql`

### Running Database Migrations

If you've added new tables or changes to the schema:

1. Go to **Supabase Dashboard → SQL Editor**
2. Check if there are any migration files in `supabase/migrations/` folder
3. Run any pending migrations in order (they are numbered)
4. For example, if you see `001_add_image_comments.sql`, copy its contents and run it in SQL Editor

**Important**: Always run migrations after deploying code changes that require new database tables or columns.

## Performance Optimization

### Connection Pooling

- **Use `DATABASE_POOLER_URL`** for all serverless functions (recommended)
- Port 6543 is optimized for serverless/serverless edge functions
- Port 5432 is for direct connections (use sparingly)

### Build Optimization

The current build process runs tests before building. To speed up deployments:
- Consider moving tests to CI/CD pipeline
- Or create a separate `build:vercel` script that skips tests (not recommended)

## Security Best Practices

1. ✅ Never commit `.env.local` files
2. ✅ Use Supabase connection pooler for serverless
3. ✅ Keep `SUPABASE_SERVICE_ROLE_KEY` secret (server-only)
4. ✅ Use strong JWT secrets (32+ characters)
5. ✅ Enable Supabase RLS policies
6. ✅ Review Vercel environment variable access settings

## Monitoring

- **Vercel Dashboard**: Monitor deployments, logs, and analytics
- **Supabase Dashboard**: Monitor database usage and performance
- **Error Tracking**: Consider adding Sentry or similar for production error tracking

## Rollback

If a deployment fails:

1. Go to **Vercel Dashboard → Deployments**
2. Find the last successful deployment
3. Click **"..."** → **"Promote to Production"**

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)

