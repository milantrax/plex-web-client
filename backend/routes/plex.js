const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getPlexCredentials } = require('../services/userService');
const plexService = require('../services/plexService');
const cache = require('../services/cacheService');
const librarySyncService = require('../services/librarySyncService');
const { getPool } = require('../db/database');

async function withCache(req, res, next, cacheType, params, fetchFn) {
  try {
    const userId = req.session.userId;
    const useCache = req.query.useCache !== 'false';

    if (useCache) {
      const cached = cache.get(userId, cacheType, params);
      if (cached) return res.json(cached);
    }

    const { plexUrl, plexToken } = await getPlexCredentials(userId);
    const data = await fetchFn(plexUrl, plexToken);
    cache.set(userId, cacheType, params, data);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function getUrlHash(userId) {
  const { plexUrl, plexToken } = await getPlexCredentials(userId);
  return { urlHash: librarySyncService.hashPlexUrl(plexUrl), plexUrl, plexToken };
}

async function dbGetAlbums(urlHash, sectionKey, limit, offset) {
  const pool = getPool();
  const rows = await pool.query(
    `SELECT data FROM library_albums
      WHERE plex_url_hash = $1 AND section_key = $2
      ORDER BY artist_sort ASC, title_sort ASC
      LIMIT $3 OFFSET $4`,
    [urlHash, String(sectionKey), limit, offset]
  );
  return rows.rows.map(r => r.data);
}

async function dbCountAlbums(urlHash, sectionKey) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT COUNT(*)::int AS cnt FROM library_albums WHERE plex_url_hash = $1 AND section_key = $2',
    [urlHash, String(sectionKey)]
  );
  return result.rows[0].cnt;
}

async function dbGetAlbumsByFilter(urlHash, sectionKey, { genre, year, label }) {
  const pool = getPool();
  let query, params;

  if (genre !== undefined) {
    query = `SELECT data FROM library_albums
              WHERE plex_url_hash = $1 AND section_key = $2 AND $3 = ANY(genres)
              ORDER BY artist_sort, title_sort`;
    params = [urlHash, String(sectionKey), genre];
  } else if (year !== undefined) {
    query = `SELECT data FROM library_albums
              WHERE plex_url_hash = $1 AND section_key = $2 AND year = $3
              ORDER BY artist_sort, title_sort`;
    params = [urlHash, String(sectionKey), parseInt(year)];
  } else if (label !== undefined) {
    query = `SELECT data FROM library_albums
              WHERE plex_url_hash = $1 AND section_key = $2 AND studio = $3
              ORDER BY artist_sort, title_sort`;
    params = [urlHash, String(sectionKey), label];
  } else {
    return null;
  }

  const result = await pool.query(query, params);
  return result.rows.map(r => r.data);
}

async function dbGetGenres(urlHash, sectionKey) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT DISTINCT unnest(genres) AS genre
       FROM library_albums
      WHERE plex_url_hash = $1 AND section_key = $2
        AND genres IS NOT NULL AND array_length(genres, 1) > 0
      ORDER BY genre`,
    [urlHash, String(sectionKey)]
  );
  return result.rows.map(r => ({ id: r.genre, key: r.genre, tag: r.genre, title: r.genre }));
}

async function dbGetYears(urlHash, sectionKey) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT DISTINCT year
       FROM library_albums
      WHERE plex_url_hash = $1 AND section_key = $2
        AND year IS NOT NULL
      ORDER BY year DESC`,
    [urlHash, String(sectionKey)]
  );
  return result.rows.map(r => ({ id: r.year, key: String(r.year), title: String(r.year) }));
}

