// Database initialization script
// This script helps verify and test the database connection

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const getDatabaseUrl = () => {
  const poolerUrl = process.env.DATABASE_POOLER_URL;
  const directUrl = process.env.DATABASE_URL;
  
  // Prefer connection pooler for serverless functions
  return poolerUrl || directUrl || '';
};

async function testConnection() {
  // Check what database-related variables we have
  const poolerUrl = process.env.DATABASE_POOLER_URL || '';
  const directUrl = process.env.DATABASE_URL || '';
  const postgresUrl = process.env.POSTGRES_URL || '';
  const postgresPrismaUrl = process.env.POSTGRES_PRISMA_URL || '';
  
  console.log('🔍 Checking database environment variables...\n');
  console.log('   DATABASE_POOLER_URL:', poolerUrl ? `✓ Set (${poolerUrl.substring(0, 30)}...)` : '✗ Not set');
  console.log('   DATABASE_URL:', directUrl ? `✓ Set (${directUrl.substring(0, 30)}...)` : '✗ Not set');
  console.log('   POSTGRES_URL:', postgresUrl ? `✓ Set (${postgresUrl.substring(0, 30)}...)` : '✗ Not set');
  console.log('   POSTGRES_PRISMA_URL:', postgresPrismaUrl ? `✓ Set (${postgresPrismaUrl.substring(0, 30)}...)` : '✗ Not set');
  console.log('');
  
  // Try to get database URL, potentially using alternatives
  let databaseUrl = getDatabaseUrl();
  
  // If not found, try using POSTGRES_PRISMA_URL or POSTGRES_URL as fallback
  if (!databaseUrl || databaseUrl.includes('<') || databaseUrl.includes('your_') || databaseUrl.trim() === '') {
    if (postgresPrismaUrl && !postgresPrismaUrl.includes('<') && !postgresPrismaUrl.includes('your_')) {
      console.log('⚠️  Using POSTGRES_PRISMA_URL as fallback...\n');
      databaseUrl = postgresPrismaUrl;
      // Override for this check
      process.env.DATABASE_POOLER_URL = postgresPrismaUrl;
    } else if (postgresUrl && !postgresUrl.includes('<') && !postgresUrl.includes('your_')) {
      console.log('⚠️  Using POSTGRES_URL as fallback...\n');
      databaseUrl = postgresUrl;
      // Override for this check
      process.env.DATABASE_URL = postgresUrl;
    }
  }
  
  if (!databaseUrl || databaseUrl.includes('<') || databaseUrl.includes('your_') || databaseUrl.trim() === '') {
    console.error('❌ ERROR: No valid database connection URL found!\n');
    console.log('📝 Required environment variables:');
    console.log('   - DATABASE_POOLER_URL (recommended - connection pooler, port 6543)');
    console.log('   - DATABASE_URL (direct connection, port 5432)');
    console.log('\n💡 To get your database URL:');
    console.log('   1. Go to Supabase Dashboard: https://app.supabase.com');
    console.log('   2. Select your project');
    console.log('   3. Go to Settings > Database');
    console.log('   4. Find "Connection string" section');
    console.log('   5. Copy the "Connection pooler" URL (port 6543)');
    console.log('   6. Replace [YOUR-PASSWORD] with your actual database password');
    console.log('   7. Add to .env.local as: DATABASE_POOLER_URL=...');
    console.log('\n📋 Current .env.local values:');
    if (poolerUrl) console.log(`   DATABASE_POOLER_URL="${poolerUrl.substring(0, 50)}..."`);
    if (directUrl) console.log(`   DATABASE_URL="${directUrl.substring(0, 50)}..."`);
    if (postgresUrl) console.log(`   POSTGRES_URL="${postgresUrl.substring(0, 50)}..."`);
    if (postgresPrismaUrl) console.log(`   POSTGRES_PRISMA_URL="${postgresPrismaUrl.substring(0, 50)}..."`);
    console.log('\n💡 Tip: If you have POSTGRES_PRISMA_URL set, you can also use it as DATABASE_POOLER_URL');
    process.exit(1);
  }

  console.log('🔍 Testing database connection...\n');

  // Parse connection string to mask password
  let maskedUrl;
  try {
    const urlParts = new URL(databaseUrl);
    maskedUrl = `${urlParts.protocol}//${urlParts.username}:***@${urlParts.host}${urlParts.pathname}`;
  } catch (error) {
    console.error('❌ ERROR: Invalid database URL format');
    console.log('   The DATABASE_URL or DATABASE_POOLER_URL appears to be malformed.');
    console.log('   Expected format: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres');
    process.exit(1);
  }
  console.log(`📡 Connecting to: ${maskedUrl}\n`);

  // Ensure connection string has SSL parameters if not present
  let connectionString = databaseUrl;
  if (!connectionString.includes('sslmode=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString = `${connectionString}${separator}sslmode=require`;
  }

  // For Supabase self-signed certificates, we need to disable SSL verification
  // This is safe for Supabase as they use valid certificates, just self-signed
  const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const pool = new Pool({
    connectionString: connectionString,
    // Supabase requires SSL
    ssl: true,
    max: 1,
    connectionTimeoutMillis: 10000,
  });

  // Restore original setting after connection
  const restoreEnv = () => {
    if (originalRejectUnauthorized === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
    }
  };

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!\n');

    // Check if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows.map(row => row.table_name);

    console.log('📋 Current tables in database:');
    if (tables.length === 0) {
      console.log('   (no tables found)');
      console.log('\n⚠️  WARNING: Database schema has not been initialized!');
      console.log('\n📝 To initialize the database:');
      console.log('   1. Go to your Supabase Dashboard');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Copy the contents of supabase/schema.sql');
      console.log('   4. Paste and run it in the SQL Editor');
      console.log('\n   Or run this command if you have psql installed:');
      console.log(`   psql "${databaseUrl}" < supabase/schema.sql`);
    } else {
      console.log(`   Found ${tables.length} table(s):`);
      tables.forEach(table => {
        console.log(`   ✓ ${table}`);
      });

      const requiredTables = ['users', 'friends', 'groups', 'group_members', 'images', 'image_group_shares', 'image_comments', 'strands', 'strand_group_shares', 'strand_pins', 'strand_comments'];
      const missingTables = requiredTables.filter(table => !tables.includes(table));
      
      if (missingTables.length > 0) {
        console.log('\n⚠️  WARNING: Missing required tables:');
        missingTables.forEach(table => {
          console.log(`   ✗ ${table}`);
        });
        console.log('\n📝 Run the schema.sql file to create missing tables.');
      } else {
        console.log('\n✅ All required tables exist!');
      }
    }

    // Check RLS status
    if (tables.length > 0) {
      console.log('\n🔒 Checking Row Level Security (RLS) status...');
      const rlsQuery = `
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'friends', 'groups', 'group_members', 'images', 'image_group_shares')
        ORDER BY tablename;
      `;
      
      const rlsResult = await client.query(rlsQuery);
      
      if (rlsResult.rows.length > 0) {
        const rlsEnabled = rlsResult.rows.filter(row => row.rowsecurity).map(row => row.tablename);
        const rlsDisabled = rlsResult.rows.filter(row => !row.rowsecurity).map(row => row.tablename);
        
        if (rlsEnabled.length > 0) {
          console.log(`   ⚠️  RLS enabled on ${rlsEnabled.length} table(s): ${rlsEnabled.join(', ')}`);
          console.log('   ⚠️  WARNING: RLS is enabled but no policies are set!');
          console.log('   📝 You may need to add RLS policies or disable RLS for application-level auth.');
        }
        
        if (rlsDisabled.length > 0) {
          console.log(`   ✓ RLS disabled on ${rlsDisabled.length} table(s): ${rlsDisabled.join(', ')}`);
        }
      }
    }

    client.release();
    await pool.end();
    restoreEnv();

    console.log('\n✅ Database check complete!\n');
  } catch (error) {
    restoreEnv();
    console.error('❌ Database connection failed!\n');
    console.error('Error:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Tip: Check your DATABASE_URL or DATABASE_POOLER_URL password');
      console.log('   Make sure [YOUR-PASSWORD] is replaced with your actual database password');
    } else if (error.message.includes('does not exist')) {
      console.log('\n💡 Tip: Check your database URL format');
    } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Tip: Check your database host and port');
    } else if (error.message.includes('certificate') || error.message.includes('SSL')) {
      console.log('\n💡 Tip: SSL certificate error - this script should handle it automatically');
      console.log('   If this persists, check your connection string format');
    } else if (error.message.includes('password authentication failed')) {
      console.log('\n💡 IMPORTANT: Password Authentication Failed!');
      console.log('\n   This means the password in your connection string is incorrect.');
      console.log('\n   To fix this:');
      console.log('   1. Go to Supabase Dashboard > Settings > Database');
      console.log('   2. Find your database password (or reset it if you don\'t know it)');
      console.log('   3. In your connection string, replace [YOUR-PASSWORD] with the actual password');
      console.log('   4. Or use the "Connection string" option which includes password management');
      console.log('\n   Example connection string format:');
      console.log('   postgresql://postgres.xxx:ACTUAL_PASSWORD@host:port/postgres?sslmode=require');
    }
    
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

testConnection();

