import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | undefined;

export function initializeDatabase(): Pool {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
  });

  return pool;
}

export async function runSchema(): Promise<void> {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool!.query(schema);
}

export function getPool(): Pool {
  if (!pool) throw new Error('Database not initialized');
  return pool;
}
