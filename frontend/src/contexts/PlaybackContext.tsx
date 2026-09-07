import React, { useState, useRef, useCallback, useMemo, createContext, useContext, ReactNode, RefObject, Dispatch, SetStateAction } from 'react';
import queueManager from '../utils/queueManager';
import type { PlexTrack, QueueAlbumInput } from '../types';
import type { PlayerHandle } from '../components/Player';

export interface PlaybackState {
  currentTrack: PlexTrack | null;
  isPlaying: boolean;
}

export interface PlayTrackOptions {
  /**
   * Whether starting this track begins a fresh queue.
   *
   * Defaults to true: picking a track out of an album, playlist or search
   * result starts a new queue holding just that track, and anything queued
   * afterwards plays after it.
   *
   * Pass false when the queue is already the thing being played — starting a
   * whole album or playlist, or picking a track out of the queue itself —
   * so the surrounding tracks are not thrown away.
   */
  replaceQueue?: boolean;
}

export interface PlaybackActions {
  onPlayTrack: (track: PlexTrack, options?: PlayTrackOptions) => void;
  onTogglePlayback: () => void;
  onPlayStateChange: (playing: boolean) => void;
  onTrackEnded: (endedTrack: PlexTrack) => Promise<void>;
  onPlayNext: (nextTrack: PlexTrack) => void;
  onPlayPrevious: (previousTrack: PlexTrack) => void;
  setCurrentTrack: Dispatch<SetStateAction<PlexTrack | null>>;
  playerRef: RefObject<PlayerHandle | null>;
}

/**
 * The album details a queue entry carries for display, taken from the track
 * itself so callers do not each have to pass the album alongside it.
 */
function albumContextFromTrack(track: PlexTrack): QueueAlbumInput {
  return {
    title: track.parentTitle,
    artist: track.originalTitle || track.grandparentTitle,
    thumb: track.parentThumb || track.thumb,
    ratingKey: track.parentRatingKey ?? undefined,
    year: track.parentYear
  };
}

// Split into two contexts so components that only need stable actions
// don't re-render when playback state (currentTrack/isPlaying) changes.
const PlaybackStateContext = createContext<PlaybackState | null>(null);
const PlaybackActionsContext = createContext<PlaybackActions | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlexTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<PlayerHandle | null>(null);

  const handlePlayTrack = useCallback(async (track: PlexTrack, options: PlayTrackOptions = {}) => {
    const { replaceQueue = true } = options;

    if (replaceQueue) {
      // The queue is rebuilt before the track is set, so the player sees the
      // new queue when it works out whether a next/previous track exists.
      await queueManager.clearQueue();
      await queueManager.addToQueue(track, albumContextFromTrack(track));
    }

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
