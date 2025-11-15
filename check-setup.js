// Quick setup checker for environment variables
const fs = require('fs');
const path = require('path');

const requiredEnvVars = {
  'NEXT_PUBLIC_SUPABASE_URL': {
    description: 'Supabase Project URL',
    whereToFind: 'Supabase Dashboard > Settings > API > Project URL',
    example: 'https://xxxxxxxxxxxxx.supabase.co'
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    description: 'Supabase Anonymous/Public Key',
    whereToFind: 'Supabase Dashboard > Settings > API > anon/public key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  'SUPABASE_URL': {
    description: 'Supabase Project URL (same as NEXT_PUBLIC_SUPABASE_URL)',
    whereToFind: 'Supabase Dashboard > Settings > API > Project URL',
    example: 'https://xxxxxxxxxxxxx.supabase.co'
  },
  'SUPABASE_SERVICE_ROLE_KEY': {
    description: 'Supabase Service Role Key (Keep this secret!)',
    whereToFind: 'Supabase Dashboard > Settings > API > service_role key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    warning: '⚠️  KEEP THIS SECRET - Never expose this in client-side code!'
  },
  'DATABASE_URL': {
    description: 'Supabase Database Direct Connection String',
    whereToFind: 'Supabase Dashboard > Settings > Database > Connection string',
    example: 'postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres',
    alternatives: ['POSTGRES_URL', 'POSTGRES_URL_NON_POOLING', 'DATABASE_DIRECT_URL']
  },
  'DATABASE_POOLER_URL': {
    description: 'Supabase Database Connection Pooler URL (port 6543)',
    whereToFind: 'Supabase Dashboard > Settings > Database > Connection pooler (port 6543)',
    example: 'postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:6543/postgres',
    alternatives: ['POSTGRES_PRISMA_URL', 'DATABASE_POOL_URL', 'POSTGRES_URL_POOLER']
  },
  'JWT_SECRET': {
    description: 'JWT Secret Key for token signing',
    whereToFind: 'Generate using: npm run generate-secrets',
    example: '47f94632be6e8e65145b4520bc1a8c079606d21a6f17b926b550f209595d575...'
  },
  'JWT_REFRESH_SECRET': {
    description: 'JWT Refresh Secret Key for refresh tokens',
    whereToFind: 'Generate using: npm run generate-secrets',
    example: '7ef1c6b64b7eef9e7f0dca60649cb8e7e734e98e08a9bd8a2d6d3c856588686...'
  }
};

console.log('🔍 Checking environment setup...\n');

const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ .env.local file not found!');
  console.log('\n📝 To set up:');
  console.log('1. Create a .env.local file in the project root');
  console.log('2. Copy the template from ENV_TEMPLATE.md');
  console.log('3. Fill in your Supabase credentials');
  console.log('\n📖 See SETUP_QUICKSTART.md for detailed instructions\n');
  process.exit(1);
}

// Load env file
let envContent;
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.log(`❌ Error reading .env.local file: ${error.message}`);
  process.exit(1);
}

const envVars = {};

// Handle both Windows and Unix line endings
const lines = envContent.split(/\r?\n/);

lines.forEach((line, index) => {
  // Remove trailing whitespace
  line = line.trim();
  
  // Skip comments and empty lines
  if (line.startsWith('#') || line === '') {
    return;
  }
  
  // Match KEY=VALUE format
  // Supports: KEY=value, KEY="value", KEY='value', KEY= value (with spaces)
  const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Remove inline comments (value # comment)
    const commentIndex = value.indexOf(' #');
    if (commentIndex !== -1) {
      value = value.substring(0, commentIndex).trim();
    }
    
    envVars[key] = value;
  } else {
    // Debug: log lines that don't match
    if (line && !line.startsWith('#')) {
      console.log(`⚠️  Warning: Could not parse line ${index + 1}: ${line.substring(0, 50)}...`);
    }
  }
});

// Check if file looks like markdown (contains markdown syntax)
const looksLikeMarkdown = envContent.includes('```') || envContent.includes('##') || envContent.includes('**');

if (looksLikeMarkdown) {
  console.log('⚠️  WARNING: Your .env.local file contains markdown formatting!');
  console.log('   This usually means you copied the ENV_TEMPLATE.md file content.');
  console.log('   .env.local should only contain KEY=VALUE pairs, not markdown.\n');
}

