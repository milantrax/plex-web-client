const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getPool } = require('../db/database');
const { getPlexCredentials } = require('../services/userService');

router.use(requireAuth);

// GET /api/custom-playlists – list user's playlists with track counts
router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT p.id, p.name, p.genre, p.created_at, p.updated_at,
              COUNT(pt.id)::int AS track_count
       FROM playlists p
       LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/custom-playlists – create playlist
router.post('/', async (req, res, next) => {
  try {
    const { name, genre } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO playlists (user_id, name, genre)
       VALUES ($1, $2, $3)
       RETURNING id, name, genre, created_at, updated_at`,
      [req.session.userId, name.trim(), genre?.trim() || null]
    );

    res.status(201).json({ ...result.rows[0], track_count: 0 });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/custom-playlists/:id – delete playlist (must be owner)
router.delete('/:id', async (req, res, next) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.session.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/custom-playlists/:id/tracks – get tracks for a playlist
router.get('/:id/tracks', async (req, res, next) => {
  try {
    const pool = getPool();

    const playlist = await pool.query(
      'SELECT id, name, genre FROM playlists WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId]
    );
    if (playlist.rowCount === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const tracks = await pool.query(
      `SELECT id, rating_key, title, artist, album, duration, thumb, part_key, parent_rating_key, position, added_at
       FROM playlist_tracks
       WHERE playlist_id = $1
       ORDER BY position ASC, added_at ASC`,
      [req.params.id]
    );

    res.json({ playlist: playlist.rows[0], tracks: tracks.rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/custom-playlists/:id/tracks – add a track
router.post('/:id/tracks', async (req, res, next) => {
  try {
    const { ratingKey, title, artist, album, duration, thumb, partKey, parentRatingKey } = req.body;

    if (!ratingKey) {
      return res.status(400).json({ error: 'ratingKey is required' });
    }

    const pool = getPool();

    const playlist = await pool.query(
      'SELECT id FROM playlists WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId]
    );
    if (playlist.rowCount === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM playlist_tracks WHERE playlist_id = $1',
      [req.params.id]
    );
    const nextPos = posResult.rows[0].next_pos;

    const result = await pool.query(
      `INSERT INTO playlist_tracks
         (playlist_id, rating_key, title, artist, album, duration, thumb, part_key, parent_rating_key, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (playlist_id, rating_key) DO NOTHING
       RETURNING *`,
      [req.params.id, ratingKey, title, artist, album, duration, thumb, partKey, parentRatingKey || null, nextPos]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ error: 'Track already in playlist' });
    }

    await pool.query(
      'UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.params.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/custom-playlists/:id/tracks/reorder – save new track order
// Body: { order: [{ id: <playlist_track id>, position: <number> }, ...] }
router.patch('/:id/tracks/reorder', async (req, res, next) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ error: 'order array is required' });
    }

    const pool = getPool();

    const playlist = await pool.query(
      'SELECT id FROM playlists WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId]
    );
    if (playlist.rowCount === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { id, position } of order) {
        await client.query(
          'UPDATE playlist_tracks SET position = $1 WHERE id = $2 AND playlist_id = $3',
          [position, id, req.params.id]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/custom-playlists/:id/tracks/:trackId – remove a track
router.delete('/:id/tracks/:trackId', async (req, res, next) => {
  try {
    const pool = getPool();

    const result = await pool.query(
      `DELETE FROM playlist_tracks pt
       USING playlists p
       WHERE pt.playlist_id = p.id
         AND p.user_id = $1
         AND pt.id = $2
         AND p.id = $3
       RETURNING pt.id`,
      [req.session.userId, req.params.trackId, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Track not found in playlist' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/custom-playlists/:id/export-m3u – export playlist as M3U
router.get('/:id/export-m3u', async (req, res, next) => {
  try {
    const pool = getPool();

    const playlist = await pool.query(
      'SELECT id, name FROM playlists WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId]
    );
    if (playlist.rowCount === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const tracks = await pool.query(
      `SELECT title, artist, duration, part_key
       FROM playlist_tracks
       WHERE playlist_id = $1
       ORDER BY position ASC, added_at ASC`,
      [req.params.id]
    );

    const { plexUrl, plexToken } = await getPlexCredentials(req.session.userId);

    let m3u = '#EXTM3U\n';
    for (const track of tracks.rows) {
      const duration = Math.round((track.duration || 0) / 1000);
      const artist = track.artist || 'Unknown Artist';
      const title = track.title || 'Unknown Track';
      m3u += `#EXTINF:${duration},${artist} - ${title}\n`;
      if (track.part_key) {
        m3u += `${plexUrl}${track.part_key}?X-Plex-Token=${plexToken}\n`;
      }
    }

    const filename = playlist.rows[0].name.replace(/[^\w\s-]/g, '') || 'playlist';
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.m3u"`);
    res.send(m3u);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
