# Database Schema Changes Checklist

⚠️ **IMPORTANT REMINDER**: Whenever you modify the database schema, follow these steps!

## Quick Checklist

When making database schema changes:

- [ ] Create a migration file in `supabase/migrations/` (numbered sequentially, e.g., `001_`, `002_`, etc.)
- [ ] Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` for safety
- [ ] Run the migration in **Supabase Dashboard → SQL Editor**
- [ ] Update `scripts/init-database.js` if adding new tables (add to `requiredTables` array)
- [ ] Verify locally with `npm run init-db` (optional but recommended)
- [ ] Commit the migration file and push to Git

## Detailed Steps

### Step 1: Create Migration File

Create a new file in `supabase/migrations/` with a descriptive name:
- Format: `XXX_description.sql` (e.g., `001_add_image_comments.sql`, `002_add_user_settings.sql`)
- Number them sequentially

### Step 2: Write Migration SQL

Include:
- `CREATE TABLE IF NOT EXISTS` statements
- `CREATE INDEX IF NOT EXISTS` statements
- `ALTER TABLE` statements if modifying existing tables
- Comments explaining what the migration does

Example:
```sql
-- Migration: Add image_comments table
CREATE TABLE IF NOT EXISTS image_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_comments_image_id ON image_comments(image_id);
```

### Step 3: Run in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New query**
5. Copy the entire contents of your migration file
6. Paste into SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Verify: Should see "Success. No rows returned"

### Step 4: Update init-database.js

If adding a new table, edit `scripts/init-database.js`:

```javascript
const requiredTables = [
  'users', 
  'friends', 
  'groups', 
  'group_members', 
  'images', 
  'image_group_shares',
  'image_comments'  // ← Add your new table here
];
```

### Step 5: Verify (Optional)

Run the database check script:
```bash
npm run init-db
```

You should see your new table listed.

### Step 6: Commit and Push

```bash
git add supabase/migrations/XXX_your_migration.sql
git add scripts/init-database.js  # if you updated it
git commit -m "Add database migration for [description]"
git push
```

## Common Mistakes to Avoid

❌ **Don't** just modify `schema.sql` without creating a migration
❌ **Don't** forget to run the migration in Supabase
❌ **Don't** commit code changes that require new tables without running migrations first
❌ **Don't** use `CREATE TABLE` without `IF NOT EXISTS` (prevents errors if run twice)

✅ **Do** always create migration files
✅ **Do** use `IF NOT EXISTS` clauses
✅ **Do** test migrations locally if possible
✅ **Do** run migrations before deploying code that uses new tables

## What Happens If You Forget?

If you forget to run a migration, you'll see errors like:
```
error: relation "table_name" does not exist
error: column "column_name" does not exist
```

**To fix**: Run the migration in Supabase Dashboard → SQL Editor immediately.

## Migration File Naming

- Use numbers: `001_`, `002_`, `003_`, etc.
- Use descriptive names: `add_image_comments`, `add_user_preferences`, `modify_users_add_email_verification`
- Keep them in chronological order

Example sequence:
- `001_add_image_comments.sql`
- `002_add_user_preferences.sql`
- `003_modify_images_add_alt_text.sql`

