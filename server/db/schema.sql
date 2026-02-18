CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  plex_url TEXT,
  plex_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

CREATE TABLE IF NOT EXISTS playlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  genre VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  id SERIAL PRIMARY KEY,
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  rating_key VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  artist VARCHAR(255),
  album VARCHAR(255),
  duration INTEGER,
  thumb VARCHAR(512),
  part_key VARCHAR(512),
  parent_rating_key VARCHAR(255),
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(playlist_id, rating_key)
);

ALTER TABLE playlist_tracks ADD COLUMN IF NOT EXISTS parent_rating_key VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('album', 'artist', 'playlist', 'track')),
  rating_key VARCHAR(255) NOT NULL,
  title VARCHAR(500),
  thumb VARCHAR(1000),
  subtitle VARCHAR(500),
  year INTEGER,
  duration INTEGER,
  part_key VARCHAR(1000),
  parent_rating_key VARCHAR(255),
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, type, rating_key)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- Library cache tables
CREATE TABLE IF NOT EXISTS library_albums (
  id SERIAL PRIMARY KEY,
  plex_url_hash VARCHAR(64) NOT NULL,
  section_key VARCHAR(50) NOT NULL,
  rating_key VARCHAR(255) NOT NULL,
  title VARCHAR(500),
  title_sort VARCHAR(500),
  artist VARCHAR(500),
  artist_sort VARCHAR(500),
  year INTEGER,
  studio VARCHAR(255),
  thumb VARCHAR(1000),
  genres TEXT[],
  data JSONB NOT NULL,
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(plex_url_hash, rating_key)
);

CREATE INDEX IF NOT EXISTS idx_library_albums_hash_section
  ON library_albums(plex_url_hash, section_key);
CREATE INDEX IF NOT EXISTS idx_library_albums_sort
  ON library_albums(plex_url_hash, section_key, artist_sort, title_sort);
CREATE INDEX IF NOT EXISTS idx_library_albums_year
  ON library_albums(plex_url_hash, section_key, year);
CREATE INDEX IF NOT EXISTS idx_library_albums_studio
  ON library_albums(plex_url_hash, section_key, studio);
CREATE INDEX IF NOT EXISTS idx_library_albums_genres
  ON library_albums USING GIN(genres);

CREATE TABLE IF NOT EXISTS library_sync_status (
  id SERIAL PRIMARY KEY,
  plex_url_hash VARCHAR(64) NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'idle',
  total_albums INTEGER DEFAULT 0,
  synced_albums INTEGER DEFAULT 0,
  last_synced_at TIMESTAMP,
  started_at TIMESTAMP,
  error_message TEXT
);
