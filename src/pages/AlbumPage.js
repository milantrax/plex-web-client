import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, Button, Typography, Card, CardContent, Grid } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getPlexImageUrl, getAlbumTracks } from '../api/plexApi';
import axios from 'axios';
import TrackList from '../components/TrackList';
import LoadingSpinner from '../components/LoadingSpinner';
import { PLEX_URL, PLEX_TOKEN } from '../config';

const AlbumPage = ({ onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) => {
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAlbumData = async () => {
      try {
        setLoading(true);

        const response = await axios.get(`${PLEX_URL}/library/metadata/${albumId}`, {
          headers: {
            'Accept': 'application/json',
            'X-Plex-Token': PLEX_TOKEN,
          }
        });

        if (response.data && response.data.MediaContainer && response.data.MediaContainer.Metadata) {
          setAlbum(response.data.MediaContainer.Metadata[0]);

          const tracksData = await getAlbumTracks(albumId);
          setTracks(tracksData);
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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !album) {
    return (
      <Box sx={{ px: 2.5, py: 10, textAlign: 'center' }}>
        <Card sx={{ maxWidth: 400, mx: 'auto', mb: 2.5, boxShadow: 3 }}>
          <CardContent>
            <Typography color="error">
              {error || 'Album not found'}
            </Typography>
          </CardContent>
        </Card>
        <Button
          component={Link}
          to="/"
          variant="contained"
          color="primary"
          sx={{ textDecoration: 'none' }}
        >
          Back to Library
        </Button>
      </Box>
    );
  }

  const albumArtUrl = getPlexImageUrl(album.thumb);

  return (
    <Box sx={{ px: 2.5, py: 2.5 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          component={Link}
          to="/"
          variant="text"
          startIcon={<ArrowBackIcon />}
          sx={{ textDecoration: 'none' }}
        >
          Back to Library
        </Button>
      </Box>

      <Grid
        container
        spacing={4}
        sx={{
          mb: 4,
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'center', md: 'flex-start' }
        }}
      >
        <Grid item xs={12} md="auto">
          {albumArtUrl ? (
            <Box
              component="img"
              src={albumArtUrl}
              alt={album.title}
              sx={{
                width: 300,
                height: 300,
                borderRadius: 2,
                boxShadow: 3,
                objectFit: 'cover'
              }}
            />
          ) : (
            <Box
              sx={{
                width: 300,
                height: 300,
                borderRadius: 2,
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                fontSize: '1.25rem'
              }}
            >
              No Cover
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, mt: 0 }}>
            {album.title}
          </Typography>
          <Typography variant="h5" sx={{ color: 'text.secondary', mb: 2, mt: 0, fontWeight: 400 }}>
            {album.parentTitle || 'Unknown Artist'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
            <Typography>{album.year || 'Unknown Year'}</Typography>
            <Typography>•</Typography>
            <Typography>{tracks.length} Track{tracks.length !== 1 ? 's' : ''}</Typography>
          </Box>
        </Grid>
      </Grid>

      <Card sx={{ boxShadow: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
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
  );
};

export default AlbumPage;
