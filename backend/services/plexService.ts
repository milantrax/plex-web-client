import axios, { type AxiosInstance } from 'axios';
import type {
  ConnectionTestResult,
  FilterEntry,
  PlexDirectory,
  PlexMediaContainer,
  PlexMetadata,
  PlexResponse
} from '../types';

export interface PagingOptions {
  type?: number;
  start?: number;
  size?: number | null;
}

/** The query parameters sent to a Plex `/all` listing. */
type PlexListParams = Record<string, string | number>;

export function createPlexClient(plexUrl: string, plexToken: string): AxiosInstance {
  return axios.create({
    baseURL: plexUrl,
    headers: {
      'Accept': 'application/json',
      'X-Plex-Token': plexToken
    },
    timeout: 15000
  });
}

export async function testConnection(plexUrl: string, plexToken: string): Promise<ConnectionTestResult> {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get<PlexResponse>('/');
  const container = response.data?.MediaContainer || {};
  return {
    success: true,
    serverName: (container.friendlyName as string) || 'Unknown',
    version: (container.version as string) || 'Unknown'
  };
}

export async function getSections(plexUrl: string, plexToken: string): Promise<PlexDirectory[]> {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get<PlexResponse>('/library/sections');
  return response.data?.MediaContainer?.Directory || [];
}

export async function getSectionItems(
  plexUrl: string,
  plexToken: string,
  sectionId: string,
  { type = 9, start = 0, size = null }: PagingOptions = {}
): Promise<PlexMediaContainer> {
  const client = createPlexClient(plexUrl, plexToken);
  const params: PlexListParams = { type };
  if (start > 0) params['X-Plex-Container-Start'] = start;
  if (size) params['X-Plex-Container-Size'] = size;
  const response = await client.get<PlexResponse>(`/library/sections/${sectionId}/all`, { params });
  return response.data?.MediaContainer || {};
}

export async function getAlbumTracks(
  plexUrl: string,
  plexToken: string,
  albumRatingKey: string
): Promise<PlexMediaContainer> {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get<PlexResponse>(`/library/metadata/${albumRatingKey}/children`);
  return response.data?.MediaContainer || {};
}

export async function getArtists(
  plexUrl: string,
  plexToken: string,
  sectionId: string,
  { start = 0, size = null }: Omit<PagingOptions, 'type'> = {}
): Promise<PlexMediaContainer> {
  const client = createPlexClient(plexUrl, plexToken);
  const params: PlexListParams = { type: 8 };
  if (start > 0) params['X-Plex-Container-Start'] = start;
  if (size) params['X-Plex-Container-Size'] = size;
  const response = await client.get<PlexResponse>(`/library/sections/${sectionId}/all`, { params });
  return response.data?.MediaContainer || {};
}

export async function getArtistAlbums(
  plexUrl: string,
  plexToken: string,
  artistRatingKey: string
): Promise<PlexMediaContainer> {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get<PlexResponse>(`/library/metadata/${artistRatingKey}/children`);
  return response.data?.MediaContainer || {};
}

export async function getPlaylists(plexUrl: string, plexToken: string): Promise<PlexMetadata[]> {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get<PlexResponse>('/playlists', { params: { playlistType: 'audio' } });
  return response.data?.MediaContainer?.Metadata || [];
}

export async function getPlaylistItems(
  plexUrl: string,
  plexToken: string,
  playlistRatingKey: string
): Promise<PlexMediaContainer> {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get<PlexResponse>(`/playlists/${playlistRatingKey}/items`);
  return response.data?.MediaContainer || {};
}

