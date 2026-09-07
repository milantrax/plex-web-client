import { getPool } from '../db/database';
import type { PlexCredentials, UserRow } from '../types';

export async function getPlexCredentials(userId: number): Promise<PlexCredentials> {
  const pool = getPool();
  const result = await pool.query<Pick<UserRow, 'plex_url' | 'plex_token'>>(
    'SELECT plex_url, plex_token FROM users WHERE id = $1',
    [userId]
  );
  const user = result.rows[0];

  return {
    plexUrl: user?.plex_url || (process.env.DEFAULT_PLEX_URL as string),
    plexToken: user?.plex_token || (process.env.DEFAULT_PLEX_TOKEN as string)
  };
}

/** The public user columns, without the password hash. */
export type PublicUser = Omit<UserRow, 'password_hash' | 'updated_at'>;

export async function getUserById(userId: number): Promise<PublicUser | null> {
  const pool = getPool();
  const result = await pool.query<PublicUser>(
    'SELECT id, username, email, plex_url, plex_token, created_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

export async function getUserByUsername(username: string): Promise<UserRow | null> {
  const pool = getPool();
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0] || null;
}

export async function createUser(
  username: string,
  email: string | null | undefined,
  passwordHash: string
): Promise<number> {
  const pool = getPool();
  const result = await pool.query<{ id: number }>(
    'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [username, email || null, passwordHash]
  );
  return result.rows[0].id;
}

export async function updatePlexCredentials(
  userId: number,
  plexUrl: string | null | undefined,
  plexToken: string | null | undefined
): Promise<void> {
  const pool = getPool();
  await pool.query(
    'UPDATE users SET plex_url = $1, plex_token = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
    [plexUrl || null, plexToken || null, userId]
  );
}
