// Generate secure JWT secrets using crypto
const crypto = require('crypto');

console.log('🔐 Generating secure JWT secrets...\n');

// Generate random secrets (64 bytes = 128 hex characters, which is very secure)
const jwtSecret = crypto.randomBytes(64).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');

console.log('✅ Generated JWT secrets:\n');
console.log('JWT_SECRET=' + jwtSecret);
console.log('JWT_REFRESH_SECRET=' + jwtRefreshSecret);
console.log('\n📝 Add these to your .env.local file');
console.log('⚠️  Keep these secrets secure and never commit them to git!\n');

