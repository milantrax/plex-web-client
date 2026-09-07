import { redis } from './redisClient';

/**
 * Per-user cache of Plex responses, held in Redis.
 *
 * Every operation swallows its errors: a failed read reports a miss and a
 * failed write is dropped, so a cache problem degrades to a fetch from Plex
 * rather than a failed request, and callers never handle a cache error.
 *
 * Combined with the session store's Postgres mirror, this keeps the whole API
 * serving through a Redis outage — slower, because every request goes to Plex,
 * but correct. See services/sessionStore.ts.
 */

/** Namespace for cache entries, keeping them clear of the session keys. */
const KEY_PREFIX = 'plex:cache:';

export const TTL: Record<string, number> = {
  sections: 3600,
  sectionItems: 10800,
  albumTracks: 14400,
  playlists: 1800,
  playlistItems: 1800,
  genres: 14400,
  albumsByGenre: 7200,
  years: 14400,
  albumsByYear: 7200,
  labels: 14400,
  albumsByLabel: 7200,
  search: 1800,
  artists: 7200,
  artistAlbums: 7200,
  metadata: 10800
};

const DEFAULT_TTL = 10800;

/** Values that end up in a cache key, as the routes pass them from req.query. */
export type CacheParams = Record<string, unknown>;

function getCacheKey(userId: number, type: string, params: CacheParams = {}): string {
  return `${KEY_PREFIX}user_${userId}:${type}:${JSON.stringify(params)}`;
}

export async function get<T = unknown>(
  userId: number,
  type: string,
  params?: CacheParams
): Promise<T | undefined> {
  try {
    const raw = await redis.get(getCacheKey(userId, type, params));
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch (error) {
    // A miss and a failure are the same thing to the caller: fetch from Plex.
    console.error('[Cache] get failed:', (error as Error).message);
    return undefined;
  }
}

export async function set<T = unknown>(
  userId: number,
  type: string,
  params: CacheParams | undefined,
  data: T,
  ttlOverride?: number
): Promise<boolean> {
  const ttl = ttlOverride || TTL[type] || DEFAULT_TTL;
  try {
    await redis.set(getCacheKey(userId, type, params), JSON.stringify(data), { EX: ttl });
    return true;
  } catch (error) {
    console.error('[Cache] set failed:', (error as Error).message);
    return false;
  }
}

/**
 * Drops every cached response for one user, used when their Plex credentials
 * change. SCAN walks the keyspace in batches instead of blocking the server
 * the way KEYS would, and UNLINK frees the keys off the main thread.
 */
export async function clearUserCache(userId: number): Promise<void> {
  const match = `${KEY_PREFIX}user_${userId}:*`;
  try {
    for await (const keys of redis.scanIterator({ MATCH: match, COUNT: 100 })) {
      if (keys.length > 0) await redis.unlink(keys);
    }
  } catch (error) {
    console.error('[Cache] clearUserCache failed:', (error as Error).message);
  }
}

export interface CacheStats {
  /** Number of cached entries currently held across all users. */
  keys: number;
}

export async function getStats(): Promise<CacheStats> {
  let keys = 0;
  try {
    for await (const batch of redis.scanIterator({ MATCH: `${KEY_PREFIX}*`, COUNT: 100 })) {
      keys += batch.length;
    }
  } catch (error) {
    console.error('[Cache] getStats failed:', (error as Error).message);
  }
  return { keys };
}
