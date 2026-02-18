const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getPlexCredentials } = require('../services/userService');
const plexService = require('../services/plexService');
const cache = require('../services/cacheService');

// Helper to get credentials and check cache
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

// All routes require authentication
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
router.get('/sections/:sectionId/items', (req, res, next) => {
  const { sectionId } = req.params;
  const { type = 9, start = 0, size } = req.query;
  const params = { sectionId, type, start, size };

  withCache(req, res, next, 'sectionItems', params, (url, token) =>
    plexService.getSectionItems(url, token, sectionId, {
      type: parseInt(type),
      start: parseInt(start),
      size: size ? parseInt(size) : null
    })
  );
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

// GET /api/plex/sections/:sectionId/genres
router.get('/sections/:sectionId/genres', (req, res, next) => {
  const { sectionId } = req.params;
  const { type = 9 } = req.query;
  withCache(req, res, next, 'genres', { sectionId, type }, (url, token) =>
    plexService.getGenres(url, token, sectionId, parseInt(type))
  );
});

// GET /api/plex/sections/:sectionId/albums-by-genre
router.get('/sections/:sectionId/albums-by-genre', (req, res, next) => {
  const { sectionId } = req.params;
  const { genre, type = 9 } = req.query;
  withCache(req, res, next, 'albumsByGenre', { sectionId, genre, type }, (url, token) =>
    plexService.getAlbumsByGenre(url, token, sectionId, genre, parseInt(type))
  );
});

// GET /api/plex/sections/:sectionId/years
router.get('/sections/:sectionId/years', (req, res, next) => {
  const { sectionId } = req.params;
  const { type = 9 } = req.query;
  withCache(req, res, next, 'years', { sectionId, type }, (url, token) =>
    plexService.getYears(url, token, sectionId, parseInt(type))
  );
});

// GET /api/plex/sections/:sectionId/albums-by-year
router.get('/sections/:sectionId/albums-by-year', (req, res, next) => {
  const { sectionId } = req.params;
  const { year, type = 9 } = req.query;
  withCache(req, res, next, 'albumsByYear', { sectionId, year, type }, (url, token) =>
    plexService.getAlbumsByYear(url, token, sectionId, year, parseInt(type))
  );
});

// GET /api/plex/sections/:sectionId/labels
router.get('/sections/:sectionId/labels', (req, res, next) => {
  const { sectionId } = req.params;
  const { type = 9 } = req.query;
  withCache(req, res, next, 'labels', { sectionId, type }, (url, token) =>
    plexService.getLabels(url, token, sectionId, parseInt(type))
  );
});

// GET /api/plex/sections/:sectionId/albums-by-label
router.get('/sections/:sectionId/albums-by-label', (req, res, next) => {
  const { sectionId } = req.params;
  const { label, type = 9 } = req.query;
  withCache(req, res, next, 'albumsByLabel', { sectionId, label, type }, (url, token) =>
    plexService.getAlbumsByLabel(url, token, sectionId, label, parseInt(type))
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

    // Search across all music sections
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
      // Search for albums matching query
      const albums = await plexService.searchMusic(plexUrl, plexToken, section.key, q, 9);
      albums.forEach(album => {
        albumMap.set(album.ratingKey, { ...album, matchingTracks: [] });
      });

      // Search for tracks matching query
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
  const params = { sectionId, start, size };

  withCache(req, res, next, 'artists', params, (url, token) =>
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
