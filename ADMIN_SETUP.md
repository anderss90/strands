# Admin Account Setup

This guide explains how to create and manage admin accounts that can view all groups and all image uploads.

## What Admin Accounts Can Do

Admin accounts have special privileges:
- ✅ View **all groups** in the system (not just groups they're members of)
- ✅ View **all images** uploaded by any user (not just images from their groups)
- ✅ Access any group's details and images
- ✅ Access any image's details and comments
- ✅ Bypass group membership checks for viewing content

## Setting Up an Admin Account

### Step 1: Run the Database Migration

First, add the `is_admin` column to your database:

1. Go to **Supabase Dashboard → SQL Editor**
2. Open the migration file: `supabase/migrations/002_add_admin_to_users.sql`
3. Copy and paste the contents into SQL Editor
4. Click **Run**

This will add the `is_admin` column to the users table.

### Step 2: Create or Find a User

You need to have a user account first. If you don't have one:
1. Sign up through the app at `/signup`
2. Or create one manually in the database

### Step 3: Set User as Admin

Use the provided script to set a user as admin:

```bash
npm run set-admin <username_or_email>
```

Example:
```bash
npm run set-admin admin
```

or

```bash
npm run set-admin admin@example.com
```

The script will:
1. Find the user by username or email
2. Show you the user's current admin status
3. Ask for confirmation
4. Update the `is_admin` flag in the database

### Step 4: Log In

The user needs to **log out and log back in** for the admin status to take effect, because admin status is fetched when the JWT token is verified.

## Manual Database Setup (Alternative)

If you prefer to set admin status directly in the database:

1. Go to **Supabase Dashboard → SQL Editor**
2. Run this query:

```sql
-- Set a user as admin by username
UPDATE users 
SET is_admin = true 
WHERE username = 'your_username_here';

-- Or by email
UPDATE users 
SET is_admin = true 
WHERE email = 'your_email@example.com';
```

3. To verify:
```sql
SELECT username, email, is_admin 
FROM users 
WHERE is_admin = true;
```

## Removing Admin Status

To remove admin status from a user:

```bash
npm run set-admin <username_or_email>
```

If the user is already an admin, the script will ask if you want to remove admin status.

Or manually in SQL:

```sql
UPDATE users 
SET is_admin = false 
WHERE username = 'username_here';
```

## Verifying Admin Status

### In the Database:
```sql
SELECT id, username, email, is_admin 
FROM users 
WHERE is_admin = true;
```

### In the Application:
Once logged in as an admin:
- You should see **all groups** in the groups list (not just your groups)
- You should see **all images** in the home feed (not just images from your groups)
- You can access any group's details page
- You can view any image, even if you're not in its shared groups

## Security Notes

⚠️ **Important Security Considerations:**

1. **Admin accounts have full visibility** - They can see all content in the system
2. **Use admin accounts carefully** - Only grant admin status to trusted users
3. **Admin status is checked on every API request** - The middleware fetches admin status from the database
4. **Token refresh required** - Users must log out and back in for admin status to activate after it's granted
5. **Database-level check** - Admin status is verified at the database level, not just in the JWT token

## Troubleshooting

### Admin status not working?

1. **Check the migration ran successfully**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'is_admin';
   ```

2. **Verify user is marked as admin**
   ```sql
   SELECT username, is_admin FROM users WHERE username = 'your_username';
   ```

3. **User must log out and log back in** - Admin status is checked when authenticating requests

4. **Check API routes** - Admin status is checked in:
   - `GET /api/groups` - Returns all groups if admin
   - `GET /api/images/feed` - Returns all images if admin
   - `GET /api/groups/[id]` - Bypasses membership check if admin
   - `GET /api/images/[id]` - Bypasses access check if admin
   - `GET /api/images/group/[groupId]` - Bypasses membership check if admin
   - `GET/POST /api/images/[id]/comments` - Bypasses access check if admin

## Technical Details

- Admin status is stored in the `users.is_admin` column (BOOLEAN, default false)
- Admin status is fetched from the database in `src/lib/middleware.ts` during authentication
- The `isAdmin` property is added to the authenticated user object for all API routes
- API routes check `authUser.isAdmin` to bypass membership/access checks

