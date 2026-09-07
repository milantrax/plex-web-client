// Shared types for the API server.
//
// Plex returns loosely-shaped metadata, and the routes forward most of it to
// the client untouched, so the Plex types declare the fields this server reads
// and keep an index signature for everything it merely passes through.

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    /** Set by the auth routes on a successful login or registration. */
    userId: number;
  }
}

// ---------------------------------------------------------------------------
// Plex payloads
// ---------------------------------------------------------------------------

/** A tag entry (`Genre`, `Mood`, `Style`, …) on a Plex metadata item. */
export interface PlexTag {
  id?: number;
  tag?: string;
  [key: string]: unknown;
}

export interface PlexPart {
  id?: number;
  key?: string;
  [key: string]: unknown;
}

export interface PlexMedia {
  id?: number;
  Part?: PlexPart[];
  [key: string]: unknown;
}

/** A metadata item: artist, album, track or playlist. */
export interface PlexMetadata {
  ratingKey: string;
  key?: string;
  type?: string;
  title?: string;
  titleSort?: string;
  parentTitle?: string;
  parentTitleSort?: string;
  parentRatingKey?: string;
  grandparentTitle?: string;
  thumb?: string;
  year?: number | string;
  studio?: string;
  duration?: number;
  Genre?: PlexTag[];
  Media?: PlexMedia[];
  [key: string]: unknown;
}

/** A `Directory` entry: a library section, or a genre / year / label filter. */
export interface PlexDirectory {
  key: string;
  title: string;
  type?: string;
  [key: string]: unknown;
}

/** The `MediaContainer` Plex wraps every response in. */
export interface PlexMediaContainer {
  size?: number;
  totalSize?: number;
  title?: string;
  friendlyName?: string;
  version?: string;
  Metadata?: PlexMetadata[];
  Directory?: PlexDirectory[];
  [key: string]: unknown;
}

export interface PlexResponse {
  MediaContainer?: PlexMediaContainer;
}

/** The normalised filter entry the genre / year / label endpoints return. */
export interface FilterEntry {
  id?: string | number;
  key: string | number;
  title: string;
  tag?: string;
  count?: number;
}

export interface ConnectionTestResult {
  success: boolean;
  serverName?: string;
  version?: string;
  error?: string;
}

export interface SearchResults {
  albums: PlexMetadata[];
  tracks: PlexMetadata[];
}

/** An album from a search, carrying the tracks that matched the query. */
export interface AlbumWithMatchingTracks extends PlexMetadata {
  matchingTracks: PlexMetadata[];
}

// ---------------------------------------------------------------------------
// Database rows
// ---------------------------------------------------------------------------

export interface UserRow {
  id: number;
  username: string;
  email: string | null;
  password_hash: string;
  plex_url: string | null;
  plex_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlexCredentials {
  plexUrl: string;
  plexToken: string;
}

export interface LibrarySyncStatusRow {
  plex_url_hash: string;
  user_id: number;
  status: 'syncing' | 'done' | 'error' | string;
  started_at: string | null;
  last_synced_at: string | null;
  synced_albums: number;
  total_albums: number;
  error_message: string | null;
}

export interface PlaylistTrackRow {
  id: number;
  playlist_id: number;
  rating_key: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  duration: number | null;
  thumb: string | null;
  part_key: string | null;
  parent_rating_key: string | null;
  position: number;
  added_at: string;
}

export interface CustomPlaylistRow {
  id: number;
  user_id: number;
  name: string;
  genre: string | null;
  created_at: string;
  updated_at: string;
}

/** One entry of the PATCH .../tracks/reorder body. */
export interface TrackReorderEntry {
  id: number;
  position: number;
}
