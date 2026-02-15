// src/pages/Playlists.js
import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, Card, CardContent, Button, Typography, Chip, Stack } from '@mui/material';
import { getPlaylists, getPlaylistItems } from '../api/plexApi';
import { PLEX_URL, PLEX_TOKEN } from '../config';
import LoadingSpinner from '../components/LoadingSpinner';
import TrackList from '../components/TrackList';
import { SIDEBAR_WIDTH, PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';

function Playlists({ onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

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
          {playlists.map(playlist => (
            <ListItem key={playlist.ratingKey} disablePadding>
              <ListItemButton
                selected={selectedPlaylist?.ratingKey === playlist.ratingKey}
                onClick={() => handlePlaylistClick(playlist)}
                sx={{ py: 1.5, px: 2.5 }}
              >
                <ListItemText
                  primary={playlist.title}
                  secondary={`${playlist.leafCount} tracks`}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Mobile Playlists Dropdown */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, width: '100%', p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Playlist:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {playlists.map(playlist => (
            <Chip
              key={playlist.ratingKey}
              label={playlist.title}
              onClick={() => handlePlaylistClick(playlist)}
              color={selectedPlaylist?.ratingKey === playlist.ratingKey ? 'primary' : 'default'}
              variant={selectedPlaylist?.ratingKey === playlist.ratingKey ? 'filled' : 'outlined'}
            />
          ))}
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
            <Card sx={{ mb: 2.5, boxShadow: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
                  <Stack spacing={1}>
                    <Typography variant="h5" component="h2">
                      {selectedPlaylist.title}
                    </Typography>
                    <Chip label={`${playlistTracks.length} tracks`} color="primary" size="small" />
                  </Stack>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={exportPlaylistAsM3U}
                    disabled={playlistTracks.length === 0}
                    title="Export playlist as M3U file"
                  >
                    Export M3U
                  </Button>
                </Stack>
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
    </Box>
  );
}

export default Playlists;
