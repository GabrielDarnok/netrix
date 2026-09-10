import { Pool } from 'pg';

const globalForPg = global as unknown as { pgPool: Pool };

if (!process.env.DB_HOST || !process.env.DB_PASS) {
  console.warn(
    '⚠️  Database credentials missing. Copy .env.example to .env.local and fill in the values.'
  );
}

export const pool =
  globalForPg.pgPool ||
  new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'flowdb',
    user: process.env.DB_USER || 'pmacct',
    password: process.env.DB_PASS,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool;
