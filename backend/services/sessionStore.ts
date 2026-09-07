import { Store, type SessionData } from 'express-session';

type Callback = (err?: unknown, data?: SessionData | null) => void;

/** How often a session's Postgres mirror is refreshed while it is only touched. */
const PG_TOUCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * A session store that reads and writes Redis first and keeps Postgres as a
 * mirror, so that logins survive a Redis outage.
 *
 * express-session consults the store ahead of every route, so a store that
 * throws takes the whole authenticated API down with it. Redis stays the
 * primary — every read is served from it, and writes go there first — while
 * Postgres holds a copy that is only consulted when Redis cannot answer.
 *
 * Reads fall back to Postgres when Redis *errors*, and also on a clean Redis
 * miss, which covers a session created during an outage or lost to a Redis
 * flush. A session removed through `destroy` is deleted from both stores, so a
 * miss in both is a genuine logout and nothing is resurrected.
 */
export class ResilientSessionStore extends Store {
  private redisStore: Store;
  private pgStore: Store;
  /** sid -> last time the Postgres mirror's expiry was refreshed. */
  private lastPgTouch = new Map<string, number>();

  constructor(redisStore: Store, pgStore: Store) {
    super();
    this.redisStore = redisStore;
    this.pgStore = pgStore;
  }

  get(sid: string, cb: Callback): void {
    this.redisStore.get(sid, (redisErr, session) => {
      if (!redisErr && session) {
        cb(null, session);
        return;
      }

      if (redisErr) {
        console.error('[Session] Redis read failed, falling back to Postgres:', (redisErr as Error).message);
      }

      this.pgStore.get(sid, (pgErr, pgSession) => {
        if (pgErr) {
          cb(pgErr);
          return;
        }
        if (!pgSession) {
          // Absent from both stores: a real logout or an expired session.
          cb(null, null);
          return;
        }

        // Redis could not answer but Postgres could. Warm Redis back up so the
        // next read takes the fast path again.
        this.redisStore.set(sid, pgSession, () => {});
        cb(null, pgSession);
      });
    });
  }

  set(sid: string, session: SessionData, cb?: Callback): void {
    // Written on login, logout and profile changes — rare enough that writing
    // through to both stores costs nothing noticeable.
    let pending = 2;
    let firstErr: unknown;
    let anySucceeded = false;

    const done = (err?: unknown) => {
      if (err) {
        firstErr = firstErr ?? err;
      } else {
        anySucceeded = true;
      }
      if (--pending > 0) return;
      // One store is enough to keep the user logged in.
      if (anySucceeded) {
        this.lastPgTouch.set(sid, Date.now());
        cb?.(null);
      } else {
        cb?.(firstErr);
      }
    };

    this.redisStore.set(sid, session, (err) => {
      if (err) console.error('[Session] Redis write failed:', (err as Error).message);
      done(err);
    });
    this.pgStore.set(sid, session, (err) => {
      if (err) console.error('[Session] Postgres write failed:', (err as Error).message);
      done(err);
    });
  }

  touch(sid: string, session: SessionData, cb?: Callback): void {
    // Fires on every request for an unmodified session. Redis absorbs that
    // freely; the Postgres mirror is refreshed at most hourly so its copy
    // cannot quietly expire under an active user without costing a write per
    // request.
    this.redisStore.touch?.(sid, session, () => {});

    const last = this.lastPgTouch.get(sid) ?? 0;
    if (Date.now() - last > PG_TOUCH_INTERVAL_MS) {
      this.lastPgTouch.set(sid, Date.now());
      this.pgStore.touch?.(sid, session, () => {});
    }

    cb?.(null);
  }

  destroy(sid: string, cb?: Callback): void {
    this.lastPgTouch.delete(sid);

    let pending = 2;
    const done = () => {
      if (--pending === 0) cb?.(null);
    };

    // Both are best-effort: a logout must not fail because one store is down,
    // but both must be cleared or the session could come back on fallback.
    this.redisStore.destroy(sid, (err) => {
      if (err) console.error('[Session] Redis destroy failed:', (err as Error).message);
      done();
    });
    this.pgStore.destroy(sid, (err) => {
      if (err) console.error('[Session] Postgres destroy failed:', (err as Error).message);
      done();
    });
  }
}
