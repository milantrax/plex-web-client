// Shared domain types for the Plex web client.
//
// Plex returns loosely-shaped metadata objects and the app spreads them around
// freely (e.g. `{ ...track, ...extra }`), so the media types keep an index
// signature: every field the app actually reads is declared and typed, while
// unknown extras stay allowed rather than forcing casts at every spread site.

/** A tag entry (`Genre`, `Mood`, `Style`, …) on a Plex metadata item. */
export interface PlexTag {
  id?: number;
  tag?: string;
  filter?: string;
  [key: string]: unknown;
}

export interface PlexPart {
  id?: number;
  key?: string;
  duration?: number;
  file?: string;
  size?: number;
  container?: string;
  [key: string]: unknown;
}

export interface PlexMedia {
  id?: number;
  duration?: number;
  bitrate?: number;
  audioCodec?: string;
  container?: string;
  Part?: PlexPart[];
  [key: string]: unknown;
}

/** Fields common to every Plex metadata item (artist, album, track, playlist). */
export interface PlexMetadataBase {
  ratingKey: string;
  key?: string;
  guid?: string;
  type?: string;
  title?: string | null;
  titleSort?: string;
  summary?: string;
  thumb?: string | null;
  art?: string;
  addedAt?: number;
  updatedAt?: number;
  index?: number;
  year?: number | null;
  duration?: number | null;
  /** 0-10 scale, as Plex stores it. */
  rating?: number;
  userRating?: number;
  [key: string]: unknown;
}

export interface PlexArtist extends PlexMetadataBase {
  /** Present when the artist was returned as part of an album/track payload. */
  parentTitle?: string;
}

export interface PlexAlbum extends PlexMetadataBase {
  /** Artist name. */
  parentTitle?: string | null;
  parentRatingKey?: string | null;
  parentThumb?: string | null;
  parentKey?: string;
  originalTitle?: string | null;
  leafCount?: number;
  viewedLeafCount?: number;
  studio?: string;
  Genre?: PlexTag[];
  /** Comma-separated genre list, on payloads that don't carry `Genre`. */
  genre?: string;
  /** Set by the search page for albums matched through their tracks. */
  matchingTracks?: PlexTrack[];
  /** How the album matched a search: 'album' or 'track'. */
  matchType?: string;
  /** Title of the track that caused a 'track' match. */
  matchingTrack?: string;
}

/** The settings page broadcasts album card width changes on `window`. */
export interface AlbumCardWidthChangedEvent extends CustomEvent<{ width: number }> {}

declare global {
  interface WindowEventMap {
    albumCardWidthChanged: AlbumCardWidthChangedEvent;
  }
}

export interface PlexTrack extends PlexMetadataBase {
  /** Album title. */
  parentTitle?: string | null;
  parentRatingKey?: string | null;
  parentThumb?: string | null;
  parentKey?: string;
  parentYear?: number;
  /** Album artist name. */
  grandparentTitle?: string | null;
  grandparentRatingKey?: string;
  grandparentThumb?: string;
  grandparentKey?: string;
  /** Track artist, when it differs from the album artist. */
  originalTitle?: string;
  Media?: PlexMedia[];
}

export interface PlexPlaylist extends PlexMetadataBase {
  playlistType?: string;
  smart?: boolean;
  leafCount?: number;
  composite?: string;
}

export interface PlexSection {
  key: string;
  title: string;
  type: string;
  scanner?: string;
  agent?: string;
  [key: string]: unknown;
}

