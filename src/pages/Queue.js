// src/pages/Queue.js
import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Button, Typography, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import queueManager from '../utils/queueManager';
import LoadingSpinner from '../components/LoadingSpinner';
import BackToTop from '../components/BackToTop';
import { getPlexImageUrl } from '../api/plexApi';
import { PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';

function Queue({ onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueStats, setQueueStats] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    loadQueue();
  }, [currentTrack]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const queueData = await queueManager.getQueue();
      const stats = await queueManager.getQueueStats();
      setQueue(queueData);
      setQueueStats(stats);
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromQueue = async (queueItemId) => {
    const success = await queueManager.removeFromQueue(queueItemId);
    if (success) {
      await loadQueue();
    } else {
      alert('Failed to remove track from queue');
    }
  };

  const handleClearQueue = async () => {
    if (queue.length === 0) return;

    const confirmed = window.confirm('Are you sure you want to clear the entire queue?');
    if (confirmed) {
      const success = await queueManager.clearQueue();
      if (success) {
        await loadQueue();
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

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedItem || draggedItem.index === dropIndex) {
      return;
    }

    const success = await queueManager.moveInQueue(draggedItem.item.id, dropIndex);
    if (success) {
      await loadQueue();
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
    if (!currentTrack || !track) return false;
    // Compare ratingKey as strings to handle potential type mismatches
    const currentKey = String(currentTrack.ratingKey);
    const trackKey = String(track.ratingKey);
    return currentKey === trackKey;
  };

  const formatDuration = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) {
      return 'just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min. ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }

    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box
      ref={scrollContainerRef}
      sx={{
        height: '100%',
        overflowY: 'auto',
        px: 2.5,
        pt: `${NAVBAR_HEIGHT + 20}px`,
        pb: `${PLAYER_HEIGHT + 20}px`
      }}
      className="custom-scrollbar"
    >
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
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Playback queue is empty
          </Typography>
          <Typography color="text.secondary" sx={{ m: 0 }}>
            Add a track from the album or playlist
          </Typography>
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
            <TableBody>
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
                  <TableCell align="center" sx={{ color: isCurrentTrack(queueItem.track) ? '#000000' : 'text.secondary' }}>
                    {index + 1}
                  </TableCell>

                  <TableCell
                    onClick={() => handleTrackClick(queueItem)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {queueItem.album && queueItem.album.thumb && (
                        <Box
                          component="img"
                          src={getPlexImageUrl(queueItem.album.thumb)}
                          alt={queueItem.album.title}
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            objectFit: 'cover'
                          }}
                        />
                      )}
                      {isCurrentTrack(queueItem.track) && (
                        <Box sx={{ color: '#000000', display: 'flex', alignItems: 'center' }}>
                          {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                        </Box>
                      )}
                      <Typography sx={{ color: isCurrentTrack(queueItem.track) ? '#000000' : 'inherit' }}>
                        {queueItem.track.title}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    {queueItem.album ? (
                      <Box>
                        <Typography sx={{ color: isCurrentTrack(queueItem.track) ? '#000000' : 'inherit' }}>
                          {queueItem.album.title}
                        </Typography>
                        {queueItem.album.artist && (
                          <Typography variant="body2" sx={{ color: isCurrentTrack(queueItem.track) ? 'rgba(0, 0, 0, 0.6)' : 'text.secondary' }}>
                            by {queueItem.album.artist}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography sx={{ color: isCurrentTrack(queueItem.track) ? 'rgba(0, 0, 0, 0.6)' : 'text.secondary' }}>
                        Unknown Album
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="center" sx={{ color: isCurrentTrack(queueItem.track) ? '#000000' : 'text.secondary' }}>
                    {formatDuration(queueItem.track.duration || 0)}
                  </TableCell>

                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {formatRelativeTime(queueItem.addedAt)}
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

      <BackToTop scrollContainerRef={scrollContainerRef} />
    </Box>
  );
}

export default Queue;
