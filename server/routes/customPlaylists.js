const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getPool } = require('../db/database');

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

    // Verify ownership
    const playlist = await pool.query(
      'SELECT id, name, genre FROM playlists WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId]
    );
    if (playlist.rowCount === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const tracks = await pool.query(
      `SELECT id, rating_key, title, artist, album, duration, thumb, part_key, position, added_at
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
    const { ratingKey, title, artist, album, duration, thumb, partKey } = req.body;

    if (!ratingKey) {
      return res.status(400).json({ error: 'ratingKey is required' });
    }

    const pool = getPool();

    // Verify ownership
    const playlist = await pool.query(
      'SELECT id FROM playlists WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId]
    );
    if (playlist.rowCount === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Get next position
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM playlist_tracks WHERE playlist_id = $1',
      [req.params.id]
    );
    const nextPos = posResult.rows[0].next_pos;

    const result = await pool.query(
      `INSERT INTO playlist_tracks
         (playlist_id, rating_key, title, artist, album, duration, thumb, part_key, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (playlist_id, rating_key) DO NOTHING
       RETURNING *`,
      [req.params.id, ratingKey, title, artist, album, duration, thumb, partKey, nextPos]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ error: 'Track already in playlist' });
    }

    // Update playlist updated_at
    await pool.query(
      'UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.params.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/custom-playlists/:id/tracks/:trackId – remove a track
router.delete('/:id/tracks/:trackId', async (req, res, next) => {
  try {
    const pool = getPool();

    // Verify ownership via join
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

module.exports = router;
