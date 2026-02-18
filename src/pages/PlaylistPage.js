// src/pages/PlaylistPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Divider, Stack, Button, Snackbar, Alert, Chip, Menu, MenuItem,
  ListItemIcon, ListItemText
} from '@mui/material';
import { getPlaylistItems } from '../api/plexApi';
import {
  getCustomPlaylistTracks,
  deleteCustomPlaylist,
} from '../api/customPlaylistsApi';
import TrackList from '../components/TrackList';
import CustomPlaylistTrackList from '../components/CustomPlaylistTrackList';
import LoadingSpinner from '../components/LoadingSpinner';
import BackToTop from '../components/BackToTop';
import FavoriteButton from '../components/FavoriteButton';
import { PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';
import queueManager from '../utils/queueManager';
import { usePlayback } from '../contexts/PlaybackContext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

const PlaylistPage = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, onPlayTrack, onTogglePlayback } = usePlayback();

  const [title, setTitle] = useState('');
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const scrollContainerRef = useRef(null);

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (type === 'plex') {
          const data = await getPlaylistItems(id);
          const tracksArr = Array.isArray(data) ? data : [];
          setTracks(tracksArr);
          // title comes from the first track's grandparent or we use a generic label
          // Actually for plex playlists the title isn't returned by getPlaylistItems
          // We'll set a placeholder and update if available
          if (tracksArr.length > 0 && tracksArr[0].playlistTitle) {
            setTitle(tracksArr[0].playlistTitle);
          } else {
            setTitle('Plex Playlist');
          }
        } else {
          const { playlist, tracks: raw } = await getCustomPlaylistTracks(id);
          setTitle(playlist?.name || 'My Playlist');
          setTracks((Array.isArray(raw) ? raw : []).map(t => ({
            ratingKey: t.rating_key,
            title: t.title,
            grandparentTitle: t.artist,
            parentTitle: t.album,
            duration: t.duration,
            thumb: t.thumb,
            parentThumb: t.thumb,
            parentRatingKey: t.parent_rating_key || null,
            _customTrackId: t.id,
            Media: t.part_key ? [{ Part: [{ key: t.part_key }] }] : []
          })));
        }
      } catch {
        setError('Failed to load playlist.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type, id]);

  const handlePlayPlaylist = async () => {
    setAnchorEl(null);
    if (!tracks.length) return;
    await queueManager.clearQueue();
    const result = await queueManager.addMultipleToQueue(tracks, { title });
    if (result.success && onPlayTrack) {
      onPlayTrack(tracks[0]);
      showSnackbar(`Playing: ${title}`);
    }
  };

  const handleEnqueuePlaylist = async () => {
    setAnchorEl(null);
    if (!tracks.length) return;
    const result = await queueManager.addMultipleToQueue(tracks, { title });
    if (result.success) {
      showSnackbar(`Added ${result.addedCount} track${result.addedCount !== 1 ? 's' : ''} to queue`);
    } else {
      showSnackbar('All tracks are already in the queue', 'info');
    }
  };

  const exportPlaylistAsM3U = async () => {
    if (!tracks.length) return;
    let url, filename;
    if (type === 'plex') {
      url = `/api/plex/playlists/${id}/export-m3u`;
      filename = `${title.replace(/[^\w\s-]/g, '')}.m3u`;
    } else {
      url = `/api/custom-playlists/${id}/export-m3u`;
      filename = `${title.replace(/[^\w\s-]/g, '')}.m3u`;
    }
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Export failed');
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/plain' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      showSnackbar('Failed to export playlist', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCustomPlaylist(id);
      navigate('/playlists');
    } catch {
      showSnackbar('Failed to delete playlist', 'error');
    }
  };

  const handleTracksChange = (newTracks) => setTracks(newTracks);
  const handleRemoveTrack = (track) => setTracks(prev => prev.filter(t => t._customTrackId !== track._customTrackId));

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <Box sx={{ px: 2.5, py: 10, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        flexDirection: { xs: 'column', md: 'row' }
      }}
    >
      {/* Left Column */}
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
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { bgcolor: 'background.paper' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: '4px',
            '&:hover': { bgcolor: 'action.disabled' },
          },
        }}
      >
        {/* Placeholder icon */}
        <Box
          sx={{
            width: '100%',
            aspectRatio: '1/1',
            borderRadius: 2,
            bgcolor: 'action.disabledBackground',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            boxShadow: 1
          }}
        >
          <MusicNoteIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
        </Box>

        <Stack spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, lineHeight: 1.3 }}>
              {title}
            </Typography>
            <Chip
              label={type === 'plex' ? 'Plex Playlist' : 'My Playlist'}
              size="small"
              sx={{ mb: 0.5 }}
            />
          </Box>

          <Typography variant="body2" color="text.secondary">
            {tracks.length} track{tracks.length !== 1 ? 's' : ''}
          </Typography>

          <Divider />

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="contained"
              fullWidth
              endIcon={<ArrowDropDownIcon />}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              disabled={tracks.length === 0}
              sx={{ py: 1.5, fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' }}
            >
              Playlist Actions
            </Button>
            <FavoriteButton
              type="playlist"
              item={{ ratingKey: id, title, subtitle: type }}
            />
          </Stack>

          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            PaperProps={{ sx: { width: anchorEl?.offsetWidth || 'auto' } }}
          >
            <MenuItem onClick={handlePlayPlaylist}>
              <ListItemIcon><PlayArrowIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Play Now</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleEnqueuePlaylist}>
              <ListItemIcon><QueueMusicIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Enqueue Playlist</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); exportPlaylistAsM3U(); }} disabled={tracks.length === 0}>
              <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Export M3U</ListItemText>
            </MenuItem>
          </Menu>

          {type === 'custom' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            >
              Delete Playlist
            </Button>
          )}
        </Stack>
      </Box>

      {/* Right Column - Tracks */}
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

        {tracks.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography color="text.secondary" variant="h6">This playlist is empty</Typography>
            {type === 'custom' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Add tracks by clicking the playlist icon on any track.
              </Typography>
            )}
          </Box>
        ) : type === 'custom' ? (
          <CustomPlaylistTrackList
            playlistId={id}
            tracks={tracks}
            onTracksChange={handleTracksChange}
            onPlayTrack={onPlayTrack}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlayback={onTogglePlayback}
            onRemoveTrack={handleRemoveTrack}
          />
        ) : (
          <TrackList
            tracks={tracks}
            albumData={{ title }}
            onPlayTrack={onPlayTrack}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlayback={onTogglePlayback}
          />
        )}
      </Box>

      <BackToTop scrollContainerRef={scrollContainerRef} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PlaylistPage;