async function dbGetLabels(urlHash, sectionKey) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT DISTINCT studio
       FROM library_albums
      WHERE plex_url_hash = $1 AND section_key = $2
        AND studio IS NOT NULL
      ORDER BY studio`,
    [urlHash, String(sectionKey)]
  );
  return result.rows.map(r => ({ id: r.studio, key: r.studio, tag: r.studio, title: r.studio }));
}

router.use(requireAuth);

// GET /api/plex/test-connection
router.get('/test-connection', async (req, res, next) => {
  try {
    const { plexUrl, plexToken } = await getPlexCredentials(req.session.userId);
    const result = await plexService.testConnection(plexUrl, plexToken);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/plex/sections
router.get('/sections', (req, res, next) => {
  withCache(req, res, next, 'sections', {}, (url, token) =>
    plexService.getSections(url, token)
  );
});

// GET /api/plex/sections/:sectionId/items
// Serves from DB when a completed sync exists; otherwise falls through to Plex
// and triggers a background sync.
router.get('/sections/:sectionId/items', async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { type = 9, start = 0, size } = req.query;
    const limit = size ? parseInt(size) : 300;
    const offset = parseInt(start);
    const userId = req.session.userId;

    const { urlHash, plexUrl, plexToken } = await getUrlHash(userId);

    if (await librarySyncService.hasDbData(urlHash)) {
      const albums = await dbGetAlbums(urlHash, sectionId, limit, offset);
      const totalSize = await dbCountAlbums(urlHash, sectionId);

      librarySyncService.triggerSyncIfNeeded(userId, plexUrl, plexToken).catch(() => {});

      return res.json({ Metadata: albums, size: albums.length, totalSize });
    }

    librarySyncService.triggerSyncIfNeeded(userId, plexUrl, plexToken).catch(() => {});

    const cacheParams = { sectionId, type, start, size };
    const useCache = req.query.useCache !== 'false';
    if (useCache) {
      const cached = cache.get(userId, 'sectionItems', cacheParams);
      if (cached) return res.json(cached);
    }

    const data = await plexService.getSectionItems(plexUrl, plexToken, sectionId, {
      type: parseInt(type), start: offset, size: limit,
    });
    cache.set(userId, 'sectionItems', cacheParams, data);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/plex/sections/:sectionId/genres
router.get('/sections/:sectionId/genres', async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { type = 9 } = req.query;
    const userId = req.session.userId;

    const { urlHash, plexUrl, plexToken } = await getUrlHash(userId);

    if (await librarySyncService.hasDbData(urlHash)) {
      const genres = await dbGetGenres(urlHash, sectionId);
      return res.json(genres);
    }

    withCache(req, res, next, 'genres', { sectionId, type }, (url, token) =>
      plexService.getGenres(url, token, sectionId, parseInt(type))
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/plex/sections/:sectionId/years
router.get('/sections/:sectionId/years', async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { type = 9 } = req.query;
    const userId = req.session.userId;

    const { urlHash, plexUrl, plexToken } = await getUrlHash(userId);

    if (await librarySyncService.hasDbData(urlHash)) {
      const years = await dbGetYears(urlHash, sectionId);
      return res.json(years);
    }

    withCache(req, res, next, 'years', { sectionId, type }, (url, token) =>
      plexService.getYears(url, token, sectionId, parseInt(type))
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/plex/sections/:sectionId/labels
router.get('/sections/:sectionId/labels', async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { type = 9 } = req.query;
    const userId = req.session.userId;

    const { urlHash, plexUrl, plexToken } = await getUrlHash(userId);

    if (await librarySyncService.hasDbData(urlHash)) {
      const labels = await dbGetLabels(urlHash, sectionId);
      return res.json(labels);
    }

    withCache(req, res, next, 'labels', { sectionId, type }, (url, token) =>
      plexService.getLabels(url, token, sectionId, parseInt(type))
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/plex/sections/:sectionId/albums-by-genre
router.get('/sections/:sectionId/albums-by-genre', async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { genre, type = 9 } = req.query;
    const userId = req.session.userId;

    const { urlHash, plexUrl, plexToken } = await getUrlHash(userId);

    if (await librarySyncService.hasDbData(urlHash)) {
      const albums = await dbGetAlbumsByFilter(urlHash, sectionId, { genre });
      return res.json({ Metadata: albums });
    }

    withCache(req, res, next, 'albumsByGenre', { sectionId, genre, type }, (url, token) =>
      plexService.getAlbumsByGenre(url, token, sectionId, genre, parseInt(type))
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/plex/sections/:sectionId/albums-by-year
router.get('/sections/:sectionId/albums-by-year', async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { year, type = 9 } = req.query;
    const userId = req.session.userId;

    const { urlHash, plexUrl, plexToken } = await getUrlHash(userId);

    if (await librarySyncService.hasDbData(urlHash)) {
      const albums = await dbGetAlbumsByFilter(urlHash, sectionId, { year });
      return res.json({ Metadata: albums });
    }

    withCache(req, res, next, 'albumsByYear', { sectionId, year, type }, (url, token) =>
      plexService.getAlbumsByYear(url, token, sectionId, year, parseInt(type))
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/plex/sections/:sectionId/albums-by-label
router.get('/sections/:sectionId/albums-by-label', async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { label, type = 9 } = req.query;
    const userId = req.session.userId;

    const { urlHash, plexUrl, plexToken } = await getUrlHash(userId);

    if (await librarySyncService.hasDbData(urlHash)) {
      const albums = await dbGetAlbumsByFilter(urlHash, sectionId, { label });
      return res.json({ Metadata: albums });
    }

    withCache(req, res, next, 'albumsByLabel', { sectionId, label, type }, (url, token) =>
      plexService.getAlbumsByLabel(url, token, sectionId, label, parseInt(type))
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/plex/albums/:ratingKey/tracks
router.get('/albums/:ratingKey/tracks', (req, res, next) => {
  const { ratingKey } = req.params;
  withCache(req, res, next, 'albumTracks', { ratingKey }, (url, token) =>
    plexService.getAlbumTracks(url, token, ratingKey)
  );
});

// GET /api/plex/playlists
router.get('/playlists', (req, res, next) => {
  withCache(req, res, next, 'playlists', {}, (url, token) =>
    plexService.getPlaylists(url, token)
  );
});

// GET /api/plex/playlists/:ratingKey/items
router.get('/playlists/:ratingKey/items', (req, res, next) => {
  const { ratingKey } = req.params;
  withCache(req, res, next, 'playlistItems', { ratingKey }, (url, token) =>
    plexService.getPlaylistItems(url, token, ratingKey)
  );
});

// GET /api/plex/search
router.get('/search', async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { q, limit } = req.query;
    const useCache = req.query.useCache !== 'false';

    const cacheParams = { q, limit };
    if (useCache) {
      const cached = cache.get(userId, 'search', cacheParams);
      if (cached) return res.json(cached);
    }

    const { plexUrl, plexToken } = await getPlexCredentials(userId);
    const sections = await plexService.getSections(plexUrl, plexToken);
    const musicSections = sections.filter(s => s.type === 'artist');

    const results = { albums: [], tracks: [] };
    for (const section of musicSections) {
      const [albums, tracks] = await Promise.all([
        plexService.searchMusic(plexUrl, plexToken, section.key, q, 9),
        plexService.searchMusic(plexUrl, plexToken, section.key, q, 10)
      ]);
      results.albums.push(...albums);
      results.tracks.push(...tracks);
    }

    if (limit) {
      results.albums = results.albums.slice(0, parseInt(limit));
      results.tracks = results.tracks.slice(0, parseInt(limit));
    }

    cache.set(userId, 'search', cacheParams, results);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// GET /api/plex/search/albums
router.get('/search/albums', async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { q } = req.query;
    const useCache = req.query.useCache !== 'false';

    const cacheParams = { q, type: 'albumsWithTracks' };
    if (useCache) {
      const cached = cache.get(userId, 'search', cacheParams);
      if (cached) return res.json(cached);
    }

    const { plexUrl, plexToken } = await getPlexCredentials(userId);
    const sections = await plexService.getSections(plexUrl, plexToken);
    const musicSections = sections.filter(s => s.type === 'artist');

    const albumMap = new Map();
    for (const section of musicSections) {
      const albums = await plexService.searchMusic(plexUrl, plexToken, section.key, q, 9);
      albums.forEach(album => {
        albumMap.set(album.ratingKey, { ...album, matchingTracks: [] });
      });

      const tracks = await plexService.searchMusic(plexUrl, plexToken, section.key, q, 10);
      for (const track of tracks) {
        const albumKey = track.parentRatingKey;
        if (albumMap.has(albumKey)) {
          albumMap.get(albumKey).matchingTracks.push(track);
        } else {
          const albumMeta = await plexService.getMetadata(plexUrl, plexToken, albumKey);
          if (albumMeta) {
            albumMap.set(albumKey, { ...albumMeta, matchingTracks: [track] });
          }
        }
      }
    }

    const results = Array.from(albumMap.values());
    cache.set(userId, 'search', cacheParams, results);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// GET /api/plex/sections/:sectionId/artists
router.get('/sections/:sectionId/artists', (req, res, next) => {
  const { sectionId } = req.params;
  const { start = 0, size } = req.query;
  withCache(req, res, next, 'artists', { sectionId, start, size }, (url, token) =>
    plexService.getArtists(url, token, sectionId, {
      start: parseInt(start),
      size: size ? parseInt(size) : null
    })
  );
});

// GET /api/plex/artists/:ratingKey/albums
router.get('/artists/:ratingKey/albums', (req, res, next) => {
  const { ratingKey } = req.params;
  withCache(req, res, next, 'artistAlbums', { ratingKey }, (url, token) =>
    plexService.getArtistAlbums(url, token, ratingKey)
  );
});

// GET /api/plex/metadata/:ratingKey
router.get('/metadata/:ratingKey', (req, res, next) => {
  const { ratingKey } = req.params;
  withCache(req, res, next, 'metadata', { ratingKey }, (url, token) =>
    plexService.getMetadata(url, token, ratingKey)
  );
});

// GET /api/plex/playlists/:ratingKey/export-m3u
router.get('/playlists/:ratingKey/export-m3u', async (req, res, next) => {
  try {
    const { plexUrl, plexToken } = await getPlexCredentials(req.session.userId);
    const container = await plexService.getPlaylistItems(plexUrl, plexToken, req.params.ratingKey);
    const tracks = container.Metadata || [];

    let m3u = '#EXTM3U\n';
    for (const track of tracks) {
      const duration = Math.round((track.duration || 0) / 1000);
      const artist = track.grandparentTitle || 'Unknown Artist';
      const title = track.title || 'Unknown Track';
      m3u += `#EXTINF:${duration},${artist} - ${title}\n`;
      const partKey = track.Media?.[0]?.Part?.[0]?.key;
      if (partKey) {
        m3u += `${plexUrl}${partKey}?X-Plex-Token=${plexToken}\n`;
      }
    }

    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Content-Disposition', `attachment; filename="playlist.m3u"`);
    res.send(m3u);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
