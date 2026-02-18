// src/App.js
import React, { useEffect, useRef, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import NavBar from './components/NavBar';
import Player from './components/Player';
import Library from './pages/Library';
import Playlists from './pages/Playlists';
import Genres from './pages/Genres';
import Artists from './pages/Artists';
import Queue from './pages/Queue';
import AlbumPage from './pages/AlbumPage';
import ArtistPage from './pages/ArtistPage';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import Favorites, { FavoriteAlbums, FavoriteArtists, FavoritePlaylists, FavoriteTracks } from './pages/Favorites';
import { useAuth } from './contexts/AuthContext';
import { PlaybackProvider, usePlaybackActions, usePlaybackState } from './contexts/PlaybackContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { initAudioDiagnostics } from './utils/audioDebug';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Renders the Player, consuming playback state+actions from context.
// Re-renders when currentTrack or isPlaying change — correct behaviour.
function PlayerWrapper() {
  const { currentTrack } = usePlaybackState();
  const { playerRef, onPlayStateChange, onTrackEnded, onPlayNext, onPlayPrevious } = usePlaybackActions();
  return (
    <Player
      ref={playerRef}
      currentTrack={currentTrack}
      onPlayStateChange={onPlayStateChange}
      onTrackEnded={onTrackEnded}
      onPlayNext={onPlayNext}
      onPlayPrevious={onPlayPrevious}
    />
  );
}

// Adapts the class-based Search component to receive playback props from context.
function SearchWrapper() {
  const { currentTrack, isPlaying } = usePlaybackState();
  const { onPlayTrack, onTogglePlayback, setCurrentTrack } = usePlaybackActions();
  return (
    <Search
      currentTrack={currentTrack}
      isPlaying={isPlaying}
      onPlayTrack={onPlayTrack}
      onTogglePlayback={onTogglePlayback}
      onCurrentTrackChange={setCurrentTrack}
    />
  );
}

// Memoized shell — only consumes stable actions, so it never re-renders
// when currentTrack or isPlaying change. Pages re-render via their own
// usePlayback() subscriptions, not via parent propagation.
const AppShellCore = memo(function AppShellCore() {
  const { onTogglePlayback, playerRef } = usePlaybackActions();

  useEffect(() => {
    initAudioDiagnostics();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          onTogglePlayback();
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            e.preventDefault();
            if (playerRef.current) playerRef.current.playNext();
          }
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            e.preventDefault();
            if (playerRef.current) playerRef.current.playPrevious();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [onTogglePlayback, playerRef]);

  return (
    <Box className="App" sx={{ height: '100vh', position: 'relative' }}>
      <NavBar />
      <Box component="main" sx={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/genres" element={<Genres />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artist/:artistId" element={<ArtistPage />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/album/:albumId" element={<AlbumPage />} />
          <Route path="/search" element={<SearchWrapper />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/favorites" element={<Favorites />}>
            <Route index element={<Navigate to="albums" replace />} />
            <Route path="albums" element={<FavoriteAlbums />} />
            <Route path="artists" element={<FavoriteArtists />} />
            <Route path="playlists" element={<FavoritePlaylists />} />
            <Route path="tracks" element={<FavoriteTracks />} />
          </Route>
        </Routes>
      </Box>
      <PlayerWrapper />
    </Box>
  );
});

function AppShell() {
  return (
    <PlaybackProvider>
      <FavoritesProvider>
        <AppShellCore />
      </FavoritesProvider>
    </PlaybackProvider>
  );
}

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
