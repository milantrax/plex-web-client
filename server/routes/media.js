const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getPlexCredentials } = require('../services/userService');
const axios = require('axios');

router.use(requireAuth);

// GET /api/media/image?path=
router.get('/image', async (req, res) => {
  const { path: thumbPath } = req.query;
  if (!thumbPath) return res.status(400).end();

  try {
    const { plexUrl, plexToken } = await getPlexCredentials(req.session.userId);
    const response = await axios.get(`${plexUrl}${thumbPath}`, {
      headers: { 'X-Plex-Token': plexToken },
      responseType: 'stream',
      timeout: 10000
    });

    res.set('Content-Type', response.headers['content-type']);
    res.set('Cache-Control', 'public, max-age=86400');
    response.data.pipe(res);
  } catch (error) {
    res.status(error.response?.status || 500).end();
  }
});

// GET /api/media/audio?path=
router.get('/audio', async (req, res) => {
  const { path: partKey } = req.query;
  if (!partKey) return res.status(400).end();

  try {
    const { plexUrl, plexToken } = await getPlexCredentials(req.session.userId);
    const headers = { 'X-Plex-Token': plexToken };

    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await axios.get(`${plexUrl}${partKey}`, {
      headers,
      responseType: 'stream',
      timeout: 30000
    });

    res.status(response.status);
    if (response.headers['content-type']) res.set('Content-Type', response.headers['content-type']);
    if (response.headers['content-length']) res.set('Content-Length', response.headers['content-length']);
    if (response.headers['content-range']) res.set('Content-Range', response.headers['content-range']);
    if (response.headers['accept-ranges']) res.set('Accept-Ranges', response.headers['accept-ranges']);

    response.data.pipe(res);
  } catch (error) {
    res.status(error.response?.status || 500).end();
  }
});

// GET /api/media/transcode?path=
router.get('/transcode', async (req, res) => {
  const { path: partKey } = req.query;
  if (!partKey) return res.status(400).end();

  try {
    const { plexUrl, plexToken } = await getPlexCredentials(req.session.userId);

    const url = new URL(`${plexUrl}/audio/:/transcode/universal/start.mp3`);
    url.searchParams.append('path', partKey);
    url.searchParams.append('mediaIndex', '0');
    url.searchParams.append('partIndex', '0');
    url.searchParams.append('protocol', 'http');
    url.searchParams.append('audioCodec', 'mp3');
    url.searchParams.append('audioBitrate', '320');
    url.searchParams.append('X-Plex-Token', plexToken);

    const headers = {};
    if (req.headers.range) headers['Range'] = req.headers.range;

    const response = await axios.get(url.toString(), {
      responseType: 'stream',
      headers,
      timeout: 30000
    });

    res.status(response.status);
    if (response.headers['content-type']) res.set('Content-Type', response.headers['content-type']);
    if (response.headers['content-length']) res.set('Content-Length', response.headers['content-length']);
    if (response.headers['content-range']) res.set('Content-Range', response.headers['content-range']);
    if (response.headers['accept-ranges']) res.set('Accept-Ranges', response.headers['accept-ranges']);

    response.data.pipe(res);
  } catch (error) {
    res.status(error.response?.status || 500).end();
  }
});

// GET /api/media/download?path=&filename=
router.get('/download', async (req, res) => {
  const { path: partKey, filename } = req.query;
  if (!partKey) return res.status(400).end();

  try {
    const { plexUrl, plexToken } = await getPlexCredentials(req.session.userId);
    const response = await axios.get(`${plexUrl}${partKey}`, {
      headers: { 'X-Plex-Token': plexToken },
      params: { download: 1 },
      responseType: 'stream',
      timeout: 60000
    });

    res.set('Content-Disposition', `attachment; filename="${filename || 'track.mp3'}"`);
    if (response.headers['content-type']) res.set('Content-Type', response.headers['content-type']);
    if (response.headers['content-length']) res.set('Content-Length', response.headers['content-length']);

    response.data.pipe(res);
  } catch (error) {
    res.status(error.response?.status || 500).end();
  }
});

module.exports = router;
