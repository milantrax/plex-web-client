// src/pages/Queue.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Button, Typography, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import queueManager from '../utils/queueManager';
import LoadingSpinner from '../components/LoadingSpinner';
import BackToTop from '../components/BackToTop';
import NowPlaying from '../components/NowPlaying';
import { getPlexImageUrl } from '../api/plexApi';
import { PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';
import { usePlayback } from '../contexts/PlaybackContext';
import type { PlexTrack, QueueItem, QueueStats } from '../types';

interface DraggedItem {
  item: QueueItem;
  index: number;
}

function Queue() {
  const { currentTrack, isPlaying, onPlayTrack, onTogglePlayback } = usePlayback();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueStats, setQueueStats] = useState<Partial<QueueStats>>({});
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Reloads on mount and whenever the track changes, so the queue reflects any
  // track the player advanced to on its own.
  useEffect(() => {
    loadQueue();
  }, [currentTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadQueue = async () => {
    // `loading` starts true and is only ever cleared, so a reload triggered by
    // a track change refreshes the list in place instead of replacing the page
    // — and the Now Playing header above it does not flicker.
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

  const handleRemoveFromQueue = async (queueItemId: number) => {
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

  const handleDragStart = (e: React.DragEvent<HTMLElement>, queueItem: QueueItem, index: number) => {
    setDraggedItem({ item: queueItem, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', (e.target as HTMLElement).outerHTML);
    (e.target as HTMLElement).classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLElement>) => {
    (e.target as HTMLElement).classList.remove('dragging');
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLElement>, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLElement>, dropIndex: number) => {
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

  const handleTrackClick = (queueItem: QueueItem) => {
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
      // Playing from inside the queue moves through it; it must not wipe it.
      onPlayTrack(track, { replaceQueue: false });
    }
  };

  const isCurrentTrack = (track: PlexTrack) => {
    if (!currentTrack || !track) return false;
    // Compare ratingKey as strings to handle potential type mismatches
    const currentKey = String(currentTrack.ratingKey);
    const trackKey = String(track.ratingKey);
    return currentKey === trackKey;
  };

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

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
      <NowPlaying queue={queue} />

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
                          src={getPlexImageUrl(queueItem.album.thumb) ?? undefined}
                          alt={queueItem.album.title ?? undefined}
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

      <Card sx={{ mt: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Queue
              </Typography>
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

      <BackToTop scrollContainerRef={scrollContainerRef} />
    </Box>
  );
}

export default Queue;
