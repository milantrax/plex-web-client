const axios = require('axios');

function createPlexClient(plexUrl, plexToken) {
  return axios.create({
    baseURL: plexUrl,
    headers: {
      'Accept': 'application/json',
      'X-Plex-Token': plexToken
    },
    timeout: 15000
  });
}

async function testConnection(plexUrl, plexToken) {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get('/');
  const container = response.data?.MediaContainer || {};
  return {
    success: true,
    serverName: container.friendlyName || 'Unknown',
    version: container.version || 'Unknown'
  };
}

async function getSections(plexUrl, plexToken) {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get('/library/sections');
  return response.data?.MediaContainer?.Directory || [];
}

async function getSectionItems(plexUrl, plexToken, sectionId, { type = 9, start = 0, size = null } = {}) {
  const client = createPlexClient(plexUrl, plexToken);
  const params = { type };
  if (start > 0) params['X-Plex-Container-Start'] = start;
  if (size) params['X-Plex-Container-Size'] = size;
  const response = await client.get(`/library/sections/${sectionId}/all`, { params });
  return response.data?.MediaContainer || {};
}

async function getAlbumTracks(plexUrl, plexToken, albumRatingKey) {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get(`/library/metadata/${albumRatingKey}/children`);
  return response.data?.MediaContainer || {};
}

async function getArtists(plexUrl, plexToken, sectionId, { start = 0, size = null } = {}) {
  const client = createPlexClient(plexUrl, plexToken);
  const params = { type: 8 };
  if (start > 0) params['X-Plex-Container-Start'] = start;
  if (size) params['X-Plex-Container-Size'] = size;
  const response = await client.get(`/library/sections/${sectionId}/all`, { params });
  return response.data?.MediaContainer || {};
}

async function getArtistAlbums(plexUrl, plexToken, artistRatingKey) {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get(`/library/metadata/${artistRatingKey}/children`);
  return response.data?.MediaContainer || {};
}

async function getPlaylists(plexUrl, plexToken) {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get('/playlists', { params: { playlistType: 'audio' } });
  return response.data?.MediaContainer?.Metadata || [];
}

async function getPlaylistItems(plexUrl, plexToken, playlistRatingKey) {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get(`/playlists/${playlistRatingKey}/items`);
  return response.data?.MediaContainer || {};
}

async function getGenres(plexUrl, plexToken, sectionId, type = 9) {
  const client = createPlexClient(plexUrl, plexToken);
  try {
    const response = await client.get(`/library/sections/${sectionId}/genre`, { params: { type } });
    const genres = response.data?.MediaContainer?.Directory || [];
    if (genres.length > 0) return genres;
  } catch (err) {
    // Fall through to extraction fallback
  }

  // Fallback: extract genres from all albums
  const response = await client.get(`/library/sections/${sectionId}/all`, { params: { type } });
  const items = response.data?.MediaContainer?.Metadata || [];
  const genreMap = new Map();
  items.forEach(item => {
    (item.Genre || []).forEach(g => {
      if (!genreMap.has(g.tag)) {
        genreMap.set(g.tag, { key: g.id || g.tag, title: g.tag, count: 0 });
      }
      genreMap.get(g.tag).count++;
    });
  });
  return Array.from(genreMap.values()).sort((a, b) => a.title.localeCompare(b.title));
}

async function getAlbumsByGenre(plexUrl, plexToken, sectionId, genreId, type = 9) {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get(`/library/sections/${sectionId}/all`, {
    params: { type, genre: genreId }
  });
  return response.data?.MediaContainer || {};
}

async function getYears(plexUrl, plexToken, sectionId, type = 9) {
  const client = createPlexClient(plexUrl, plexToken);
  try {
    const response = await client.get(`/library/sections/${sectionId}/year`, { params: { type } });
    const years = response.data?.MediaContainer?.Directory || [];
    if (years.length > 0) return years;
  } catch (err) {
    // Fall through to extraction fallback
  }

  const response = await client.get(`/library/sections/${sectionId}/all`, { params: { type } });
  const items = response.data?.MediaContainer?.Metadata || [];
  const yearSet = new Set();
  items.forEach(item => { if (item.year) yearSet.add(item.year); });
  return Array.from(yearSet)
    .sort((a, b) => b - a)
    .map(y => ({ key: y, title: String(y) }));
}

async function getAlbumsByYear(plexUrl, plexToken, sectionId, year, type = 9) {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get(`/library/sections/${sectionId}/all`, {
    params: { type, year }
  });
  return response.data?.MediaContainer || {};
}

async function getLabels(plexUrl, plexToken, sectionId, type = 9) {
  const client = createPlexClient(plexUrl, plexToken);
  try {
    const response = await client.get(`/library/sections/${sectionId}/studio`, { params: { type } });
    const labels = response.data?.MediaContainer?.Directory || [];
    if (labels.length > 0) return labels;
  } catch (err) {
    // Fall through to extraction fallback
  }

  const response = await client.get(`/library/sections/${sectionId}/all`, { params: { type } });
  const items = response.data?.MediaContainer?.Metadata || [];
  const labelSet = new Set();
  items.forEach(item => { if (item.studio) labelSet.add(item.studio); });
  return Array.from(labelSet)
    .sort()
    .map(l => ({ key: l, title: l }));
}

async function getAlbumsByLabel(plexUrl, plexToken, sectionId, label, type = 9) {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get(`/library/sections/${sectionId}/all`, {
    params: { type, studio: label }
  });
  return response.data?.MediaContainer || {};
}

async function searchMusic(plexUrl, plexToken, sectionId, query, type) {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get(`/library/sections/${sectionId}/search`, {
    params: { type, query }
  });
  return response.data?.MediaContainer?.Metadata || [];
}

async function getMetadata(plexUrl, plexToken, ratingKey) {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get(`/library/metadata/${ratingKey}`);
  return response.data?.MediaContainer?.Metadata?.[0] || null;
}

module.exports = {
  createPlexClient,
  testConnection,
  getSections,
  getSectionItems,
  getAlbumTracks,
  getArtists,
  getArtistAlbums,
  getPlaylists,
  getPlaylistItems,
  getGenres,
  getAlbumsByGenre,
  getYears,
  getAlbumsByYear,
  getLabels,
  getAlbumsByLabel,
  searchMusic,
  getMetadata
};
