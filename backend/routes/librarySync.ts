import { Router } from 'express';
import { requireAuth, sessionUserId } from '../middleware/auth';
import { getPlexCredentials } from '../services/userService';
import * as librarySyncService from '../services/librarySyncService';

const router = Router();

router.use(requireAuth);

// GET /api/plex/library/sync-status
// Returns current sync state for the authenticated user's Plex server.
router.get('/sync-status', async (req, res, next) => {
  try {
    const { plexUrl } = await getPlexCredentials(sessionUserId(req));
    const urlHash = librarySyncService.hashPlexUrl(plexUrl);
    const status = await librarySyncService.getSyncStatus(urlHash);

    if (!status) {
      return res.json({ status: 'idle', syncedAlbums: 0, totalAlbums: 0, lastSyncedAt: null });
    }

    res.json({
      status: status.status,
      syncedAlbums: status.synced_albums,
      totalAlbums: status.total_albums,
      lastSyncedAt: status.last_synced_at,
      startedAt: status.started_at,
      errorMessage: status.error_message || null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/plex/library/sync
// Trigger a forced full re-sync in the background. Returns 202 immediately.
router.post('/sync', async (req, res, next) => {
  try {
    const userId = sessionUserId(req);
    const { plexUrl, plexToken } = await getPlexCredentials(userId);
    const urlHash = librarySyncService.hashPlexUrl(plexUrl);
    const existing = await librarySyncService.getSyncStatus(urlHash);

    if (existing?.status === 'syncing') {
      return res.status(409).json({ message: 'Sync already in progress' });
    }

    // Fire-and-forget
    librarySyncService.triggerForcedSync(userId, plexUrl, plexToken);

    res.status(202).json({ message: 'Sync started' });
  } catch (err) {
    next(err);
  }
});

export default router;
