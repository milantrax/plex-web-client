import axios from 'axios';
import type {
  CustomPlaylist,
  CustomPlaylistTrack,
  CustomPlaylistTracksResult,
  PlexTrack,
  TrackReorderEntry
} from '../types';

const api = axios.create({ withCredentials: true });

export const getCustomPlaylists = async (): Promise<CustomPlaylist[]> => {
  const res = await api.get<CustomPlaylist[]>('/api/custom-playlists');
  return res.data;
};

export const createCustomPlaylist = async (
  name: string,
  genre?: string | null
): Promise<CustomPlaylist> => {
  const res = await api.post<CustomPlaylist>('/api/custom-playlists', { name, genre: genre || null });
  return res.data;
};

export const deleteCustomPlaylist = async (
  playlistId: number | string
): Promise<{ success: boolean }> => {
  const res = await api.delete<{ success: boolean }>(`/api/custom-playlists/${playlistId}`);
  return res.data;
};

export const getCustomPlaylistTracks = async (
  playlistId: number | string
): Promise<CustomPlaylistTracksResult> => {
  const res = await api.get<CustomPlaylistTracksResult>(`/api/custom-playlists/${playlistId}/tracks`);
  return res.data;
};

export const addTrackToCustomPlaylist = async (
  playlistId: number | string,
  track: PlexTrack
): Promise<CustomPlaylistTrack> => {
  const partKey = track.Media?.[0]?.Part?.[0]?.key || null;
  const res = await api.post<CustomPlaylistTrack>(`/api/custom-playlists/${playlistId}/tracks`, {
    ratingKey: String(track.ratingKey),
    title: track.title,
    artist: track.originalTitle || track.grandparentTitle,
    album: track.parentTitle,
    duration: track.duration,
    thumb: track.thumb || track.parentThumb,
    partKey,
    parentRatingKey: track.parentRatingKey ? String(track.parentRatingKey) : null
  });
  return res.data;
};

export const removeTrackFromCustomPlaylist = async (
  playlistId: number | string,
  trackId: number | string
): Promise<{ success: boolean }> => {
  const res = await api.delete<{ success: boolean }>(`/api/custom-playlists/${playlistId}/tracks/${trackId}`);
  return res.data;
};

export const reorderCustomPlaylistTracks = async (
  playlistId: number | string,
  order: TrackReorderEntry[]
): Promise<{ success: boolean }> => {
  // order: [{ id, position }, ...]
  const res = await api.patch<{ success: boolean }>(`/api/custom-playlists/${playlistId}/tracks/reorder`, { order });
  return res.data;
};
