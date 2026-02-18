import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Divider, Stack, Button, Snackbar, Alert, Chip, Menu, MenuItem, ListItemIcon, ListItemText, Rating } from '@mui/material';
import { getPlexImageUrl, getAlbumTracks, getMetadata } from '../api/plexApi';
import TrackList from '../components/TrackList';
import LoadingSpinner from '../components/LoadingSpinner';
import BackToTop from '../components/BackToTop';
import { PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';
import queueManager from '../utils/queueManager';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import StarIcon from '@mui/icons-material/Star';
import { usePlayback } from '../contexts/PlaybackContext';

const AlbumPage = () => {
  const { currentTrack, isPlaying, onPlayTrack, onTogglePlayback } = usePlayback();
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const fetchAlbumData = async () => {
      try {
        setLoading(true);

        const albumData = await getMetadata(albumId);

        if (albumData) {
          setAlbum(albumData);
          const tracksData = await getAlbumTracks(albumId);
          setTracks(Array.isArray(tracksData) ? tracksData : []);
        } else {
          setError('Album data not found');
        }
      } catch (error) {
        console.error('Error fetching album data:', error);
        setError('Failed to load album data');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumData();
  }, [albumId]);

  const handleEnqueueAlbum = async () => {
    if (!tracks || tracks.length === 0) {
      setSnackbar({
        open: true,
        message: 'No tracks available to enqueue',
        severity: 'warning'
      });
      return;
    }

    console.log('Enqueueing album:', album);
    console.log('Tracks to enqueue:', tracks);

    const result = await queueManager.addMultipleToQueue(tracks, album);

    console.log('Enqueue result:', result);

    if (result.success) {
      setSnackbar({
        open: true,
        message: `Added ${result.addedCount} track${result.addedCount !== 1 ? 's' : ''} to queue${result.skippedCount > 0 ? ` (${result.skippedCount} already in queue)` : ''}`,
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: 'All tracks are already in the queue',
        severity: 'info'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handlePlayAlbum = async () => {
    handleCloseMenu();

    if (!tracks || tracks.length === 0) {
      setSnackbar({
        open: true,
        message: 'No tracks available to play',
        severity: 'warning'
      });
      return;
    }

    console.log('Playing album - clearing queue and adding tracks');

    // Clear existing queue
    await queueManager.clearQueue();

    // Add all album tracks
    const result = await queueManager.addMultipleToQueue(tracks, album);

    console.log('Play album result:', result);

    if (result.success) {
      // Sort tracks by index to get the first track
      const sortedTracks = [...tracks].sort((a, b) => (a.index || 0) - (b.index || 0));
      const firstTrack = sortedTracks[0];

      // Start playing the first track
      if (onPlayTrack && firstTrack) {
        onPlayTrack(firstTrack);
        setSnackbar({
          open: true,
          message: `Playing album: ${album.title}`,
          severity: 'success'
        });
      }
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to play album',
        severity: 'error'
      });
    }
  };

  const handleEnqueueAlbumFromMenu = () => {
    handleCloseMenu();
    handleEnqueueAlbum();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !album) {
    return (
      <Box sx={{ px: 2.5, py: 10, textAlign: 'center' }}>
        <Card sx={{ maxWidth: 400, mx: 'auto', boxShadow: 3 }}>
          <CardContent>
            <Typography color="error">
              {error || 'Album not found'}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const albumArtUrl = getPlexImageUrl(album.thumb);

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        flexDirection: { xs: 'column', md: 'row' }
      }}
    >
      {/* Left Column - Album Art & Metadata */}
      <Box
        sx={{
          width: { xs: '100%', md: 350 },
          height: { xs: 'auto', md: '100%' },
          borderBottom: { xs: 1, md: 0 },
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: { xs: 0, md: 3 },
          overflowY: 'auto',
          px: 2.5,
          pt: `${NAVBAR_HEIGHT + 20}px`,
          pb: `${PLAYER_HEIGHT + 20}px`,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'background.paper',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: '4px',
            '&:hover': {
              bgcolor: 'action.disabled',
            },
          },
        }}
      >
        {/* Album Art */}
        {albumArtUrl ? (
          <Box
            component="img"
            src={albumArtUrl}
            alt={album.title}
            sx={{
              width: '100%',
              aspectRatio: '1/1',
              borderRadius: 2,
              boxShadow: 3,
              objectFit: 'cover',
              mb: 3
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              aspectRatio: '1/1',
              borderRadius: 2,
              bgcolor: 'action.disabledBackground',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
              fontSize: '1.25rem',
              mb: 3,
              boxShadow: 1
            }}
          >
            No Cover
          </Box>
        )}

        {/* Metadata */}
        <Stack spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, lineHeight: 1.3 }}>
              {album.title}
            </Typography>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 500 }}>
              {album.parentTitle || 'Unknown Artist'}
            </Typography>
          </Box>

          <Divider />

          <Stack spacing={1.5}>
            {album.year && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Year
                </Typography>
                <Typography variant="body2">
                  {album.year}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Tracks
              </Typography>
              <Typography variant="body2">
                {tracks.length} Track{tracks.length !== 1 ? 's' : ''}
              </Typography>
            </Box>

            {(album.genre || album.Genre) && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                  Genre{Array.isArray(album.Genre) && album.Genre.length > 1 ? 's' : ''}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {Array.isArray(album.Genre)
                    ? album.Genre.map((g, index) => (
                        <Chip
                          key={index}
                          label={g.tag}
                          size="small"
                          sx={{
                            fontWeight: 500,
                            fontSize: '0.75rem'
                          }}
                        />
                      ))
                    : album.genre.split(',').map((genre, index) => (
                        <Chip
                          key={index}
                          label={genre.trim()}
                          size="small"
                          sx={{
                            fontWeight: 500,
                            fontSize: '0.75rem'
                          }}
                        />
                      ))
                  }
                </Box>
              </Box>
            )}

            {(album.userRating || album.rating) && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
                  Rating
                </Typography>
                <Rating
                  value={(album.userRating || album.rating) / 2}
                  precision={0.5}
                  size="medium"
                  readOnly
                  emptyIcon={<StarIcon style={{ opacity: 0.2 }} fontSize="inherit" />}
                />
              </Box>
            )}

            {album.studio && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Label
                </Typography>
                <Typography variant="body2">
                  {album.studio}
                </Typography>
              </Box>
            )}
          </Stack>

          <Divider />

          <Button
            variant="contained"
            fullWidth
            endIcon={<ArrowDropDownIcon />}
            onClick={handleOpenMenu}
            sx={{
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.95rem'
            }}
          >
            Album Actions
          </Button>

          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleCloseMenu}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
            PaperProps={{
              sx: { width: anchorEl?.offsetWidth || 'auto' }
            }}
          >
            <MenuItem onClick={handlePlayAlbum}>
              <ListItemIcon>
                <PlayArrowIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                Play Now
              </ListItemText>
            </MenuItem>
            <MenuItem onClick={handleEnqueueAlbumFromMenu}>
              <ListItemIcon>
                <QueueMusicIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                Enqueue Album
              </ListItemText>
            </MenuItem>
          </Menu>
        </Stack>
      </Box>

      {/* Right Column - Track List */}
      <Box
        ref={scrollContainerRef}
        sx={{
          flex: 1,
          height: { xs: 'auto', md: '100%' },
          overflowY: 'auto',
          px: 2.5,
          pt: `${NAVBAR_HEIGHT + 20}px`,
          pb: `${PLAYER_HEIGHT + 20}px`
        }}
        className="custom-scrollbar"
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Tracks
        </Typography>
        <Card sx={{ boxShadow: 2 }}>
          <CardContent sx={{ p: 0 }}>
            <TrackList
              tracks={tracks}
              albumData={album}
              onPlayTrack={onPlayTrack}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onTogglePlayback={onTogglePlayback}
            />
          </CardContent>
        </Card>
      </Box>

      <BackToTop scrollContainerRef={scrollContainerRef} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AlbumPage;
