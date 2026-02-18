const crypto = require('crypto');
const { getPool } = require('../db/database');
const plexService = require('./plexService');

const SYNC_BATCH_SIZE = 500;
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashPlexUrl(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 32);
}

async function getSyncStatus(plexUrlHash) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM library_sync_status WHERE plex_url_hash = $1',
    [plexUrlHash]
  );
  return result.rows[0] || null;
}

// Returns true when the DB has data from at least one completed sync.
// During a running re-sync the previous data is still available, so
// this returns true once last_synced_at is set.
async function hasDbData(plexUrlHash) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT last_synced_at FROM library_sync_status WHERE plex_url_hash = $1',
    [plexUrlHash]
  );
  return result.rows.length > 0 && result.rows[0].last_synced_at !== null;
}

async function syncLibrary(userId, plexUrl, plexToken, { force = false } = {}) {
  const pool = getPool();
  const urlHash = hashPlexUrl(plexUrl);

  const existing = await getSyncStatus(urlHash);

  if (existing?.status === 'syncing') {
    console.log(`[LibrarySync] Already syncing for ${urlHash}`);
    return;
  }

  if (!force && existing?.last_synced_at) {
    const ageMs = Date.now() - new Date(existing.last_synced_at).getTime();
    if (ageMs < SYNC_INTERVAL_MS) {
      return;
    }
  }

  console.log(`[LibrarySync] Starting sync for plex_url_hash=${urlHash}`);

  await pool.query(
    `INSERT INTO library_sync_status
       (plex_url_hash, user_id, status, started_at, synced_albums, total_albums, error_message)
     VALUES ($1, $2, 'syncing', NOW(), 0, 0, NULL)
     ON CONFLICT (plex_url_hash) DO UPDATE
       SET status       = 'syncing',
           user_id      = EXCLUDED.user_id,
           started_at   = NOW(),
           synced_albums = 0,
           total_albums  = 0,
           error_message = NULL`,
    [urlHash, userId]
  );

  try {
    const sections = await plexService.getSections(plexUrl, plexToken);
    const musicSections = sections.filter(s => s.type === 'artist');

    if (!musicSections.length) {
      throw new Error('No music library sections found on Plex server');
    }

    let totalSynced = 0;

    for (const section of musicSections) {
      let start = 0;

      while (true) {
        const container = await plexService.getSectionItems(
          plexUrl, plexToken, section.key,
          { type: 9, start, size: SYNC_BATCH_SIZE }
        );

        const albums = container.Metadata || [];
        if (albums.length === 0) break;

        for (const album of albums) {
          const genres = (album.Genre || []).map(g => g.tag).filter(Boolean);
          await pool.query(
            `INSERT INTO library_albums
               (plex_url_hash, section_key, rating_key,
                title, title_sort, artist, artist_sort,
                year, studio, thumb, genres, data)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (plex_url_hash, rating_key) DO UPDATE
               SET title       = EXCLUDED.title,
                   title_sort  = EXCLUDED.title_sort,
                   artist      = EXCLUDED.artist,
                   artist_sort = EXCLUDED.artist_sort,
                   year        = EXCLUDED.year,
                   studio      = EXCLUDED.studio,
                   thumb       = EXCLUDED.thumb,
                   genres      = EXCLUDED.genres,
                   data        = EXCLUDED.data,
                   synced_at   = NOW()`,
            [
              urlHash,
              String(section.key),
              String(album.ratingKey),
              album.title || null,
              album.titleSort || album.title || null,
              album.parentTitle || null,
              album.parentTitleSort || album.parentTitle || null,
              album.year ? parseInt(album.year) : null,
              album.studio || null,
              album.thumb || null,
              genres,
              JSON.stringify(album),
            ]
          );
          totalSynced++;
        }

        await pool.query(
          'UPDATE library_sync_status SET synced_albums = $1, total_albums = $1 WHERE plex_url_hash = $2',
          [totalSynced, urlHash]
        );

        if (albums.length < SYNC_BATCH_SIZE) break;
        start += SYNC_BATCH_SIZE;
      }
    }

    await pool.query(
      `UPDATE library_sync_status
          SET status        = 'done',
              last_synced_at = NOW(),
              synced_albums  = $1,
              total_albums   = $1
        WHERE plex_url_hash = $2`,
      [totalSynced, urlHash]
    );

    console.log(`[LibrarySync] Done – synced ${totalSynced} albums for hash=${urlHash}`);
  } catch (err) {
    console.error('[LibrarySync] Sync failed:', err.message);
    await pool.query(
      `UPDATE library_sync_status
          SET status = 'error', error_message = $1
        WHERE plex_url_hash = $2`,
      [err.message, urlHash]
    );
    throw err;
  }
}

async function triggerSyncIfNeeded(userId, plexUrl, plexToken) {
  try {
    await syncLibrary(userId, plexUrl, plexToken, { force: false });
  } catch (_) {
    // Errors are logged inside syncLibrary; caller doesn't need to handle
  }
}

async function triggerForcedSync(userId, plexUrl, plexToken) {
  try {
    await syncLibrary(userId, plexUrl, plexToken, { force: true });
  } catch (_) {}
}

async function syncAllStale() {
  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT s.plex_url_hash, s.user_id, u.plex_url, u.plex_token
         FROM library_sync_status s
         JOIN users u ON u.id = s.user_id
        WHERE s.status != 'syncing'
          AND (
            s.last_synced_at IS NULL
            OR s.last_synced_at < NOW() - INTERVAL '24 hours'
          )`
    );
    for (const row of result.rows) {
      syncLibrary(row.user_id, row.plex_url, row.plex_token, { force: false })
        .catch(err => console.error('[LibrarySync] Scheduled sync error:', err.message));
    }
  } catch (err) {
    console.error('[LibrarySync] Failed to query stale sync jobs:', err.message);
  }
}

function startSyncScheduler() {
  setTimeout(() => {
    syncAllStale().catch(() => {});
  }, 30_000);

  setInterval(() => {
    syncAllStale().catch(() => {});
  }, SYNC_INTERVAL_MS);

  console.log('[LibrarySync] Scheduler started (24h interval)');
}

module.exports = {
  hashPlexUrl,
  hasDbData,
  getSyncStatus,
  syncLibrary,
  triggerSyncIfNeeded,
  triggerForcedSync,
  startSyncScheduler,
};
