const { getPool } = require('../db/database');

async function getPlexCredentials(userId) {
  const pool = getPool();
  const result = await pool.query('SELECT plex_url, plex_token FROM users WHERE id = $1', [userId]);
  const user = result.rows[0];

  return {
    plexUrl: user?.plex_url || process.env.DEFAULT_PLEX_URL,
    plexToken: user?.plex_token || process.env.DEFAULT_PLEX_TOKEN
  };
}

async function getUserById(userId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT id, username, email, plex_url, plex_token, created_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

async function getUserByUsername(username) {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0] || null;
}

async function createUser(username, email, passwordHash) {
  const pool = getPool();
  const result = await pool.query(
    'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [username, email || null, passwordHash]
  );
  return result.rows[0].id;
}

async function updatePlexCredentials(userId, plexUrl, plexToken) {
  const pool = getPool();
  await pool.query(
    'UPDATE users SET plex_url = $1, plex_token = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
    [plexUrl || null, plexToken || null, userId]
  );
}

module.exports = {
  getPlexCredentials,
  getUserById,
  getUserByUsername,
  createUser,
  updatePlexCredentials
};
