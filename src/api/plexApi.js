import axios from 'axios';

// Axios instance for all proxy API calls
const api = axios.create({
  withCredentials: true,
  headers: { 'Accept': 'application/json' }
});

// Redirect to /login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ---------------------------------------------------------------------------
// URL helpers – return proxy URLs, never expose Plex token to the browser
// ---------------------------------------------------------------------------

export const getPlexImageUrl = (thumbPath) => {
  if (!thumbPath) return null;
  return `/api/media/image?path=${encodeURIComponent(thumbPath)}`;
};

export const getPlexAudioUrl = (partKey) => {
  if (!partKey) return null;
  return `/api/media/audio?path=${encodeURIComponent(partKey)}`;
};

export const getPlexTranscodeUrl = (partKey) => {
  if (!partKey) return null;
  return `/api/media/transcode?path=${encodeURIComponent(partKey)}`;
};

export const getTrackDownloadUrl = (partKey, trackTitle = 'track') => {
  if (!partKey) return null;
  return `/api/media/download?path=${encodeURIComponent(partKey)}&filename=${encodeURIComponent(trackTitle)}`;
};

// ---------------------------------------------------------------------------
// Data API calls – all go through the Node proxy
// ---------------------------------------------------------------------------

export const getSections = async (useCache = true) => {
  try {
    const res = await api.get('/api/plex/sections', { params: { useCache } });
    return res.data;
  } catch (error) {
    console.error('Error fetching sections:', error);
    throw error;
  }
};

export const getSectionItems = async (sectionId, type = 9, start = 0, size = null, useCache = true) => {
  try {
    const res = await api.get(`/api/plex/sections/${sectionId}/items`, {
      params: { type, start, size, useCache }
    });
    return res.data?.Metadata || [];
  } catch (error) {
    console.error(`Error fetching section items for ${sectionId}:`, error);
    throw error;
  }
};

export const getAlbumTracks = async (albumRatingKey, useCache = true) => {
  try {
    const res = await api.get(`/api/plex/albums/${albumRatingKey}/tracks`, { params: { useCache } });
    return res.data?.Metadata || [];
  } catch (error) {
    console.error(`Error fetching tracks for album ${albumRatingKey}:`, error);
    throw error;
  }
};

export const getPlaylists = async (useCache = true) => {
  try {
    const res = await api.get('/api/plex/playlists', { params: { useCache } });
    return res.data;
  } catch (error) {
    console.error('Error fetching playlists:', error);
    throw error;
  }
};

export const getPlaylistItems = async (playlistRatingKey, useCache = true) => {
  try {
    const res = await api.get(`/api/plex/playlists/${playlistRatingKey}/items`, { params: { useCache } });
    return res.data?.Metadata || [];
  } catch (error) {
    console.error(`Error fetching playlist items for ${playlistRatingKey}:`, error);
    throw error;
  }
};

export const getGenres = async (sectionId, type = 9, useCache = true) => {
  try {
    const res = await api.get(`/api/plex/sections/${sectionId}/genres`, { params: { type, useCache } });
    return res.data;
  } catch (error) {
    console.error(`Error fetching genres for section ${sectionId}:`, error);
    throw error;
  }
};

export const getAlbumsByGenre = async (sectionId, genreId, type = 9, useCache = true) => {
  try {
    const res = await api.get(`/api/plex/sections/${sectionId}/albums-by-genre`, {
      params: { genre: genreId, type, useCache }
    });
    return res.data?.Metadata || [];
  } catch (error) {
    console.error(`Error fetching albums for genre ${genreId}:`, error);
    throw error;
  }
};

export const getYears = async (sectionId, type = 9, useCache = true) => {
  try {
    const res = await api.get(`/api/plex/sections/${sectionId}/years`, { params: { type, useCache } });
    return res.data;
  } catch (error) {
    console.error(`Error fetching years for section ${sectionId}:`, error);
    throw error;
  }
};