export async function getGenres(
  plexUrl: string,
  plexToken: string,
  sectionId: string,
  type = 9
): Promise<PlexDirectory[] | FilterEntry[]> {
  const client = createPlexClient(plexUrl, plexToken);
  try {
    const response = await client.get<PlexResponse>(`/library/sections/${sectionId}/genre`, { params: { type } });
    const genres = response.data?.MediaContainer?.Directory || [];
    if (genres.length > 0) return genres;
  } catch (err) {
    // Fall through to extraction fallback
  }

  // Fallback: extract genres from all albums
  const response = await client.get<PlexResponse>(`/library/sections/${sectionId}/all`, { params: { type } });
  const items = response.data?.MediaContainer?.Metadata || [];
  const genreMap = new Map<string, FilterEntry>();
  items.forEach(item => {
    (item.Genre || []).forEach(g => {
      const tag = g.tag as string;
      if (!genreMap.has(tag)) {
        genreMap.set(tag, { key: g.id || tag, title: tag, count: 0 });
      }
      genreMap.get(tag)!.count!++;
    });
  });
  return Array.from(genreMap.values()).sort((a, b) => a.title.localeCompare(b.title));
}

export async function getAlbumsByGenre(
  plexUrl: string,
  plexToken: string,
  sectionId: string,
  genreId: string,
  type = 9
): Promise<PlexMediaContainer> {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get<PlexResponse>(`/library/sections/${sectionId}/all`, {
    params: { type, genre: genreId }
  });
  return response.data?.MediaContainer || {};
}

export async function getYears(
  plexUrl: string,
  plexToken: string,
  sectionId: string,
  type = 9
): Promise<PlexDirectory[] | FilterEntry[]> {
  const client = createPlexClient(plexUrl, plexToken);
  try {
    const response = await client.get<PlexResponse>(`/library/sections/${sectionId}/year`, { params: { type } });
    const years = response.data?.MediaContainer?.Directory || [];
    if (years.length > 0) return years;
  } catch (err) {
    // Fall through to extraction fallback
  }

  const response = await client.get<PlexResponse>(`/library/sections/${sectionId}/all`, { params: { type } });
  const items = response.data?.MediaContainer?.Metadata || [];
  const yearSet = new Set<number>();
  items.forEach(item => { if (item.year) yearSet.add(Number(item.year)); });
  return Array.from(yearSet)
    .sort((a, b) => b - a)
    .map(y => ({ key: y, title: String(y) }));
}

export async function getAlbumsByYear(
  plexUrl: string,
  plexToken: string,
  sectionId: string,
  year: string,
  type = 9
): Promise<PlexMediaContainer> {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get<PlexResponse>(`/library/sections/${sectionId}/all`, {
    params: { type, year }
  });
  return response.data?.MediaContainer || {};
}

export async function getLabels(
  plexUrl: string,
  plexToken: string,
  sectionId: string,
  type = 9
): Promise<PlexDirectory[] | FilterEntry[]> {
  const client = createPlexClient(plexUrl, plexToken);
  try {
    const response = await client.get<PlexResponse>(`/library/sections/${sectionId}/studio`, { params: { type } });
    const labels = response.data?.MediaContainer?.Directory || [];
    if (labels.length > 0) return labels;
  } catch (err) {
    // Fall through to extraction fallback
  }

  const response = await client.get<PlexResponse>(`/library/sections/${sectionId}/all`, { params: { type } });
  const items = response.data?.MediaContainer?.Metadata || [];
  const labelSet = new Set<string>();
  items.forEach(item => { if (item.studio) labelSet.add(item.studio); });
  return Array.from(labelSet)
    .sort()
    .map(l => ({ key: l, title: l }));
}

export async function getAlbumsByLabel(
  plexUrl: string,
  plexToken: string,
  sectionId: string,
  label: string,
  type = 9
): Promise<PlexMediaContainer> {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get<PlexResponse>(`/library/sections/${sectionId}/all`, {
    params: { type, studio: label }
  });
  return response.data?.MediaContainer || {};
}

export async function searchMusic(
  plexUrl: string,
  plexToken: string,
  sectionId: string,
  query: string,
  type: number
): Promise<PlexMetadata[]> {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get<PlexResponse>(`/library/sections/${sectionId}/search`, {
    params: { type, query }
  });
  return response.data?.MediaContainer?.Metadata || [];
}

export async function getMetadata(
  plexUrl: string,
  plexToken: string,
  ratingKey: string
): Promise<PlexMetadata | null> {
  const client = createPlexClient(plexUrl, plexToken);
  const response = await client.get<PlexResponse>(`/library/metadata/${ratingKey}`);
  return response.data?.MediaContainer?.Metadata?.[0] || null;
}
