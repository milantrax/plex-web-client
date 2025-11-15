// src/components/TrackList.js
import React, { useState, useEffect } from 'react';
import { downloadTrack } from '../api/plexApi';
import queueManager from '../utils/queueManager';
import './TrackList.scss';

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
    return <div className="no-tracks">No tracks found</div>;
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

  const getTrackClassName = (track) => {
    const isCurrent = isCurrentTrack(track);
    if (!isCurrent) return 'track-item';
    
    return `track-item playing${!isPlaying ? ' paused' : ''}`;
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

  return (
    <div className="tracks-list">
      <div className="tracks-header">
        <div className="track-number">#</div>
        <div className="track-title">Title</div>
        <div className="track-duration">Duration</div>
        <div className="track-download">&nbsp;</div>
        <div className="track-queue">&nbsp;</div>
      </div>
      
      <div className="tracks-items">
        {tracks.map((track, index) => (
          <div 
            key={track.ratingKey || index} 
            className={getTrackClassName(track)}
            onClick={() => handleTrackClick(track)}
          >
            <div className="track-number">{index + 1}</div>
            <div className="track-title">
              {isCurrentTrack(track) && (
                <span className="play-icon">
                  {isPlaying ? '⏸' : '▶'}
                </span>
              )}
              {track.title}
            </div>
            <div className="track-duration">
              {formatDuration(track.duration || 0)}
            </div>
            <div className="track-download">
              <button
                className="download-btn"
                onClick={(e) => handleDownload(e, track)}
                title="Download track"
              >
                ⬇
              </button>
            </div>
            <div className="track-queue">
              <button
                className={`queue-btn${isTrackInQueue(track) ? ' in-queue' : ''}`}
                onClick={(e) => handleAddToQueue(e, track)}
                title={isTrackInQueue(track) ? "Already in queue" : "Add to queue"}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="2" y="3" width="12" height="2" rx="1"/>
                  <rect x="2" y="7" width="12" height="2" rx="1"/>
                  <rect x="2" y="11" width="12" height="2" rx="1"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
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