// Debug: Show what was parsed
console.log(`📋 Found ${Object.keys(envVars).length} environment variable(s) in .env.local:`);
if (Object.keys(envVars).length > 0) {
  Object.keys(envVars).sort().forEach(key => {
    const value = envVars[key];
    const displayValue = value.length > 40 ? value.substring(0, 40) + '...' : value;
    console.log(`   ✓ ${key} = ${displayValue}`);
  });
} else {
  console.log('   (none found)');
}
console.log('');

let missing = [];
let empty = [];
let issues = [];
let foundAlternatives = [];

Object.entries(requiredEnvVars).forEach(([varName, info]) => {
  // Check if the exact variable name exists
  if (varName in envVars) {
    if (!envVars[varName] || envVars[varName].includes('your_') || envVars[varName] === '') {
      empty.push({ name: varName, info });
    }
    return; // Variable found and has a value
  }
  
  // Check for alternative names
  if (info.alternatives) {
    const foundAlt = info.alternatives.find(alt => alt in envVars && envVars[alt] && !envVars[alt].includes('your_') && envVars[alt] !== '');
    if (foundAlt) {
      foundAlternatives.push({
        required: varName,
        found: foundAlt,
        value: envVars[foundAlt],
        info
      });
      return; // Alternative found
    }
  }
  
  // Variable is missing
  missing.push({ name: varName, info });
});

if (foundAlternatives.length > 0) {
  console.log('ℹ️  FOUND ALTERNATIVE VARIABLE NAMES:\n');
  foundAlternatives.forEach(({ required, found, value, info }) => {
    console.log(`   Required: ${required}`);
    console.log(`   Found: ${found}`);
    console.log(`   Value: ${value.substring(0, 60)}...`);
    console.log(`   → Add this line to .env.local: ${required}=${value}`);
    if (info.whereToFind) {
      console.log(`   (Or find at: ${info.whereToFind})`);
    }
    console.log('');
  });
}

if (missing.length > 0) {
  console.log('❌ MISSING ENVIRONMENT VARIABLES:\n');
  missing.forEach(({ name, info }) => {
    console.log(`   ${name}`);
    console.log(`   Description: ${info.description}`);
    console.log(`   Where to find: ${info.whereToFind}`);
    if (info.alternatives && info.alternatives.length > 0) {
      const foundAlts = info.alternatives.filter(alt => alt in envVars);
      if (foundAlts.length > 0) {
        console.log(`   Alternative names found: ${foundAlts.join(', ')}`);
        foundAlts.forEach(alt => {
          console.log(`      → You can use: ${name}=${envVars[alt]}`);
        });
      }
    }
    if (info.example) {
      console.log(`   Example: ${info.example.substring(0, 60)}...`);
    }
    if (info.warning) {
      console.log(`   ${info.warning}`);
    }
    console.log('');
  });
  issues.push(`${missing.length} missing variable(s)`);
}

if (empty.length > 0) {
  console.log('⚠️  ENVIRONMENT VARIABLES WITH PLACEHOLDER OR EMPTY VALUES:\n');
  empty.forEach(({ name, info }) => {
    console.log(`   ${name}`);
    console.log(`   Description: ${info.description}`);
    console.log(`   Where to find: ${info.whereToFind}`);
    if (info.example) {
      console.log(`   Example: ${info.example.substring(0, 60)}...`);
    }
    if (info.warning) {
      console.log(`   ${info.warning}`);
    }
    console.log('');
  });
  issues.push(`${empty.length} variable(s) with placeholder/empty values`);
}

if (missing.length === 0 && empty.length === 0) {
  console.log('✅ All required environment variables are set!');
  console.log('\n🚀 Next steps:');
  console.log('1. Make sure your Supabase database schema is set up');
  console.log('2. Run the schema.sql file in Supabase SQL Editor');
  console.log('3. Restart your dev server: npm run dev');
  console.log('4. The server should be ready at http://localhost:3000');
  console.log('\n📖 See SETUP_QUICKSTART.md for database setup instructions\n');
} else {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`❌ SETUP INCOMPLETE: ${issues.join(', ')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📝 QUICK FIX GUIDE:');
  console.log('1. Open your .env.local file');
  console.log('2. Add the missing variables listed above');
  console.log('3. Replace placeholder values with your actual credentials');
  console.log('4. For JWT secrets, run: npm run generate-secrets');
  console.log('\n📖 See SETUP_QUICKSTART.md for detailed step-by-step instructions');
  console.log('📖 See ENV_TEMPLATE.md for the complete template\n');
  process.exit(1);
}

