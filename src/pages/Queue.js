// src/pages/Queue.js
import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Button, Typography, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
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
    <Box sx={{ px: 2.5, py: 2.5 }}>
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography sx={{ fontWeight: 500 }}>
                {queueStats.totalTracks} tracks
              </Typography>
              <Typography color="text.secondary">
                Total: {queueStats.totalDurationFormatted}
              </Typography>
            </Stack>
            {queue.length > 0 && (
              <Button
                variant="contained"
                color="error"
                onClick={handleClearQueue}
              >
                Clear All
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {queue.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Queue is empty
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Add tracks to your queue from album pages to start building your playlist.
          </Typography>
          <Card sx={{ maxWidth: 600, mx: 'auto', boxShadow: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                How to use the queue:
              </Typography>
              <Stack spacing={1} sx={{ textAlign: 'left' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Typography color="primary" sx={{ mt: 0.5 }}>•</Typography>
                  <Typography color="text.secondary">
                    Browse to an album page
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Typography color="primary" sx={{ mt: 0.5 }}>•</Typography>
                  <Typography color="text.secondary">
                    Click the queue button (⊞) next to any track
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Typography color="primary" sx={{ mt: 0.5 }}>•</Typography>
                  <Typography color="text.secondary">
                    Tracks will appear here in the order you add them
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Typography color="primary" sx={{ mt: 0.5 }}>•</Typography>
                  <Typography color="text.secondary">
                    Click any track to start playing
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Typography color="primary" sx={{ mt: 0.5 }}>•</Typography>
                  <Typography color="text.secondary">
                    Drag tracks to reorder them in the queue
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell align="center" sx={{ width: 50, fontWeight: 600, color: 'text.secondary' }}>
                  #
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Track
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Album
                </TableCell>
                <TableCell align="center" sx={{ width: 100, fontWeight: 600, color: 'text.secondary' }}>
                  Duration
                </TableCell>
                <TableCell align="center" sx={{ width: 150, fontWeight: 600, color: 'text.secondary' }}>
                  Added
                </TableCell>
                <TableCell align="center" sx={{ width: 100, fontWeight: 600, color: 'text.secondary' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody sx={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
              {queue.map((queueItem, index) => (
                <TableRow
                  key={queueItem.id}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, queueItem, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  sx={{
                    cursor: 'move',
                    transition: 'all 0.2s',
                    bgcolor: isCurrentTrack(queueItem.track)
                      ? 'primary.light'
                      : 'inherit',
                    opacity: isCurrentTrack(queueItem.track) && !isPlaying ? 0.7 : 1,
                    borderLeft: isCurrentTrack(queueItem.track) ? 4 : 0,
                    borderLeftColor: 'primary.main',
                    borderTop: dragOverIndex === index ? 2 : 0,
                    borderTopColor: 'primary.main',
                    '&:hover': {
                      bgcolor: isCurrentTrack(queueItem.track)
                        ? 'primary.light'
                        : 'action.hover'
                    }
                  }}
                >
                  <TableCell align="center" sx={{ color: 'text.secondary' }}>
                    {index + 1}
                  </TableCell>

                  <TableCell
                    onClick={() => handleTrackClick(queueItem)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {isCurrentTrack(queueItem.track) && (
                        <Typography color="primary" sx={{ fontSize: '1.125rem' }}>
                          {isPlaying ? '⏸' : '▶'}
                        </Typography>
                      )}
                      <Typography>{queueItem.track.title}</Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    {queueItem.album ? (
                      <Box>
                        <Typography>{queueItem.album.title}</Typography>
                        {queueItem.album.artist && (
                          <Typography variant="body2" color="text.secondary">
                            by {queueItem.album.artist}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography color="text.secondary">Unknown Album</Typography>
                    )}
                  </TableCell>

                  <TableCell align="center" sx={{ color: 'text.secondary' }}>
                    {formatDuration(queueItem.track.duration || 0)}
                  </TableCell>

                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(queueItem.addedAt)}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                      <DragIndicatorIcon
                        sx={{
                          color: 'text.secondary',
                          cursor: 'move',
                          userSelect: 'none'
                        }}
                        titleAccess="Drag to reorder"
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveFromQueue(queueItem.id)}
                        title="Remove from queue"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default Queue;
