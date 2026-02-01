// src/components/TrackList.js
import React, { useState, useEffect } from 'react';
import { downloadTrack } from '../api/plexApi';
import queueManager from '../utils/queueManager';

function TrackList({ tracks, albumData, onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) {
  const [queuedTracks, setQueuedTracks] = useState(new Set());

  useEffect(() => {
    updateQueuedTracks();
  }, []);

  const updateQueuedTracks = () => {
    const queue = queueManager.getQueue();
    const queuedTrackKeys = new Set(queue.map(item => item.track.ratingKey));
    setQueuedTracks(queuedTrackKeys);
  };

  if (!tracks || tracks.length === 0) {
    return <div className="text-center py-5 text-plex-text-secondary italic">No tracks found</div>;
  }

  const handleTrackClick = (track) => {
    const isCurrentlyPlaying = isCurrentTrack(track);
    
    if (isCurrentlyPlaying && isPlaying) {
      if (onTogglePlayback) {
        onTogglePlayback(); // Pause current track
      }
      return;
    }
    
    if (isCurrentlyPlaying && !isPlaying) {
      if (onTogglePlayback) {
        onTogglePlayback(); // Resume playback
      }
      return;
    }
    
    if (onPlayTrack) {
      onPlayTrack(track);
    }
  };

  const isCurrentTrack = (track) => {
    return currentTrack && currentTrack.ratingKey === track.ratingKey;
  };

  const handleDownload = async (event, track) => {
    event.stopPropagation();
    
    try {
      await downloadTrack(track, albumData?.title);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const handleAddToQueue = async (event, track) => {
    event.stopPropagation();
    
    try {
      const success = queueManager.addToQueue(track, albumData);
      if (success) {
        updateQueuedTracks(); // Update the UI to reflect the change
        console.log(`Added "${track.title}" to queue`);
      } else {
        alert('This track is already in your queue.');
      }
    } catch (error) {
      console.error('Failed to add track to queue:', error);
      alert('Failed to add track to queue. Please try again.');
    }
  };

  const isTrackInQueue = (track) => {
    return queuedTracks.has(track.ratingKey);
  };

  const getTrackClasses = (track) => {
    const isCurrent = isCurrentTrack(track);
    const baseClasses = "grid grid-cols-track-list items-center gap-4 px-4 py-2 rounded cursor-pointer transition-colors duration-200 hover:bg-white/5";

    if (!isCurrent) return baseClasses;

    if (isPlaying) {
      return `${baseClasses} bg-plex-accent/10 text-plex-accent`;
    } else {
      return `${baseClasses} bg-gray-500/10 text-plex-text-muted`;
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-track-list items-center gap-4 px-4 py-2 pb-2.5
                      border-b border-white/10 text-plex-text-secondary text-sm font-medium uppercase">
        <div className="text-center">#</div>
        <div>Title</div>
        <div className="text-right">Duration</div>
        <div>&nbsp;</div>
        <div>&nbsp;</div>
      </div>

      <div>
        {tracks.map((track, index) => {
          const isCurrent = isCurrentTrack(track);
          const inQueue = isTrackInQueue(track);

          return (
            <div
              key={track.ratingKey || index}
              className={getTrackClasses(track)}
              onClick={() => handleTrackClick(track)}
            >
              <div className={`text-center tabular-nums ${isCurrent ? (isPlaying ? 'text-plex-accent' : 'text-plex-text-muted') : 'text-plex-text-secondary'}`}>
                {index + 1}
              </div>
              <div className="transition-colors duration-200 flex items-center gap-2 hover:text-plex-accent">
                {isCurrent && (
                  <span className="text-[0.8em] text-plex-accent animate-pulse-icon">
                    {isPlaying ? '⏸' : '▶'}
                  </span>
                )}
                {track.title}
              </div>
              <div className={`text-right tabular-nums ${isCurrent ? (isPlaying ? 'text-plex-accent' : 'text-plex-text-muted') : 'text-plex-text-secondary'}`}>
                {formatDuration(track.duration || 0)}
              </div>
              <div className="flex justify-center items-center">
                <button
                  className="bg-transparent border border-white/30 text-plex-text-secondary px-2 py-1.5
                             rounded cursor-pointer text-sm transition-all duration-200
                             hover:bg-white/10 hover:border-white/50 hover:text-white
                             active:scale-95"
                  onClick={(e) => handleDownload(e, track)}
                  title="Download track"
                >
                  ⬇
                </button>
              </div>
              <div className="flex justify-center items-center">
                <button
                  className={`bg-transparent border px-2 py-1.5 rounded cursor-pointer text-sm
                             transition-all duration-200 active:scale-95
                             ${inQueue
                               ? 'bg-plex-accent/20 border-plex-accent text-plex-accent'
                               : 'border-white/30 text-plex-text-secondary hover:bg-plex-accent/20 hover:border-plex-accent hover:text-plex-accent'}`}
                  onClick={(e) => handleAddToQueue(e, track)}
                  title={inQueue ? "Already in queue" : "Add to queue"}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="2" y="3" width="12" height="2" rx="1"/>
                    <rect x="2" y="7" width="12" height="2" rx="1"/>
                    <rect x="2" y="11" width="12" height="2" rx="1"/>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const formatDuration = (milliseconds) => {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export default TrackList;
