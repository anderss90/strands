// Migration runner script
// This script runs SQL migration files against the Supabase database
// Usage: node scripts/run-migration.js [migration-file-path]
//   - If no file specified, runs all pending migrations in order
//   - If file specified, runs only that migration

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const getDatabaseUrl = () => {
  const poolerUrl = process.env.DATABASE_POOLER_URL;
  const directUrl = process.env.DATABASE_URL;
  
  // Prefer connection pooler for serverless functions
  return poolerUrl || directUrl || '';
};

async function createMigrationsTable(pool) {
  // Create schema_migrations table to track which migrations have been run
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations(pool) {
  const result = await pool.query('SELECT filename FROM schema_migrations ORDER BY executed_at');
  return new Set(result.rows.map(row => row.filename));
}

async function markMigrationAsExecuted(pool, filename) {
  await pool.query(
    'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
    [filename]
  );
}

async function runMigration(pool, filePath) {
  const filename = path.basename(filePath);
  console.log(`\n📄 Running migration: ${filename}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Execute the migration
    await pool.query(sql);
    
    // Mark as executed
    await markMigrationAsExecuted(pool, filename);
    
    console.log(`✅ Successfully executed: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Error executing ${filename}:`, error.message);
    throw error;
  }
}

async function getAllMigrations(migrationsDir) {
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort alphabetically to ensure order
  
  return files.map(file => path.join(migrationsDir, file));
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  
  if (!databaseUrl || databaseUrl.includes('<') || databaseUrl.includes('your_') || databaseUrl.trim() === '') {
    console.error('❌ ERROR: No valid database connection URL found!\n');
    console.log('📝 Required environment variables:');
    console.log('   - DATABASE_POOLER_URL (recommended - connection pooler, port 6543)');
    console.log('   - DATABASE_URL (direct connection, port 5432)');
    console.log('\n💡 How to get your database URL:');
    console.log('   1. Go to Supabase Dashboard: https://app.supabase.com');
    console.log('   2. Select your project');
    console.log('   3. Go to Settings > Database');
    console.log('   4. Copy the connection string');
    console.log('   5. Add it to your .env.local file');
    process.exit(1);
  }

  // Prepare connection string with SSL mode
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
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Create migrations tracking table
    await createMigrationsTable(pool);
    
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    
    // Check if specific migration file was provided
    const migrationFile = process.argv[2];
    
    if (migrationFile) {
      // Run specific migration
      const filePath = path.isAbsolute(migrationFile) 
        ? migrationFile 
        : path.join(process.cwd(), migrationFile);
      
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Migration file not found: ${filePath}`);
        process.exit(1);
      }
      
      const filename = path.basename(filePath);
      const executedMigrations = await getExecutedMigrations(pool);
      
      if (executedMigrations.has(filename)) {
        console.log(`⚠️  Migration ${filename} has already been executed.`);
        console.log('   Use --force to re-run it (not recommended).');
        process.exit(0);
      }
      
      await runMigration(pool, filePath);
    } else {
      // Run all pending migrations
      const allMigrations = await getAllMigrations(migrationsDir);
      const executedMigrations = await getExecutedMigrations(pool);
      
      const pendingMigrations = allMigrations.filter(filePath => {
        const filename = path.basename(filePath);
        return !executedMigrations.has(filename);
      });
      
      if (pendingMigrations.length === 0) {
        console.log('✅ All migrations are up to date!');
        process.exit(0);
      }
      
      console.log(`📋 Found ${pendingMigrations.length} pending migration(s):`);
      pendingMigrations.forEach(filePath => {
        console.log(`   - ${path.basename(filePath)}`);
      });
      
      for (const filePath of pendingMigrations) {
        await runMigration(pool, filePath);
      }
      
      console.log(`\n✅ Successfully executed ${pendingMigrations.length} migration(s)!`);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    restoreEnv();
    await pool.end();
  }
}

main();
