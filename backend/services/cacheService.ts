import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 10800, checkperiod: 600 });

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

/** Values that end up in a cache key, as the routes pass them from req.query. */
export type CacheParams = Record<string, unknown>;

function getCacheKey(userId: number, type: string, params: CacheParams = {}): string {
  return `user_${userId}:${type}:${JSON.stringify(params)}`;
}

export function get<T = unknown>(userId: number, type: string, params?: CacheParams): T | undefined {
  return cache.get<T>(getCacheKey(userId, type, params));
}

export function set<T = unknown>(
  userId: number,
  type: string,
  params: CacheParams | undefined,
  data: T,
  ttlOverride?: number
): boolean {
  const ttl = ttlOverride || TTL[type] || 10800;
  return cache.set(getCacheKey(userId, type, params), data, ttl);
}

export function clearUserCache(userId: number): void {
  const keys = cache.keys().filter(k => k.startsWith(`user_${userId}:`));
  if (keys.length > 0) cache.del(keys);
}

export function getStats(): NodeCache.Stats {
  return cache.getStats();
}
