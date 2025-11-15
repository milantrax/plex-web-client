// src/pages/Queue.js
import React, { useState, useEffect } from 'react';
import queueManager from '../utils/queueManager';
import LoadingSpinner from '../components/LoadingSpinner';
import './Queue.scss';

function Queue({ onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueStats, setQueueStats] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    loadQueue();
  }, [currentTrack]);

  const loadQueue = () => {
    setLoading(true);
    try {
      const queueData = queueManager.getQueue();
      const stats = queueManager.getQueueStats();
      setQueue(queueData);
      setQueueStats(stats);
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromQueue = (queueItemId) => {
    const success = queueManager.removeFromQueue(queueItemId);
    if (success) {
      loadQueue();
    } else {
      alert('Failed to remove track from queue');
    }
  };

  const handleClearQueue = () => {
    if (queue.length === 0) return;
    
    const confirmed = window.confirm('Are you sure you want to clear the entire queue?');
    if (confirmed) {
      const success = queueManager.clearQueue();
      if (success) {
        loadQueue();
      } else {
        alert('Failed to clear queue');
      }
    }
  };

  const handleDragStart = (e, queueItem, index) => {
    setDraggedItem({ item: queueItem, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedItem || draggedItem.index === dropIndex) {
      return;
    }

    const success = queueManager.moveInQueue(draggedItem.item.id, dropIndex);
    if (success) {
      loadQueue();
    }
    setDraggedItem(null);
  };

  const handleTrackClick = (queueItem) => {
    const track = queueItem.track;
    const isCurrentlyPlaying = isCurrentTrack(track);
    
    if (isCurrentlyPlaying && isPlaying) {
      if (onTogglePlayback) {
        onTogglePlayback(); // Pause current track
      }
      return;
    }
    
    if (isCurrentlyPlaying && !isPlaying) {
      if (onTogglePlayback) {
        onTogglePlayback();
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

  const getTrackClassName = (track, index) => {
    const isCurrent = isCurrentTrack(track);
    let className = 'queue-item';
    
    if (isCurrent) {
      className += ` playing${!isPlaying ? ' paused' : ''}`;
    }
    
    if (dragOverIndex === index) {
      className += ' drag-over';
    }
    
    return className;
  };

  const formatDuration = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="queue-page">
      <div className="queue-header">
        <div className="queue-stats">
          <span className="queue-count">{queueStats.totalTracks} tracks</span>
          <span className="queue-duration">Total: {queueStats.totalDurationFormatted}</span>
          {queue.length > 0 && (
            <button className="clear-queue-btn" onClick={handleClearQueue}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="queue-empty">
          <h2>Queue is empty</h2>
          <p>Add tracks to your queue from album pages to start building your playlist.</p>
          <div className="queue-tips">
            <h3>How to use the queue:</h3>
            <ul>
              <li>Browse to an album page</li>
              <li>Click the queue button (⊞) next to any track</li>
              <li>Tracks will appear here in the order you add them</li>
              <li>Click any track to start playing</li>
              <li>Drag tracks to reorder them in the queue</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="queue-list">
          <div className="queue-list-header">
            <div className="queue-col-position">#</div>
            <div className="queue-col-track">Track</div>
            <div className="queue-col-album">Album</div>
            <div className="queue-col-duration">Duration</div>
            <div className="queue-col-added">Added</div>
            <div className="queue-col-actions">Actions</div>
          </div>
          
          <div className="queue-items">
            {queue.map((queueItem, index) => (
              <div 
                key={queueItem.id} 
                className={getTrackClassName(queueItem.track, index)}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, queueItem, index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="queue-col-position">
                  {index + 1}
                </div>
                
                <div 
                  className="queue-col-track clickable"
                  onClick={() => handleTrackClick(queueItem)}
                >
                  <div className="track-info">
                    {isCurrentTrack(queueItem.track) && (
                      <span className="play-icon">
                        {isPlaying ? '⏸' : '▶'}
                      </span>
                    )}
                    <span className="track-title">{queueItem.track.title}</span>
                  </div>
                </div>
                
                <div className="queue-col-album">
                  {queueItem.album ? (
                    <div className="album-info">
                      <span className="album-title">{queueItem.album.title}</span>
                      {queueItem.album.artist && (
                        <span className="album-artist">by {queueItem.album.artist}</span>
                      )}
                    </div>
                  ) : (
                    <span className="no-album">Unknown Album</span>
                  )}
                </div>
                
                <div className="queue-col-duration">
                  {formatDuration(queueItem.track.duration || 0)}
                </div>
                
                <div className="queue-col-added">
                  {formatDate(queueItem.addedAt)}
                </div>
                
                <div className="queue-col-actions">
                  <div className="queue-actions">
                    <div className="drag-handle" title="Drag to reorder">
                      ⋮⋮
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveFromQueue(queueItem.id)}
                      title="Remove from queue"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Queue;
