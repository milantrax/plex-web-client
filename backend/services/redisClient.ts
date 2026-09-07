import { createClient, type RedisClientType } from 'redis';

/**
 * The single Redis connection shared by the response cache and the session
 * store.
 *
 * `disableOfflineQueue` makes commands reject immediately while the socket is
 * down rather than queueing until it comes back, so an outage surfaces as a
 * fast error instead of a hung request.
 *
 * Redis is a hard dependency of the API, on a par with Postgres: it holds the
 * sessions, and express-session runs ahead of every route, so while Redis is
 * unreachable authenticated requests fail with 500 and the cache's own
 * fallback never comes into play. The client reconnects on its own, and
 * requests recover as soon as it does — no restart needed.
 */
export const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  disableOfflineQueue: true,
  socket: {
    // Retry forever, backing off to at most 3s between attempts.
    reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000)
  }
});

// node-redis emits 'error' on every failed connection attempt. Without a
// listener Node treats it as an unhandled 'error' event and exits, so a
// momentary Redis blip would take the API down with it.
redis.on('error', (err: Error) => {
  console.error('[Redis] Client error:', err.message);
});

redis.on('ready', () => {
  console.log('[Redis] Connected');
});

redis.on('reconnecting', () => {
  console.warn('[Redis] Reconnecting…');
});

/** Opens the connection. Called once at startup, before the server listens. */
export async function connectRedis(): Promise<void> {
  await redis.connect();
}

/** True when commands can currently be issued. */
export function isRedisReady(): boolean {
  return redis.isReady;
}
