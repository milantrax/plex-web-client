// src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useAuth } from './contexts/AuthContext';
import { initAudioDiagnostics } from './utils/audioDebug';
import queueManager from './utils/queueManager';

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

function AppShell() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    initAudioDiagnostics();
  }, []);

  const handlePlayTrack = (track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const handlePlayStateChange = useCallback((playing) => {
    setIsPlaying(playing);
  }, []);

  const handleTogglePlayback = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.togglePlayPause();
    }
  }, []);

  const handleTrackEnded = useCallback(async (endedTrack) => {
    const nextTrack = await queueManager.getNextTrack(endedTrack.ratingKey);
    if (nextTrack) {
      handlePlayTrack(nextTrack);
    } else {
      setIsPlaying(false);
    }
  }, []);

  const handlePlayNext = useCallback((nextTrack) => {
    handlePlayTrack(nextTrack);
  }, []);

  const handlePlayPrevious = useCallback((previousTrack) => {
    handlePlayTrack(previousTrack);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handleTogglePlayback();
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
  }, [handleTogglePlayback]);

  return (
    <Box className="App" sx={{ height: '100vh', position: 'relative' }}>
      <NavBar onPlayTrack={handlePlayTrack} />
      <Box component="main" sx={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
        <Routes>
          <Route path="/" element={<Library onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />} />
          <Route path="/playlists" element={<Playlists onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />} />
          <Route path="/genres" element={<Genres onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artist/:artistId" element={<ArtistPage onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />} />
          <Route path="/queue" element={<Queue onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />} />
          <Route path="/album/:albumId" element={<AlbumPage onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />} />
          <Route path="/search" element={<Search onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} onCurrentTrackChange={setCurrentTrack} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Box>
      <Player ref={playerRef} currentTrack={currentTrack} onPlayStateChange={handlePlayStateChange} onTrackEnded={handleTrackEnded} onPlayNext={handlePlayNext} onPlayPrevious={handlePlayPrevious} />
    </Box>
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
