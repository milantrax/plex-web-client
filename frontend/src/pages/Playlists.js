// src/pages/Playlists.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemText,
  Button, Typography, Chip, Stack, Divider, IconButton, Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getPlaylists } from '../api/plexApi';
import {
  getCustomPlaylists,
  deleteCustomPlaylist,
} from '../api/customPlaylistsApi';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { SIDEBAR_WIDTH, PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

function Playlists() {
  const navigate = useNavigate();
  const [plexPlaylists, setPlexPlaylists] = useState([]);
  const [plexLoading, setPlexLoading] = useState(true);

  const [customPlaylists, setCustomPlaylists] = useState([]);
  const [customLoading, setCustomLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);


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

  const handleDeleteCustomPlaylist = async (playlist) => {
    try {
      await deleteCustomPlaylist(playlist.id);
      setCustomPlaylists(prev => prev.filter(p => p.id !== playlist.id));
    } catch {
      // silently ignore
    }
  };

  const handlePlaylistCreated = (playlist) => {
    setCustomPlaylists(prev => [{ ...playlist, track_count: 0 }, ...prev]);
  };

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
              onClick={() => navigate('/playlist/custom/' + pl.id)}
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
              onClick={() => navigate('/playlist/plex/' + pl.ratingKey)}
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
              onClick={() => navigate('/playlist/custom/' + pl.id)}
              variant="outlined"
              size="small"
            />
          ))}
          {plexPlaylists.map(pl => (
            <Chip
              key={pl.ratingKey}
              label={pl.title}
              onClick={() => navigate('/playlist/plex/' + pl.ratingKey)}
              variant="outlined"
              size="small"
            />
          ))}
        </Box>
      </Box>

      {/* Main content area */}
      <Box
        sx={{
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          px: 2.5,
          pt: `${NAVBAR_HEIGHT + 20}px`,
          pb: `${PLAYER_HEIGHT + 20}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        className="custom-scrollbar"
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Select a playlist</Typography>
          <Typography color="text.secondary">Choose a playlist from the sidebar</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            sx={{ mt: 3, textTransform: 'none' }}
            onClick={() => setCreateOpen(true)}
          >
            Create new playlist
          </Button>
        </Box>
      </Box>

      <CreatePlaylistModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handlePlaylistCreated}
      />
    </Box>
  );
}

export default Playlists;
