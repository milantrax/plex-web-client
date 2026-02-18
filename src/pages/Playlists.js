// src/pages/Playlists.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemText, ListItemIcon,
  Card, CardContent, Button, Typography, Chip, Stack, Menu, MenuItem,
  Snackbar, Alert, Divider, IconButton, Tooltip
} from '@mui/material';
import { getPlaylists, getPlaylistItems } from '../api/plexApi';
import {
  getCustomPlaylists,
  getCustomPlaylistTracks,
  deleteCustomPlaylist,
  removeTrackFromCustomPlaylist
} from '../api/customPlaylistsApi';
import LoadingSpinner from '../components/LoadingSpinner';
import TrackList from '../components/TrackList';
import CustomPlaylistTrackList from '../components/CustomPlaylistTrackList';
import BackToTop from '../components/BackToTop';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { SIDEBAR_WIDTH, PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import queueManager from '../utils/queueManager';

const CUSTOM_PREFIX = 'custom_';

function Playlists({ onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) {
  const [plexPlaylists, setPlexPlaylists] = useState([]);
  const [plexLoading, setPlexLoading] = useState(true);

  const [customPlaylists, setCustomPlaylists] = useState([]);
  const [customLoading, setCustomLoading] = useState(true);

  const [selected, setSelected] = useState(null); // { type: 'plex'|'custom', data: {} }
  const [viewTracks, setViewTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [error, setError] = useState(null);

  const [anchorEl, setAnchorEl] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [createOpen, setCreateOpen] = useState(false);

  const menuOpen = Boolean(anchorEl);
  const scrollContainerRef = useRef(null);

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });


  const fetchPlexPlaylists = useCallback(async () => {
    setPlexLoading(true);
    try {
      const data = await getPlaylists();
      setPlexPlaylists(Array.isArray(data) ? data : []);
    } catch {
      setPlexPlaylists([]);
    } finally {
      setPlexLoading(false);
    }
  }, []);

  const fetchCustomPlaylists = useCallback(async () => {
    setCustomLoading(true);
    try {
      const data = await getCustomPlaylists();
      setCustomPlaylists(Array.isArray(data) ? data : []);
    } catch {
      setCustomPlaylists([]);
    } finally {
      setCustomLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlexPlaylists();
    fetchCustomPlaylists();
  }, [fetchPlexPlaylists, fetchCustomPlaylists]);

  const handleSelectPlex = async (playlist) => {
    setSelected({ type: 'plex', data: playlist });
    setViewTracks([]);
    setLoadingTracks(true);
    setError(null);
    try {
      const tracks = await getPlaylistItems(playlist.ratingKey);
      setViewTracks(Array.isArray(tracks) ? tracks : []);
    } catch {
      setError('Failed to fetch tracks for this playlist.');
    } finally {
      setLoadingTracks(false);
    }
  };

  const handleSelectCustom = async (playlist) => {
    setSelected({ type: 'custom', data: playlist });
    setViewTracks([]);
    setLoadingTracks(true);
    setError(null);
    try {
      const { tracks } = await getCustomPlaylistTracks(playlist.id);

      setViewTracks(tracks.map(t => ({
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
    } catch {
      setError('Failed to fetch tracks for this playlist.');
    } finally {
      setLoadingTracks(false);
    }
  };

  const handlePlaylistCreated = (playlist) => {
    setCustomPlaylists(prev => [{ ...playlist, track_count: 0 }, ...prev]);
    showSnackbar(`Playlist "${playlist.name}" created`);
  };

  const handleTrackAddedToPlaylist = (playlistId) => {
    setCustomPlaylists(prev =>
      prev.map(p => p.id === playlistId ? { ...p, track_count: p.track_count + 1 } : p)
    );
  };

  const handleRemoveTrackFromView = async (track) => {
    try {
      await removeTrackFromCustomPlaylist(selected.data.id, track._customTrackId);
      setViewTracks(prev => prev.filter(t => t._customTrackId !== track._customTrackId));
      setCustomPlaylists(prev =>
        prev.map(p => p.id === selected.data.id ? { ...p, track_count: Math.max(0, p.track_count - 1) } : p)
      );
    } catch {
      showSnackbar('Failed to remove track', 'error');
    }
  };

  const handleDeleteCustomPlaylist = async (playlist) => {
    try {
      await deleteCustomPlaylist(playlist.id);
      setCustomPlaylists(prev => prev.filter(p => p.id !== playlist.id));
      if (selected?.type === 'custom' && selected.data.id === playlist.id) {
        setSelected(null);
        setViewTracks([]);
      }
      showSnackbar(`Deleted "${playlist.name}"`);
    } catch {
      showSnackbar('Failed to delete playlist', 'error');
    }
  };

  const exportPlaylistAsM3U = async () => {
    if (!selected || viewTracks.length === 0) return;
    let url, filename;
    if (selected.type === 'plex') {
      url = `/api/plex/playlists/${selected.data.ratingKey}/export-m3u`;
      filename = `${selected.data.title.replace(/[^\w\s-]/g, '')}.m3u`;
    } else {
      url = `/api/custom-playlists/${selected.data.id}/export-m3u`;
      filename = `${selected.data.name.replace(/[^\w\s-]/g, '')}.m3u`;
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

  const isCurrentPlaylistPlaying = () => {
    if (!currentTrack || !viewTracks.length) return false;
    return viewTracks.some(t => String(t.ratingKey) === String(currentTrack.ratingKey));
  };

  const handlePlayPlaylist = async () => {
    setAnchorEl(null);
    if (!viewTracks.length) return;
    await queueManager.clearQueue();
    const result = await queueManager.addMultipleToQueue(viewTracks, selected?.data);
    if (result.success && onPlayTrack) {
      onPlayTrack(viewTracks[0]);
      showSnackbar(`Playing: ${selected?.data?.title || selected?.data?.name}`);
    }
  };

  const handleEnqueuePlaylist = async () => {
    setAnchorEl(null);
    if (!viewTracks.length) return;
    const result = await queueManager.addMultipleToQueue(viewTracks, selected?.data);
    if (result.success) {
      showSnackbar(`Added ${result.addedCount} track${result.addedCount !== 1 ? 's' : ''} to queue`);
    } else {
      showSnackbar('All tracks are already in the queue', 'info');
    }
  };

  const isSelectedPlex = (pl) => selected?.type === 'plex' && selected.data.ratingKey === pl.ratingKey;
  const isSelectedCustom = (pl) => selected?.type === 'custom' && selected.data.id === pl.id;

  const Sidebar = () => (
    <List
      sx={{
        height: '100%',
        overflowY: 'auto',
        px: 0,
        pt: `${NAVBAR_HEIGHT + 20}px`,
        pb: `${PLAYER_HEIGHT + 20}px`
      }}
      className="custom-scrollbar"
    >
      {/* ── Custom Playlists ── */}
      <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
          My Playlists
        </Typography>
        <Tooltip title="Create playlist">
          <IconButton size="small" onClick={() => setCreateOpen(true)}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {customLoading ? (
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        </Box>
      ) : customPlaylists.length === 0 ? (
        <Box sx={{ px: 2, pb: 1 }}>
          <Button
            startIcon={<AddIcon />}
            size="small"
            variant="outlined"
            fullWidth
            onClick={() => setCreateOpen(true)}
            sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
          >
            Create your first playlist
          </Button>
        </Box>
      ) : (
        customPlaylists.map(pl => (
          <ListItem key={`custom_${pl.id}`} disablePadding
            secondaryAction={
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); handleDeleteCustomPlaylist(pl); }}
                sx={{ opacity: 0, '.MuiListItem-root:hover &': { opacity: 1 } }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemButton
              selected={isSelectedCustom(pl)}
              onClick={() => handleSelectCustom(pl)}
              sx={{ py: 1.5, px: 2.5 }}
            >
              <ListItemText
                primary={pl.name}
                secondary={
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span>{pl.track_count} track{pl.track_count !== 1 ? 's' : ''}</span>
                    {pl.genre && <Chip label={pl.genre} size="small" sx={{ height: 16, fontSize: '0.65rem' }} />}
                  </Box>
                }
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItemButton>
          </ListItem>
        ))
      )}

      <Divider sx={{ my: 1 }} />

      {/* ── Plex Playlists ── */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
          Plex Playlists
        </Typography>
      </Box>

      {plexLoading ? (
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        </Box>
      ) : plexPlaylists.length === 0 ? (
        <Box sx={{ px: 2 }}>
          <Typography variant="body2" color="text.secondary">No Plex playlists found.</Typography>
        </Box>
      ) : (
        plexPlaylists.map(pl => (
          <ListItem key={pl.ratingKey} disablePadding>
            <ListItemButton
              selected={isSelectedPlex(pl)}
              onClick={() => handleSelectPlex(pl)}
              sx={{ py: 1.5, px: 2.5 }}
            >
              <ListItemText
                primary={pl.title}
                secondary={`${pl.leafCount} tracks`}
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        ))
      )}
    </List>
  );

  const nowPlaying = isCurrentPlaylistPlaying();

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Desktop Sidebar */}
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
        <Sidebar />
      </Box>

      {/* Mobile chips */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, width: '100%', p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Playlists</Typography>
          <Button startIcon={<AddIcon />} size="small" onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none' }}>
            New
          </Button>
        </Stack>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {customPlaylists.map(pl => (
            <Chip
              key={`c_${pl.id}`}
              label={pl.name}
              onClick={() => handleSelectCustom(pl)}
              color={isSelectedCustom(pl) ? 'primary' : 'default'}
              variant={isSelectedCustom(pl) ? 'filled' : 'outlined'}
              size="small"
            />
          ))}
          {plexPlaylists.map(pl => (
            <Chip
              key={pl.ratingKey}
              label={pl.title}
              onClick={() => handleSelectPlex(pl)}
              color={isSelectedPlex(pl) ? 'secondary' : 'default'}
              variant={isSelectedPlex(pl) ? 'filled' : 'outlined'}
              size="small"
            />
          ))}
        </Box>
      </Box>

      {/* Main content area */}
      <Box
        ref={scrollContainerRef}
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
        {!selected ? (
          <Box sx={{ textAlign: 'center', py: 20 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>Select a playlist</Typography>
            <Typography color="text.secondary">Choose a playlist from the sidebar to view its tracks</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              sx={{ mt: 3, textTransform: 'none' }}
              onClick={() => setCreateOpen(true)}
            >
              Create new playlist
            </Button>
          </Box>
        ) : (
          <>
            <Card
              sx={{
                mb: 2.5,
                boxShadow: 3,
                bgcolor: nowPlaying ? 'primary.light' : 'background.paper',
                borderLeft: nowPlaying ? 4 : 0,
                borderLeftColor: 'primary.main',
                transition: 'all 0.2s'
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
                  <Stack spacing={0.75}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Typography variant="h5" component="h2" sx={{ color: nowPlaying ? '#000000' : 'inherit' }}>
                        {selected.data.title || selected.data.name}
                      </Typography>
                      {nowPlaying && (
                        <Chip label="Now Playing" size="small" sx={{ bgcolor: '#000000', color: '#ffffff', fontWeight: 600, fontSize: '0.7rem', height: '22px' }} />
                      )}
                      {selected.type === 'custom' && selected.data.genre && (
                        <Chip label={selected.data.genre} size="small" sx={{ bgcolor: '#ffffff', color: '#000000' }} />
                      )}
                    </Stack>
                    <Chip label={`${viewTracks.length} tracks`} color="primary" size="small" sx={{ width: 'fit-content', color: nowPlaying ? '#000000' : undefined }} />
                  </Stack>

                  <Stack direction="row" spacing={1.5} flexWrap="wrap">
                    <Button
                      variant="contained"
                      endIcon={<ArrowDropDownIcon />}
                      onClick={(e) => setAnchorEl(e.currentTarget)}
                      disabled={viewTracks.length === 0}
                      sx={{ fontWeight: 600, textTransform: 'none', bgcolor: '#000000', color: '#ffffff', '&:hover': { bgcolor: '#333333' } }}
                    >
                      Playlist Actions
                    </Button>

                    {selected.type === 'custom' && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteCustomPlaylist(selected.data)}
                        sx={{ fontWeight: 600, textTransform: 'none' }}
                      >
                        Delete
                      </Button>
                    )}
                  </Stack>
                </Stack>

                <Menu
                  anchorEl={anchorEl}
                  open={menuOpen}
                  onClose={() => setAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={handlePlayPlaylist}>
                    <ListItemIcon><PlayArrowIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Play Now</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleEnqueuePlaylist}>
                    <ListItemIcon><QueueMusicIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Enqueue Playlist</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => { setAnchorEl(null); exportPlaylistAsM3U(); }} disabled={viewTracks.length === 0}>
                    <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Export M3U</ListItemText>
                  </MenuItem>
                </Menu>
              </CardContent>
            </Card>

            {error ? (
              <Alert severity="error">{error}</Alert>
            ) : loadingTracks ? (
              <LoadingSpinner />
            ) : viewTracks.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <Typography color="text.secondary" variant="h6">This playlist is empty</Typography>
                {selected.type === 'custom' && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Add tracks by clicking the playlist icon on any track.
                  </Typography>
                )}
              </Box>
            ) : selected.type === 'custom' ? (
              <CustomPlaylistTrackList
                playlistId={selected.data.id}
                tracks={viewTracks}
                onTracksChange={setViewTracks}
                onPlayTrack={onPlayTrack}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onTogglePlayback={onTogglePlayback}
                onRemoveTrack={handleRemoveTrackFromView}
                onTrackAddedToPlaylist={handleTrackAddedToPlaylist}
              />
            ) : (
              <TrackList
                tracks={viewTracks}
                albumData={selected.data}
                onPlayTrack={onPlayTrack}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onTogglePlayback={onTogglePlayback}
                onTrackAddedToPlaylist={handleTrackAddedToPlaylist}
              />
            )}
          </>
        )}
      </Box>

      <BackToTop scrollContainerRef={scrollContainerRef} />

      <CreatePlaylistModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handlePlaylistCreated}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Playlists;
