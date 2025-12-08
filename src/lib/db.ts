import { Pool } from 'pg';
import { getDatabaseUrl } from './supabase';

let pool: Pool | null = null;

export const getDbPool = (): Pool => {
  if (!pool) {
    const databaseUrl = getDatabaseUrl();
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL or DATABASE_POOLER_URL must be set');
    }

    // Ensure connection string has SSL parameters if not present
    let connectionString = databaseUrl;
    if (!connectionString.includes('sslmode=')) {
      const separator = connectionString.includes('?') ? '&' : '?';
      connectionString = `${connectionString}${separator}sslmode=require`;
    }

    // For Supabase, we need to handle self-signed certificates
    // Set NODE_TLS_REJECT_UNAUTHORIZED for this process
    if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    pool = new Pool({
      connectionString: connectionString,
      // Supabase requires SSL but uses self-signed certificates
      ssl: true,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  return pool;
};

// Query helper function
export const query = async (text: string, params?: any[]) => {
  const pool = getDbPool();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Database query error', error);
    throw error;
  }
};

