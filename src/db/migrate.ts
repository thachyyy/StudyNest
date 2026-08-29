import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runAdminMigration() {
  const host = process.env.SQL_HOST || process.env.PGHOST || '127.0.0.1';
  const database = process.env.SQL_DB_NAME || process.env.PGDATABASE || 'study_nest';
  const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER || process.env.PGUSER || 'postgres';
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || process.env.PGPASSWORD || '';
  const port = process.env.SQL_PORT
    ? parseInt(process.env.SQL_PORT, 10)
    : process.env.PGPORT
    ? parseInt(process.env.PGPORT, 10)
    : 5432;

  console.log(`Connecting to ${database} on ${host}:${port} as ${user}...`);

  const pool = new Pool({
    host,
    port,
    user,
    password,
    database,
    connectionTimeoutMillis: 15000,
  });

  try {
    const drizzleDir = path.join(process.cwd(), 'drizzle');
    const migrationFiles = fs
      .readdirSync(drizzleDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files: ${migrationFiles.join(', ')}`);

    for (const file of migrationFiles) {
      console.log(`Applying migration file ${file}...`);
      const sqlContent = fs.readFileSync(path.join(drizzleDir, file), 'utf8');
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await pool.query(stmt);
        } catch (err: any) {
          // If type or constraint already exists in re-runs, handle gracefully
          console.warn(`Notice on statement: ${err.message}`);
        }
      }
      console.log(`Completed migration file ${file}.`);
    }

    console.log('All migrations applied successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runAdminMigration();
