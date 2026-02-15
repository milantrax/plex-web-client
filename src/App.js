// src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import NavBar from './components/NavBar';
import Player from './components/Player';
import Library from './pages/Library';
import Playlists from './pages/Playlists';
import Genres from './pages/Genres';
import Queue from './pages/Queue';
import AlbumPage from './pages/AlbumPage';
import Search from './pages/Search';
import Settings from './pages/Settings';
import { initAudioDiagnostics } from './utils/audioDebug';
import queueManager from './utils/queueManager';
import { NAVBAR_HEIGHT, PLAYER_HEIGHT } from './theme/theme';

function App() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    initAudioDiagnostics();
  }, []);

  const handlePlayTrack = (track) => {
    console.log("Track selected in App:", track);
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const handlePlayStateChange = useCallback((playing) => {
    console.log('App: Play state changed to:', playing);
    setIsPlaying(playing);
  }, []);

  const handleTogglePlayback = useCallback(() => {
    console.log('App handleTogglePlayback called');
    if (playerRef.current) {
      playerRef.current.togglePlayPause();
    }
  }, []);

  const handleTrackEnded = useCallback((endedTrack) => {
    console.log('Track ended:', endedTrack);

    const nextTrack = queueManager.getNextTrack(endedTrack.ratingKey);

    if (nextTrack) {
      console.log('Playing next track from queue:', nextTrack);
      handlePlayTrack(nextTrack);
    } else {
      console.log('No next track in queue, playback stopped');
      setIsPlaying(false);
    }
  }, []);

  const handlePlayNext = useCallback((nextTrack) => {
    console.log('Manually playing next track:', nextTrack);
    handlePlayTrack(nextTrack);
  }, []);

  const handlePlayPrevious = useCallback((previousTrack) => {
    console.log('Manually playing previous track:', previousTrack);
    handlePlayTrack(previousTrack);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handleTogglePlayback();
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            e.preventDefault();
            if (playerRef.current) {
              playerRef.current.playNext();
            }
          }
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            e.preventDefault();
            if (playerRef.current) {
              playerRef.current.playPrevious();
            }
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleTogglePlayback]);

  return (
    <Router>
      <Box className="App" sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <NavBar onPlayTrack={handlePlayTrack} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: `calc(100vh - ${NAVBAR_HEIGHT}px - ${PLAYER_HEIGHT}px)`,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <Routes>
            <Route path="/" element={<Library onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />} />
            <Route path="/playlists" element={<Playlists onPlayTrack={handlePlayTrack} />} />
            <Route path="/genres" element={<Genres onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />} />
            <Route path="/queue" element={<Queue onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />} />
            <Route path="/album/:albumId" element={<AlbumPage onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />} />
            <Route path="/search" element={<Search onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} onCurrentTrackChange={setCurrentTrack} />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
        <Player ref={playerRef} currentTrack={currentTrack} onPlayStateChange={handlePlayStateChange} onTrackEnded={handleTrackEnded} onPlayNext={handlePlayNext} onPlayPrevious={handlePlayPrevious} />
      </Box>
    </Router>
  );
}

export default App;