export const getAlbumsByYear = async (sectionId, year, type = 9, useCache = true) => {
  try {
    const res = await api.get(`/api/plex/sections/${sectionId}/albums-by-year`, {
      params: { year, type, useCache }
    });
    return res.data?.Metadata || [];
  } catch (error) {
    console.error(`Error fetching albums for year ${year}:`, error);
    throw error;
  }
};

export const getLabels = async (sectionId, type = 9, useCache = true) => {
  try {
    const res = await api.get(`/api/plex/sections/${sectionId}/labels`, { params: { type, useCache } });
    return res.data;
  } catch (error) {
    console.error(`Error fetching labels for section ${sectionId}:`, error);
    throw error;
  }
};

export const getAlbumsByLabel = async (sectionId, label, type = 9, useCache = true) => {
  try {
    const res = await api.get(`/api/plex/sections/${sectionId}/albums-by-label`, {
      params: { label, type, useCache }
    });
    return res.data?.Metadata || [];
  } catch (error) {
    console.error(`Error fetching albums for label ${label}:`, error);
    throw error;
  }
};

export const searchMusic = async (query, options = {}) => {
  const { useCache = true, limit = 50 } = options;

  if (!query || query.trim().length < 2) {
    return { albums: [], tracks: [] };
  }

  try {
    const res = await api.get('/api/plex/search', { params: { q: query, limit, useCache } });
    return res.data;
  } catch (error) {
    console.error('Error searching music:', error);
    throw error;
  }
};

export const searchAlbumsWithMatchingTracks = async (query, options = {}) => {
  const { useCache = true } = options;

  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const res = await api.get('/api/plex/search/albums', { params: { q: query, useCache } });
    return res.data;
  } catch (error) {
    console.error('Error searching albums with matching tracks:', error);
    throw error;
  }
};

export const getArtists = async (sectionId, start = 0, size = null, useCache = true) => {
  try {
    const res = await api.get(`/api/plex/sections/${sectionId}/artists`, {
      params: { start, size, useCache }
    });
    return res.data?.Metadata || [];
  } catch (error) {
    console.error(`Error fetching artists for section ${sectionId}:`, error);
    throw error;
  }
};

export const getArtistAlbums = async (artistRatingKey, useCache = true) => {
  try {
    const res = await api.get(`/api/plex/artists/${artistRatingKey}/albums`, { params: { useCache } });
    return res.data?.Metadata || [];
  } catch (error) {
    console.error(`Error fetching albums for artist ${artistRatingKey}:`, error);
    throw error;
  }
};

export const getMetadata = async (ratingKey, useCache = true) => {
  try {
    const res = await api.get(`/api/plex/metadata/${ratingKey}`, { params: { useCache } });
    return res.data;
  } catch (error) {
    console.error(`Error fetching metadata for ${ratingKey}:`, error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

export const downloadTrack = async (track, albumTitle = '') => {
  try {
    if (!track.Media?.[0]?.Part?.[0]) {
      throw new Error('Track does not have valid media information');
    }

    const partKey = track.Media[0].Part[0].key;
    const artist = track.grandparentTitle || 'Unknown Artist';
    const album = albumTitle || track.parentTitle || 'Unknown Album';
    const trackNumber = track.index ? String(track.index).padStart(2, '0') : '00';
    const title = track.title || 'Unknown Track';

    const cleanString = (str) => str.replace(/[<>:"/\\|?*]/g, '_');
    const filename = `${cleanString(artist)} - ${cleanString(album)} - ${trackNumber} - ${cleanString(title)}.mp3`;

    const downloadUrl = getTrackDownloadUrl(partKey, filename);
    if (!downloadUrl) throw new Error('Unable to generate download URL');

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading track:', error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Legacy cache export (no-ops – caching is now server-side)
// ---------------------------------------------------------------------------

export const plexCache = {
  clearAllCache: async () => {
    try {
      await api.post('/api/plex/cache/clear');
    } catch (_) {}
  },
  clearCache: async () => {},
  getStorageInfo: async () => null
};
