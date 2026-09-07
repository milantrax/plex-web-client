import React, { useState, useRef, useCallback, useMemo, createContext, useContext, ReactNode, RefObject, Dispatch, SetStateAction } from 'react';
import queueManager from '../utils/queueManager';
import type { PlexTrack } from '../types';
import type { PlayerHandle } from '../components/Player';

export interface PlaybackState {
  currentTrack: PlexTrack | null;
  isPlaying: boolean;
}

export interface PlaybackActions {
  onPlayTrack: (track: PlexTrack) => void;
  onTogglePlayback: () => void;
  onPlayStateChange: (playing: boolean) => void;
  onTrackEnded: (endedTrack: PlexTrack) => Promise<void>;
  onPlayNext: (nextTrack: PlexTrack) => void;
  onPlayPrevious: (previousTrack: PlexTrack) => void;
  setCurrentTrack: Dispatch<SetStateAction<PlexTrack | null>>;
  playerRef: RefObject<PlayerHandle | null>;
}

// Split into two contexts so components that only need stable actions
// don't re-render when playback state (currentTrack/isPlaying) changes.
const PlaybackStateContext = createContext<PlaybackState | null>(null);
const PlaybackActionsContext = createContext<PlaybackActions | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlexTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<PlayerHandle | null>(null);

  const handlePlayTrack = useCallback((track: PlexTrack) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  }, []);

  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const handleTogglePlayback = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.togglePlayPause();
    }
  }, []);

  const handleTrackEnded = useCallback(async (endedTrack: PlexTrack) => {
    const nextTrack = await queueManager.getNextTrack(endedTrack.ratingKey);
    if (nextTrack) {
      setCurrentTrack(nextTrack);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, []);

  const handlePlayNext = useCallback((nextTrack: PlexTrack) => {
    setCurrentTrack(nextTrack);
    setIsPlaying(true);
  }, []);

  const handlePlayPrevious = useCallback((previousTrack: PlexTrack) => {
    setCurrentTrack(previousTrack);
    setIsPlaying(true);
  }, []);

  // Actions object is stable — all callbacks are wrapped in useCallback with no deps
  const actions = useMemo<PlaybackActions>(() => ({
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
  const state = useMemo<PlaybackState>(() => ({ currentTrack, isPlaying }), [currentTrack, isPlaying]);

  return (
    <PlaybackActionsContext.Provider value={actions}>
      <PlaybackStateContext.Provider value={state}>
        {children}
      </PlaybackStateContext.Provider>
    </PlaybackActionsContext.Provider>
  );
}

export function usePlaybackState(): PlaybackState {
  const ctx = useContext(PlaybackStateContext);
  if (!ctx) throw new Error('usePlaybackState must be used within PlaybackProvider');
  return ctx;
}

export function usePlaybackActions(): PlaybackActions {
  const ctx = useContext(PlaybackActionsContext);
  if (!ctx) throw new Error('usePlaybackActions must be used within PlaybackProvider');
  return ctx;
}

// Convenience hook — use in page components that need both state and actions
export function usePlayback(): PlaybackState & PlaybackActions {
  return { ...usePlaybackState(), ...usePlaybackActions() };
}
