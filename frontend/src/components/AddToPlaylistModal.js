import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemButton, ListItemText, ListItemIcon,
  Button, Typography, Alert, Box, Chip, Divider, CircularProgress
} from '@mui/material';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import AddIcon from '@mui/icons-material/Add';
import { getCustomPlaylists, addTrackToCustomPlaylist } from '../api/customPlaylistsApi';

export default function AddToPlaylistModal({ open, track, onClose, onOpenCreate, onTrackAdded }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (open) {
      setFeedback(null);
      setLoading(true);
      getCustomPlaylists()
        .then(setPlaylists)
        .catch(() => setFeedback({ severity: 'error', message: 'Failed to load playlists' }))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleAdd = async (playlist) => {
    setAdding(playlist.id);
    setFeedback(null);

    try {
      await addTrackToCustomPlaylist(playlist.id, track);
      setFeedback({ severity: 'success', message: `Added to "${playlist.name}"` });
      if (onTrackAdded) onTrackAdded(playlist.id);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to add track';
      setFeedback({ severity: err.response?.status === 409 ? 'info' : 'error', message: msg });
    } finally {
      setAdding(null);
    }
  };

  const handleCreateNew = () => {
    onClose();
    onOpenCreate();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Add to Playlist
        {track && (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400, mt: 0.25 }}>
            {track.title}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 0, pb: 1, minHeight: 120 }}>
        {feedback && (
          <Alert severity={feedback.severity} sx={{ mb: 1.5 }}>
            {feedback.message}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : playlists.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No playlists yet.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {playlists.map((pl) => (
              <ListItem key={pl.id} disablePadding>
                <ListItemButton
                  onClick={() => handleAdd(pl)}
                  disabled={adding === pl.id}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {adding === pl.id
                      ? <CircularProgress size={18} />
                      : <QueueMusicIcon fontSize="small" />
                    }
                  </ListItemIcon>
                  <ListItemText
                    primary={pl.name}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                        <span>{pl.track_count} track{pl.track_count !== 1 ? 's' : ''}</span>
                        {pl.genre && (
                          <Chip label={pl.genre} size="small" sx={{ height: 16, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2, py: 1.5, justifyContent: 'space-between' }}>
        <Button
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          size="small"
          sx={{ textTransform: 'none' }}
        >
          New Playlist
        </Button>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
