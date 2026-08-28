import React, { useState, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import queueManager from '../utils/queueManager';

// Split into two contexts so components that only need stable actions
// don't re-render when playback state (currentTrack/isPlaying) changes.
const PlaybackStateContext = createContext(null);
const PlaybackActionsContext = createContext(null);

export function PlaybackProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);

  const handlePlayTrack = useCallback((track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  }, []);

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
      setCurrentTrack(nextTrack);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, []);

  const handlePlayNext = useCallback((nextTrack) => {
    setCurrentTrack(nextTrack);
    setIsPlaying(true);
  }, []);

  const handlePlayPrevious = useCallback((previousTrack) => {
    setCurrentTrack(previousTrack);
    setIsPlaying(true);
  }, []);

  // Actions object is stable — all callbacks are wrapped in useCallback with no deps
  const actions = useMemo(() => ({
    onPlayTrack: handlePlayTrack,
    onTogglePlayback: handleTogglePlayback,
    onPlayStateChange: handlePlayStateChange,
    onTrackEnded: handleTrackEnded,
    onPlayNext: handlePlayNext,
    onPlayPrevious: handlePlayPrevious,
    setCurrentTrack,
    playerRef,
  }), [
    handlePlayTrack, handleTogglePlayback, handlePlayStateChange,
    handleTrackEnded, handlePlayNext, handlePlayPrevious
  ]);

  // State object changes when currentTrack or isPlaying change
  const state = useMemo(() => ({ currentTrack, isPlaying }), [currentTrack, isPlaying]);

  return (
    <PlaybackActionsContext.Provider value={actions}>
      <PlaybackStateContext.Provider value={state}>
        {children}
      </PlaybackStateContext.Provider>
    </PlaybackActionsContext.Provider>
  );
}

export function usePlaybackState() {
  const ctx = useContext(PlaybackStateContext);
  if (!ctx) throw new Error('usePlaybackState must be used within PlaybackProvider');
  return ctx;
}

export function usePlaybackActions() {
  const ctx = useContext(PlaybackActionsContext);
  if (!ctx) throw new Error('usePlaybackActions must be used within PlaybackProvider');
  return ctx;
}

// Convenience hook — use in page components that need both state and actions
export function usePlayback() {
  return { ...usePlaybackState(), ...usePlaybackActions() };
}
