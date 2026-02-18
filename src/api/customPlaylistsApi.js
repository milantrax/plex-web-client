import axios from 'axios';

const api = axios.create({ withCredentials: true });

export const getCustomPlaylists = async () => {
  const res = await api.get('/api/custom-playlists');
  return res.data;
};

export const createCustomPlaylist = async (name, genre) => {
  const res = await api.post('/api/custom-playlists', { name, genre: genre || null });
  return res.data;
};

export const deleteCustomPlaylist = async (playlistId) => {
  const res = await api.delete(`/api/custom-playlists/${playlistId}`);
  return res.data;
};

export const getCustomPlaylistTracks = async (playlistId) => {
  const res = await api.get(`/api/custom-playlists/${playlistId}/tracks`);
  return res.data;
};

export const addTrackToCustomPlaylist = async (playlistId, track) => {
  const partKey = track.Media?.[0]?.Part?.[0]?.key || null;
  const res = await api.post(`/api/custom-playlists/${playlistId}/tracks`, {
    ratingKey: String(track.ratingKey),
    title: track.title,
    artist: track.originalTitle || track.grandparentTitle,
    album: track.parentTitle,
    duration: track.duration,
    thumb: track.thumb || track.parentThumb,
    partKey
  });
  return res.data;
};

export const removeTrackFromCustomPlaylist = async (playlistId, trackId) => {
  const res = await api.delete(`/api/custom-playlists/${playlistId}/tracks/${trackId}`);
  return res.data;
};

export const reorderCustomPlaylistTracks = async (playlistId, order) => {
  // order: [{ id, position }, ...]
  const res = await api.patch(`/api/custom-playlists/${playlistId}/tracks/reorder`, { order });
  return res.data;
};
