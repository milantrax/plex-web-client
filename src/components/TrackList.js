// src/components/TrackList.js
import React, { useState, useEffect } from 'react';
import { downloadTrack } from '../api/plexApi';
import queueManager from '../utils/queueManager';
import {
  Box,
  IconButton,
  Typography,
  Rating
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StarIcon from '@mui/icons-material/Star';

function TrackList({ tracks, albumData, onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) {
  const [queuedTracks, setQueuedTracks] = useState(new Set());
  const [, forceUpdate] = useState({});

  useEffect(() => {
    updateQueuedTracks();
  }, []);

  useEffect(() => {
    forceUpdate({});
  }, [currentTrack, isPlaying]);

  const updateQueuedTracks = async () => {
    try {
      const queue = await queueManager.getQueue();
      const queueArray = Array.isArray(queue) ? queue : [];
      const queuedTrackKeys = new Set(queueArray.map(item => item.track.ratingKey));
      setQueuedTracks(queuedTrackKeys);
    } catch (error) {
      console.error('Error updating queued tracks:', error);
      setQueuedTracks(new Set()); // Empty set on error
    }
  };

  if (!tracks || tracks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No tracks found
        </Typography>
      </Box>
    );
  }

  const handleTrackClick = (track) => {
    const isCurrentlyPlaying = isCurrentTrack(track);

    if (isCurrentlyPlaying && isPlaying) {
      if (onTogglePlayback) {
        onTogglePlayback();
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
    const currentKey = String(currentTrack.ratingKey);
    const trackKey = String(track.ratingKey);
    return currentKey === trackKey;
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
      const success = await queueManager.addToQueue(track, albumData);
      if (success) {
        await updateQueuedTracks();
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
    <Box sx={{ width: '100%' }}>
      {/* Header Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '50px 1fr 100px 60px 60px',
            md: '50px 1fr 140px 100px 60px 60px'
          },
          alignItems: 'center',
          gap: 2,
          px: 2,
          py: 1,
          pb: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 600, textTransform: 'uppercase' }}>
          #
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
          Title
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' }, fontWeight: 600, textTransform: 'uppercase' }}>
          Rating
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', fontWeight: 600, textTransform: 'uppercase' }}>
          Duration
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          &nbsp;
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          &nbsp;
        </Typography>
      </Box>

      {/* Track Rows */}
      <Box>
        {tracks.map((track, index) => {
          const isCurrent = isCurrentTrack(track);
          const inQueue = isTrackInQueue(track);

          return (
            <Box
              key={track.ratingKey || index}
              onClick={() => handleTrackClick(track)}
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '50px 1fr 100px 60px 60px',
                  md: '50px 1fr 140px 100px 60px 60px'
                },
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 0.5,
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'all 0.2s',
                bgcolor: isCurrent
                  ? 'primary.light'
                  : 'transparent',
                opacity: isCurrent && !isPlaying ? 0.7 : 1,
                borderLeft: isCurrent ? 4 : 0,
                borderLeftColor: 'primary.main',
                '&:hover': {
                  bgcolor: isCurrent ? 'primary.light' : 'action.hover',
                },
              }}
            >
              {/* Track Number */}
              <Box sx={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontVariantNumeric: 'tabular-nums',
                    color: isCurrent ? '#000000' : 'text.secondary'
                  }}
                >
                  {index + 1}
                </Typography>
              </Box>

              {/* Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                {isCurrent && (
                  <Box sx={{ color: '#000000', display: 'flex', alignItems: 'center' }}>
                    {isPlaying ? <PauseIcon sx={{ fontSize: '1rem' }} /> : <PlayArrowIcon sx={{ fontSize: '1rem' }} />}
                  </Box>
                )}
                <Typography
                  variant="body2"
                  sx={{
                    transition: 'color 0.2s',
                    color: isCurrent ? '#000000' : 'inherit',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                >
                  {track.title}
                </Typography>
              </Box>

              {/* Rating - Desktop only */}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                {(track.userRating || track.rating) ? (
                  <Rating
                    value={(track.userRating || track.rating) / 2}
                    precision={0.5}
                    size="small"
                    readOnly
                    emptyIcon={<StarIcon style={{ opacity: 0.2 }} fontSize="inherit" />}
                  />
                ) : (
                  <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                    Not rated
                  </Typography>
                )}
              </Box>

              {/* Duration */}
              <Typography
                variant="body2"
                sx={{
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  color: isCurrent ? '#000000' : 'text.secondary'
                }}
              >
                {formatDuration(track.duration || 0)}
              </Typography>

              {/* Download Button */}
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <IconButton
                  size="small"
                  onClick={(e) => handleDownload(e, track)}
                  title="Download track"
                  color="inherit"
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Add to Queue Button */}
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <IconButton
                  size="small"
                  onClick={(e) => handleAddToQueue(e, track)}
                  title={inQueue ? "Already in queue" : "Add to queue"}
                  color={inQueue ? "primary" : "inherit"}
                >
                  <PlaylistAddIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const formatDuration = (milliseconds) => {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export default TrackList;
