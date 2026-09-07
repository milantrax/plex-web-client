import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, IconButton, Stack, Chip, Link } from '@mui/material';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { getPlexImageUrl } from '../api/plexApi';
import { usePlayback } from '../contexts/PlaybackContext';
import FavoriteButton from './FavoriteButton';
import type { QueueItem } from '../types';

export interface NowPlayingProps {
  /** The queue, used only to show where the current track sits within it. */
  queue: QueueItem[];
}

const ART_SIZE = { xs: 140, sm: 180 };

function formatDuration(milliseconds?: number | null): string {
  if (!milliseconds) return '';
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * The header of the playback page: what is playing right now, next to the
 * queue it was drawn from.
 *
 * Reads the track from PlaybackContext, so it follows whatever started
 * playback — an album, a single track, a playlist or the queue itself —
 * without those places needing to know this component exists.
 */
const NowPlaying = ({ queue }: NowPlayingProps) => {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, onTogglePlayback, playerRef } = usePlayback();

  if (!currentTrack) {
    return (
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent
          sx={{
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            color: 'text.secondary'
          }}
        >
          <MusicNoteIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
          <Box>
            <Typography sx={{ fontWeight: 600 }}>Nothing playing</Typography>
            <Typography variant="body2">
              Play an album, track or playlist and it will appear here.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const artUrl = getPlexImageUrl(
    currentTrack.thumb || currentTrack.parentThumb || currentTrack.grandparentThumb
  );
  const artist = currentTrack.originalTitle || currentTrack.grandparentTitle || 'Unknown Artist';
  const album = currentTrack.parentTitle || 'Unknown Album';
  const albumKey = currentTrack.parentRatingKey;

  // Only meaningful when the track came from the queue; playing straight from
  // an album or a playlist does not enqueue it.
  const queueIndex = queue.findIndex(
    item => String(item.track.ratingKey) === String(currentTrack.ratingKey)
  );

  const openAlbum = () => {
    if (albumKey) navigate(`/album/${albumKey}`);
  };

  return (
    <Card sx={{ mb: 3, boxShadow: 3, overflow: 'hidden' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: 'primary.main',
            display: 'block',
            mb: 1.5
          }}
        >
          Now Playing
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 3 }}>
          {/* Album art */}
          {artUrl ? (
            <Box
              component="img"
              src={artUrl}
              alt={album}
              onClick={openAlbum}
              sx={{
                width: ART_SIZE,
                height: ART_SIZE,
                flexShrink: 0,
                borderRadius: 2,
                objectFit: 'cover',
                boxShadow: 3,
                cursor: albumKey ? 'pointer' : 'default',
                transition: 'opacity 0.2s',
                '&:hover': { opacity: albumKey ? 0.85 : 1 }
              }}
            />
          ) : (
            <Box
              sx={{
                width: ART_SIZE,
                height: ART_SIZE,
                flexShrink: 0,
                borderRadius: 2,
                bgcolor: 'action.disabledBackground',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.disabled'
              }}
            >
              <MusicNoteIcon sx={{ fontSize: 48 }} />
            </Box>
          )}

          {/* Track details, to the right of the art */}
          <Box sx={{ minWidth: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                lineHeight: 1.25,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {currentTrack.title}
            </Typography>

            <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 500 }} noWrap>
              {artist}
            </Typography>

            <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
              {albumKey ? (
                <Link
                  component="button"
                  type="button"
                  onClick={openAlbum}
                  underline="hover"
                  color="inherit"
                  sx={{ verticalAlign: 'baseline' }}
                >
                  {album}
                </Link>
              ) : (
                album
              )}
              {currentTrack.parentYear ? ` · ${currentTrack.parentYear}` : ''}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
              {currentTrack.duration ? (
                <Chip size="small" variant="outlined" label={formatDuration(currentTrack.duration)} />
              ) : null}
              {queueIndex !== -1 && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${queueIndex + 1} of ${queue.length} in queue`}
                />
              )}
              {queueIndex === -1 && queue.length > 0 && (
                <Chip size="small" variant="outlined" color="default" label="Not in queue" />
              )}
            </Stack>

            {/* Controls, mirroring the player bar so the page is usable on its own */}
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 'auto' }}>
              <IconButton
                onClick={() => playerRef.current?.playPrevious()}
                title="Previous track"
                color="inherit"
              >
                <SkipPreviousIcon />
              </IconButton>

              <IconButton
                onClick={onTogglePlayback}
                title={isPlaying ? 'Pause' : 'Play'}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>

              <IconButton
                onClick={() => playerRef.current?.playNext()}
                title="Next track"
                color="inherit"
              >
                <SkipNextIcon />
              </IconButton>

              <FavoriteButton
                type="track"
                item={{
                  ratingKey: currentTrack.ratingKey,
                  title: currentTrack.title,
                  thumb: currentTrack.thumb || currentTrack.parentThumb,
                  subtitle: artist,
                  duration: currentTrack.duration,
                  partKey: currentTrack.Media?.[0]?.Part?.[0]?.key || null,
                  parentRatingKey: albumKey ? String(albumKey) : null
                }}
              />
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default NowPlaying;
