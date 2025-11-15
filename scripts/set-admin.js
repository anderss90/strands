/**
 * Script to set a user as admin
 * Usage: node scripts/set-admin.js <username|email>
 * 
 * Environment variables required:
 * - DATABASE_URL or DATABASE_POOLER_URL
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const readline = require('readline');

const databaseUrl = process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL or DATABASE_POOLER_URL environment variable is required');
  console.error('   Make sure .env.local file exists with the database connection string');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('pooler.supabase.com') || databaseUrl.includes('supabase.co') 
    ? { rejectUnauthorized: false } 
    : false,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setAdmin() {
  try {
    const identifier = process.argv[2];

    if (!identifier) {
      console.log('Usage: node scripts/set-admin.js <username|email>');
      process.exit(1);
    }

    console.log(`\n🔍 Looking up user: ${identifier}\n`);

    // Try to find user by username or email
    const userResult = await pool.query(
      `SELECT id, username, email, display_name, is_admin 
       FROM users 
       WHERE username = $1 OR email = $1`,
      [identifier]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ Error: User not found: ${identifier}`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log('Found user:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Display Name: ${user.display_name}`);
    console.log(`  Current Admin Status: ${user.is_admin ? '✅ Admin' : '❌ Not Admin'}`);

    if (user.is_admin) {
      console.log('\n⚠️  User is already an admin!');
      const confirm = await question('\nDo you want to remove admin status? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes') {
        console.log('Operation cancelled.');
        process.exit(0);
      }

      // Remove admin status
      await pool.query(
        'UPDATE users SET is_admin = false WHERE id = $1',
        [user.id]
      );
      console.log('\n✅ Admin status removed successfully!');
    } else {
      const confirm = await question('\nDo you want to make this user an admin? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes') {
        console.log('Operation cancelled.');
        process.exit(0);
      }

      // Set admin status
      await pool.query(
        'UPDATE users SET is_admin = true WHERE id = $1',
        [user.id]
      );
      console.log('\n✅ User is now an admin!');
      console.log('\n📝 Note: The user will need to log out and log back in for changes to take effect.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Check that your DATABASE_URL is correct and the database is accessible');
    }
    process.exit(1);
  } finally {
    await pool.end();
    rl.close();
  }
}

setAdmin();

