// src/pages/Playlists.js
import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, Card, CardContent, Button, Typography, Chip, Stack, Menu, MenuItem, ListItemIcon, Snackbar, Alert } from '@mui/material';
import { getPlaylists, getPlaylistItems } from '../api/plexApi';
import { PLEX_URL, PLEX_TOKEN } from '../config';
import LoadingSpinner from '../components/LoadingSpinner';
import TrackList from '../components/TrackList';
import { SIDEBAR_WIDTH, PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import queueManager from '../utils/queueManager';

function Playlists({ onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPlaylists();
        setPlaylists(data);
      } catch (err) {
         console.error("Failed to fetch playlists:", err);
         setError("Failed to fetch playlists.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, []);

  // Force component update when currentTrack or isPlaying changes
  useEffect(() => {
    // This ensures visual indicators update when playback state changes
    if (currentTrack) {
      console.log('Current track updated:', currentTrack.title, 'Playing:', isPlaying);
    }
  }, [currentTrack, isPlaying]);

  const handlePlaylistClick = async (playlist) => {
    setSelectedPlaylist(playlist);
    setLoadingTracks(true);
    setError(null);

    try {
      const tracks = await getPlaylistItems(playlist.ratingKey);
      setPlaylistTracks(tracks);
    } catch (err) {
      console.error("Failed to fetch playlist items:", err);
      setError("Failed to fetch tracks for this playlist.");
    } finally {
      setLoadingTracks(false);
    }
  };

  const exportPlaylistAsM3U = () => {
    if (!selectedPlaylist || playlistTracks.length === 0) {
      alert('No playlist selected or playlist is empty');
      return;
    }

    let m3uContent = '#EXTM3U\n';
    m3uContent += `#PLAYLIST:${selectedPlaylist.title}\n\n`;

    playlistTracks.forEach(track => {
      const duration = track.duration ? Math.floor(track.duration / 1000) : -1;
      const artist = track.originalTitle || track.grandparentTitle || 'Unknown Artist';
      const title = track.title || 'Unknown Title';

      m3uContent += `#EXTINF:${duration},${artist} - ${title}\n`;

      const trackUrl = `${PLEX_URL}/library/parts/${track.Media?.[0]?.Part?.[0]?.id}/file?X-Plex-Token=${PLEX_TOKEN}`;
      m3uContent += `${trackUrl}\n\n`;
    });

    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedPlaylist.title.replace(/[^\w\s-]/g, '')}.m3u`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isPlaylistContainsCurrentTrack = () => {
    if (!currentTrack || !playlistTracks || playlistTracks.length === 0) {
      return false;
    }
    const currentKey = String(currentTrack.ratingKey);
    return playlistTracks.some(track => String(track.ratingKey) === currentKey);
  };

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handlePlayPlaylist = () => {
    handleCloseMenu();

    if (!playlistTracks || playlistTracks.length === 0) {
      setSnackbar({
        open: true,
        message: 'No tracks available to play',
        severity: 'warning'
      });
      return;
    }

    console.log('Playing playlist - clearing queue and adding tracks');

    // Clear existing queue
    queueManager.clearQueue();

    // Add all playlist tracks
    const result = queueManager.addMultipleToQueue(playlistTracks, selectedPlaylist);

    console.log('Play playlist result:', result);

    if (result.success) {
      // Get the first track from the playlist
      const firstTrack = playlistTracks[0];

      // Start playing the first track
      if (onPlayTrack && firstTrack) {
        onPlayTrack(firstTrack);
        setSnackbar({
          open: true,
          message: `Playing playlist: ${selectedPlaylist.title}`,
          severity: 'success'
        });
      }
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to play playlist',
        severity: 'error'
      });
    }
  };

  const handleEnqueuePlaylist = () => {
    handleCloseMenu();

    if (!playlistTracks || playlistTracks.length === 0) {
      setSnackbar({
        open: true,
        message: 'No tracks available to enqueue',
        severity: 'warning'
      });
      return;
    }

    console.log('Enqueueing playlist:', selectedPlaylist);
    console.log('Tracks to enqueue:', playlistTracks);

    const result = queueManager.addMultipleToQueue(playlistTracks, selectedPlaylist);

    console.log('Enqueue result:', result);
    console.log('Current queue after enqueue:', queueManager.getQueue());

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

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <Box sx={{ textAlign: 'center', py: 10, px: 2 }}>
      <Typography color="error" variant="h6" sx={{ maxWidth: 600, mx: 'auto' }}>
        {error}
      </Typography>
    </Box>
  );
  if (playlists.length === 0) return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography color="text.secondary" variant="h6">
        No audio playlists found.
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Sidebar */}
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          height: '100%',
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: { xs: 'none', md: 'block' }
        }}
      >
        <List sx={{ height: '100%', overflowY: 'auto', px: 0, pt: `${NAVBAR_HEIGHT + 20}px`, pb: `${PLAYER_HEIGHT + 20}px` }} className="custom-scrollbar">
          {playlists.map(playlist => {
            const isSelected = selectedPlaylist?.ratingKey === playlist.ratingKey;
            const containsCurrentTrack = isSelected && isPlaylistContainsCurrentTrack();

            return (
              <ListItem key={playlist.ratingKey} disablePadding>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handlePlaylistClick(playlist)}
                  sx={{
                    py: 1.5,
                    px: 2.5,
                    bgcolor: containsCurrentTrack ? 'primary.light' : 'inherit',
                    opacity: containsCurrentTrack && !isPlaying ? 0.7 : 1,
                    borderLeft: containsCurrentTrack ? 4 : 0,
                    borderLeftColor: 'primary.main',
                    transition: 'all 0.2s',
                    '&.Mui-selected': {
                      bgcolor: containsCurrentTrack ? 'primary.light' : 'action.selected',
                    },
                    '&.Mui-selected:hover': {
                      bgcolor: containsCurrentTrack ? 'primary.light' : 'action.selected',
                    }
                  }}
                >
                  <ListItemText
                    primary={playlist.title}
                    secondary={`${playlist.leafCount} tracks`}
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: containsCurrentTrack ? '#000000' : 'inherit'
                    }}
                    secondaryTypographyProps={{
                      color: containsCurrentTrack ? 'rgba(0, 0, 0, 0.6)' : 'inherit'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Mobile Playlists Dropdown */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, width: '100%', p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Playlist:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {playlists.map(playlist => {
            const isSelected = selectedPlaylist?.ratingKey === playlist.ratingKey;
            const containsCurrentTrack = isSelected && isPlaylistContainsCurrentTrack();

            return (
              <Chip
                key={playlist.ratingKey}
                label={playlist.title}
                onClick={() => handlePlaylistClick(playlist)}
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                sx={{
                  opacity: containsCurrentTrack && !isPlaying ? 0.7 : 1,
                  transition: 'all 0.2s',
                  bgcolor: containsCurrentTrack ? 'primary.light' : undefined,
                  borderLeft: containsCurrentTrack ? 4 : 0,
                  borderLeftColor: 'primary.main'
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          px: 2.5,
          pt: `${NAVBAR_HEIGHT + 20}px`,
          pb: `${PLAYER_HEIGHT + 20}px`
        }}
        className="custom-scrollbar"
      >
        {selectedPlaylist ? (
          <>
            <Card
              sx={{
                mb: 2.5,
                boxShadow: 3,
                bgcolor: isPlaylistContainsCurrentTrack() ? 'primary.light' : 'background.paper',
                opacity: isPlaylistContainsCurrentTrack() && !isPlaying ? 0.7 : 1,
                borderLeft: isPlaylistContainsCurrentTrack() ? 4 : 0,
                borderLeftColor: 'primary.main',
                transition: 'all 0.2s'
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Typography variant="h5" component="h2" sx={{ color: '#000000' }}>
                        {selectedPlaylist.title}
                      </Typography>
                      {isPlaylistContainsCurrentTrack() && (
                        <Chip
                          label="Now Playing"
                          size="small"
                          sx={{
                            bgcolor: '#000000',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: '22px'
                          }}
                        />
                      )}
                    </Stack>
                    <Chip
                      label={`${playlistTracks.length} tracks`}
                      color="primary"
                      size="small"
                      sx={{
                        color: '#000000',
                        borderColor: '#000000'
                      }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="contained"
                      endIcon={<ArrowDropDownIcon />}
                      onClick={handleOpenMenu}
                      disabled={playlistTracks.length === 0}
                      sx={{
                        fontWeight: 600,
                        textTransform: 'none',
                        bgcolor: '#000000',
                        color: '#ffffff',
                        '&:hover': {
                          bgcolor: '#333333'
                        },
                        '&:disabled': {
                          bgcolor: 'action.disabledBackground',
                          color: 'action.disabled'
                        }
                      }}
                    >
                      Playlist Actions
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={exportPlaylistAsM3U}
                      disabled={playlistTracks.length === 0}
                      title="Export playlist as M3U file"
                      sx={{
                        fontWeight: 600,
                        textTransform: 'none',
                        borderColor: '#000000',
                        color: '#000000',
                        '&:hover': {
                          borderColor: '#000000',
                          bgcolor: 'rgba(0, 0, 0, 0.04)'
                        },
                        '&:disabled': {
                          borderColor: 'action.disabled',
                          color: 'action.disabled'
                        }
                      }}
                    >
                      Export M3U
                    </Button>
                  </Stack>
                </Stack>

                <Menu
                  anchorEl={anchorEl}
                  open={menuOpen}
                  onClose={handleCloseMenu}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={handlePlayPlaylist}>
                    <ListItemIcon>
                      <PlayArrowIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>
                      Play Now
                    </ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleEnqueuePlaylist}>
                    <ListItemIcon>
                      <QueueMusicIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>
                      Enqueue Playlist
                    </ListItemText>
                  </MenuItem>
                </Menu>
              </CardContent>
            </Card>

            {loadingTracks ? (
              <LoadingSpinner />
            ) : playlistTracks.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <Typography color="text.secondary" variant="h6">
                  This playlist is empty
                </Typography>
              </Box>
            ) : (
              <TrackList
                tracks={playlistTracks}
                albumData={selectedPlaylist}
                onPlayTrack={onPlayTrack}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onTogglePlayback={onTogglePlayback}
              />
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 20 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
              Select a playlist
            </Typography>
            <Typography color="text.secondary">
              Choose a playlist from the sidebar to view its tracks
            </Typography>
          </Box>
        )}
      </Box>

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
}

export default Playlists;
