// src/pages/Queue.js
import React, { useState, useEffect } from 'react';
import queueManager from '../utils/queueManager';
import LoadingSpinner from '../components/LoadingSpinner';

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
    <div className="px-5 py-5">
      <div className="card bg-base-200 shadow-xl p-5 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-4 items-center text-base-content/60">
            <span className="font-medium text-base-content">{queueStats.totalTracks} tracks</span>
            <span>Total: {queueStats.totalDurationFormatted}</span>
          </div>
          {queue.length > 0 && (
            <button
              className="btn btn-error"
              onClick={handleClearQueue}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold text-base-content mb-4">Queue is empty</h2>
          <p className="text-base-content/70 mb-6">Add tracks to your queue from album pages to start building your playlist.</p>
          <div className="card bg-base-200 shadow-xl p-6 max-w-2xl mx-auto">
            <div className="card-body">
              <h3 className="card-title text-xl mb-4">How to use the queue:</h3>
              <ul className="text-left text-base-content/70 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Browse to an album page</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Click the queue button (⊞) next to any track</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Tracks will appear here in the order you add them</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Click any track to start playing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Drag tracks to reorder them in the queue</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="card bg-base-200 shadow-xl overflow-hidden">
          <div className="grid grid-cols-[50px_1fr_1fr_100px_150px_100px] gap-4 px-4 py-3 bg-base-300 border-b border-base-300 text-base-content/60 text-sm font-medium">
            <div className="text-center">#</div>
            <div>Track</div>
            <div>Album</div>
            <div className="text-center">Duration</div>
            <div className="text-center">Added</div>
            <div className="text-center">Actions</div>
          </div>

          <div className="custom-scrollbar max-h-[calc(100vh-300px)] overflow-y-auto">
            {queue.map((queueItem, index) => (
              <div
                key={queueItem.id}
                className={`grid grid-cols-[50px_1fr_1fr_100px_150px_100px] gap-4 px-4 py-3 border-b border-base-300
                           transition-colors duration-200 cursor-move
                           ${isCurrentTrack(queueItem.track)
                             ? `bg-primary/20 border-l-4 border-l-primary ${!isPlaying ? 'opacity-70' : ''}`
                             : 'hover:bg-base-300'
                           }
                           ${dragOverIndex === index ? 'border-t-2 border-t-primary' : ''}`}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, queueItem, index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="text-center text-base-content/60">
                  {index + 1}
                </div>

                <div
                  className="cursor-pointer"
                  onClick={() => handleTrackClick(queueItem)}
                >
                  <div className="flex items-center gap-2">
                    {isCurrentTrack(queueItem.track) && (
                      <span className="text-primary text-lg">
                        {isPlaying ? '⏸' : '▶'}
                      </span>
                    )}
                    <span className="text-base-content">{queueItem.track.title}</span>
                  </div>
                </div>

                <div className="text-base-content/60">
                  {queueItem.album ? (
                    <div className="flex flex-col">
                      <span className="text-base-content">{queueItem.album.title}</span>
                      {queueItem.album.artist && (
                        <span className="text-sm">by {queueItem.album.artist}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-base-content/50">Unknown Album</span>
                  )}
                </div>

                <div className="text-center text-base-content/60">
                  {formatDuration(queueItem.track.duration || 0)}
                </div>

                <div className="text-center text-base-content/60 text-sm">
                  {formatDate(queueItem.addedAt)}
                </div>

                <div className="flex items-center justify-center gap-2">
                  <div className="text-base-content/50 cursor-move select-none text-lg" title="Drag to reorder">
                    ⋮⋮
                  </div>
                  <button
                    className="btn btn-ghost btn-sm text-error hover:text-error/80"
                    onClick={() => handleRemoveFromQueue(queueItem.id)}
                    title="Remove from queue"
                  >
                    ✕
                  </button>
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
