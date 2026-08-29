import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads in development
declare global {
  var _postgresPool: Pool | undefined;
}

/**
 * Creates or returns an active PostgreSQL connection pool.
 * Standardizes environment variable lookups for both local dev and Cloud SQL environments.
 */
export const createPool = () => {
  if (!global._postgresPool) {
    const host = process.env.SQL_HOST || process.env.PGHOST || '127.0.0.1';
    const port = process.env.SQL_PORT
      ? parseInt(process.env.SQL_PORT, 10)
      : process.env.PGPORT
      ? parseInt(process.env.PGPORT, 10)
      : 5432;
    const user = process.env.SQL_USER || process.env.PGUSER || 'postgres';
    const password = process.env.SQL_PASSWORD || process.env.PGPASSWORD || '';
    const database = process.env.SQL_DB_NAME || process.env.PGDATABASE || 'study_nest';

    global._postgresPool = new Pool({
      host,
      port,
      user,
      password,
      database,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });

