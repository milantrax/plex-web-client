# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React-based web client for streaming music from a local Plex Media Server. The application allows users to browse their music library, manage playlists, explore genres, and enjoy seamless audio playback with an intuitive interface.

## Development Commands

### Start Development Server
```bash
npm start
```
Opens the app at http://localhost:3000 with hot reload enabled.

### Run Tests
```bash
npm test
```
Launches the test runner in interactive watch mode.

### Build for Production
```bash
npm run build
```
Builds the app for production to the `build` folder. The build is optimized and minified.

## Environment Configuration

This application requires a `.env` file in the project root with the following variables:

```env
REACT_APP_PLEX_URL=http://your-plex-server-ip:32400
REACT_APP_PLEX_TOKEN=your-plex-token-here
```

**Important**:
- The `.env` file is gitignored and should never be committed
- The development server must be restarted after creating or modifying `.env`
- Configuration is validated in `src/config.js` and will show an alert if missing

## Architecture Overview

### Core Application Structure

The application follows a standard React architecture with the following key components:

1. **App Component (`src/App.js`)** - The root component that:
   - Manages global playback state (currentTrack, isPlaying)
   - Implements keyboard shortcuts (Space for play/pause, Shift+Arrow for next/prev)
   - Coordinates communication between pages and the Player component
   - Uses React Router for navigation

2. **Player Component (`src/components/Player.js`)** - The audio player that:
   - Uses forwardRef to expose playback controls to the App component
   - Handles audio playback via the HTML5 audio element
   - Automatically falls back to transcoding if direct playback fails
   - Integrates with queueManager for next/previous track navigation
   - Shows progress bar, track info, and playback controls

3. **Queue Manager (`src/utils/queueManager.js`)** - A singleton class that:
   - Manages the playback queue using localStorage persistence
   - Provides methods for adding, removing, and navigating tracks
   - Tracks queue statistics (total tracks, duration)
   - Used by Player component for next/previous navigation

### Page Components

Located in `src/pages/`:
- **Library.js** - Main music library view with pagination and filtering
- **AlbumPage.js** - Detailed album view with track listing
- **Playlists.js** - Browse and play Plex playlists
- **Genres.js** - Browse music by genre
- **Search.js** - Search across albums and tracks
- **Queue.js** - View and manage the playback queue
- **Settings.js** - User preferences and cache management

### Plex API Integration (`src/api/plexApi.js`)

A comprehensive API layer that:
- Uses axios for HTTP requests with Plex token authentication
- Implements localStorage caching with configurable expiration times
- Exports `plexCache` helpers for cache management
- Provides URL generators for images, audio, and transcoding
- Handles search across music sections
- Includes fallback logic for genre/year/label extraction when direct endpoints fail

**Key API Functions**:
- `getSections()` - Get library sections
- `getSectionItems(sectionId, type, start, size)` - Get items with pagination
- `getAlbumTracks(albumRatingKey)` - Get tracks for an album
- `getPlaylists()` - Get audio playlists
- `getGenres(sectionId)` - Get genres (with fallback to manual extraction)
- `getAlbumsByGenre(sectionId, genreId)` - Filter albums by genre
- `searchMusic(query, options)` - Search albums and tracks
- `getPlexImageUrl(thumbPath)` - Generate authenticated image URLs
- `getPlexAudioUrl(partKey)` - Generate direct audio URLs
- `getPlexTranscodeUrl(partKey)` - Generate transcoding URLs

### State Management

The application uses React hooks and props for state management:
- **App.js** maintains global playback state (currentTrack, isPlaying)
- **queueManager** singleton handles queue state in localStorage
- **plexCache** helpers manage API cache in localStorage
- Each page component manages its own local state (loading, filters, pagination)

### Data Flow

```
User Action → Page Component → API Call (plexApi) → Cache Check
                ↓                                         ↓
         onPlayTrack callback                    localStorage or Network
                ↓                                         ↓
         App.js setCurrentTrack                  Return Data to Page
                ↓
         Player Component receives currentTrack
                ↓
         Audio element plays track
```

### Styling

- All styles are in SCSS format located in `src/styles/`
- Each component/page has its own dedicated SCSS file
- Global styles in `src/index.scss`

## Key Implementation Details

### Keyboard Shortcuts

Implemented in `App.js` via `keydown` event listener:
- **Space**: Play/Pause (skipped when focus is in INPUT/TEXTAREA)
- **Shift + Right Arrow**: Next track
- **Shift + Left Arrow**: Previous track

### Audio Playback Flow

1. Track is selected via `onPlayTrack` callback
2. App.js updates `currentTrack` state
3. Player component receives new track via props
4. Player attempts direct playback via `getPlexAudioUrl()`
5. If direct playback fails, automatically retries with `getPlexTranscodeUrl()`
6. Player provides imperative API (togglePlayPause, playNext, playPrevious) via forwardRef

### Queue Management

- Queue is stored in localStorage with key `plex_playback_queue`
- Each queue item contains: track data, album metadata, timestamp
- Queue operations: add, remove, move, clear
- Player uses queue for next/previous track navigation
- Queue page allows manual reordering and track removal

### Caching Strategy

All Plex API responses are cached in localStorage:
- Default expiration: 60 minutes
- Albums: 120 minutes
- Tracks: 240 minutes
- Playlists: 30 minutes
- Search results: 30 minutes

Cache can be cleared via:
- Settings page UI
- `plexCache.clearAllCache()` - Clear all Plex cache
- `plexCache.clearCache(type, id)` - Clear specific cache type

### Error Handling

- Missing `.env` configuration shows alert on app load
- Audio playback errors trigger automatic transcode fallback
- API errors are logged to console with descriptive messages
- Genre/year/label endpoints have fallback logic to extract from album metadata

## Tech Stack

- **React 19.1.0** with hooks
- **React Router DOM 7.4.1** for routing
- **Axios 1.8.4** for HTTP requests
- **MUI** for UI
- **Create React App 5.0.1** tooling
- **Testing Library** for component tests

## Testing

The project uses React Testing Library and Jest (via Create React App):
- Test files follow the `*.test.js` convention
- Setup configured in `src/setupTests.js`
- Run tests with `npm test`

## Code style
Do not comment every line of code!!!
- Comment only main functions, explaining purpose, input parameters, output parameters


