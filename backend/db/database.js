const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool;

function initializeDatabase() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
  });

  return pool;
}

async function runSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

function getPool() {
  if (!pool) throw new Error('Database not initialized');
  return pool;
}

module.exports = { initializeDatabase, runSchema, getPool };