/** A `Directory` entry from a genre / year / label filter listing. */
export interface PlexFilterDirectory {
  /** Present on the database-backed listings; absent on raw Plex payloads. */
  id?: string | number;
  key: string;
  title: string;
  /** The value to filter by; genres and labels carry one, years do not. */
  tag?: string;
  fastKey?: string;
  type?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// App API payloads
// ---------------------------------------------------------------------------

export interface SearchResults {
  albums: PlexAlbum[];
  tracks: PlexTrack[];
}

export interface PlaylistItemsResult {
  title: string | null;
  tracks: PlexTrack[];
}

export interface LibrarySyncStatus {
  status: string;
  syncedAlbums: number;
  totalAlbums: number;
  lastSyncedAt: string | null;
  startedAt?: string | null;
  errorMessage?: string | null;
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

/** MUI Alert severities, kept local so pages don't each import from @mui. */
export type SnackbarSeverity = 'success' | 'info' | 'warning' | 'error';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** The user shape the auth API returns to the client (camelCase, token masked). */
export interface User {
  id: number;
  username: string;
  email?: string | null;
  plexUrl?: string | null;
  /** Masked placeholder ('••••••••') when a token is set, otherwise null. */
  plexToken?: string | null;
  hasCustomPlex?: boolean;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export type FavoriteType = 'track' | 'album' | 'artist' | 'playlist';

/** A favorite row as stored and returned by the backend (snake_case). */
export interface Favorite {
  id?: number;
  type: FavoriteType | string;
  rating_key: string;
  title?: string | null;
  thumb?: string | null;
  subtitle?: string | null;
  year?: number | null;
  duration?: number | null;
  part_key?: string | null;
  parent_rating_key?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

/** The camelCase payload sent when creating a favorite. */
export interface FavoritePayload {
  type: FavoriteType | string;
  ratingKey: string;
  title?: string | null;
  thumb?: string | null;
  subtitle?: string | null;
  year?: number | null;
  duration?: number | null;
  partKey?: string | null;
  parentRatingKey?: string | null;
}

/** The item shape accepted by `toggleFavorite`. */
export interface FavoriteInput {
  ratingKey: string | number;
  title?: string | null;
  thumb?: string | null;
  subtitle?: string | null;
  year?: number | null;
  duration?: number | null;
  partKey?: string | null;
  parentRatingKey?: string | number | null;
}

// ---------------------------------------------------------------------------
// Custom playlists
// ---------------------------------------------------------------------------

export interface CustomPlaylist {
  id: number;
  name: string;
  genre: string | null;
  track_count?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CustomPlaylistTrack {
  id: number;
  playlist_id?: number;
  rating_key: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  duration: number | null;
  thumb: string | null;
  part_key: string | null;
  parent_rating_key: string | null;
  position: number;
  [key: string]: unknown;
}

/**
 * A custom-playlist row rebuilt into a playable Plex track. `_customTrackId` is
 * the playlist-row id, used as the drag-and-drop key and reorder identifier.
 */
export interface CustomPlaylistPlexTrack extends PlexTrack {
  _customTrackId: number;
}

/** Response of GET /api/custom-playlists/:id/tracks. */
export interface CustomPlaylistTracksResult {
  playlist: Pick<CustomPlaylist, 'id' | 'name' | 'genre'>;
  tracks: CustomPlaylistTrack[];
}

export interface TrackReorderEntry {
  id: number;
  position: number;
}

// ---------------------------------------------------------------------------
// Playback queue
// ---------------------------------------------------------------------------

/** The album context stored alongside a queued track. */
export interface QueueAlbum {
  title?: string | null;
  artist?: string | null;
  thumb?: string | null;
  ratingKey?: string;
  year?: number | null;
}

/** Album-ish input accepted when queueing tracks. */
export interface QueueAlbumInput {
  title?: string | null;
  parentTitle?: string | null;
  artist?: string | null;
  thumb?: string | null;
  ratingKey?: string;
  year?: number | null;
  [key: string]: unknown;
}

export interface QueueItem {
  id: number;
  addedAt: string;
  track: PlexTrack;
  album: QueueAlbum | null;
}

export interface QueueStats {
  totalTracks: number;
  totalDuration: number;
  totalDurationFormatted: string;
}

export interface AddMultipleResult {
  success: boolean;
  addedCount: number;
  skippedCount: number;
}
