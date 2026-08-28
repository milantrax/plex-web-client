const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getPool } = require('../db/database');

router.use(requireAuth);

// GET /api/favorites – list user's favorites (optionally filtered by ?type=)
router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const { type } = req.query;
    let query = `SELECT id, type, rating_key, title, thumb, subtitle, year, duration, part_key, parent_rating_key, added_at
                 FROM favorites
                 WHERE user_id = $1`;
    const params = [req.session.userId];
    if (type) {
      query += ` AND type = $2`;
      params.push(type);
    }
    query += ` ORDER BY added_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/favorites – add a favorite
router.post('/', async (req, res, next) => {
  try {
    const { type, ratingKey, title, thumb, subtitle, year, duration, partKey, parentRatingKey } = req.body;
    if (!type || !ratingKey) {
      return res.status(400).json({ error: 'type and ratingKey are required' });
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO favorites (user_id, type, rating_key, title, thumb, subtitle, year, duration, part_key, parent_rating_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, type, rating_key) DO NOTHING
       RETURNING *`,
      [req.session.userId, type, String(ratingKey), title || null, thumb || null, subtitle || null,
       year || null, duration || null, partKey || null, parentRatingKey ? String(parentRatingKey) : null]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ error: 'Already favorited' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/favorites/:type/:ratingKey – remove a favorite
router.delete('/:type/:ratingKey', async (req, res, next) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND type = $2 AND rating_key = $3 RETURNING id',
      [req.session.userId, req.params.type, req.params.ratingKey]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
