import { createClient, type RedisClientType } from 'redis';

/**
 * The single Redis connection shared by the response cache and the session
 * store.
 *
 * `disableOfflineQueue` makes commands reject immediately while the socket is
 * down rather than queueing until it comes back, so an outage surfaces as a
 * fast error instead of a hung request.
 *
 * Redis is optional: the API starts without it, the cache treats every failure
 * as a miss and re-fetches from Plex, and the session store falls back to its
 * Postgres mirror. Connecting therefore happens in the background, and the
 * client reconnects on its own once Redis returns.
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

/**
 * Starts connecting without blocking startup.
 *
 * A rejection here only means Redis was not up at boot; node-redis keeps
 * retrying per `reconnectStrategy`, so the cache and the fast session path
 * come to life on their own once it is reachable.
 */
export function connectRedis(): void {
  redis.connect().catch((err: Error) => {
    console.warn(`[Redis] Not reachable at startup (${err.message}) — serving without cache until it returns`);
  });
}

/** True when commands can currently be issued. */
export function isRedisReady(): boolean {
  return redis.isReady;
}
