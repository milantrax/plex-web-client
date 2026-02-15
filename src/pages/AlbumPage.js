import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Divider, Stack } from '@mui/material';
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
          borderRight: { xs: 0, md: 1 },
          borderBottom: { xs: 1, md: 0 },
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflowY: 'auto',
          p: 3
        }}
        className="custom-scrollbar"
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

            {album.genre && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Genre
                </Typography>
                <Typography variant="body2">
                  {Array.isArray(album.Genre)
                    ? album.Genre.map(g => g.tag).join(', ')
                    : album.genre}
                </Typography>
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
        </Stack>
      </Box>

      {/* Right Column - Track List */}
      <Box
        sx={{
          flex: 1,
          height: { xs: 'auto', md: '100%' },
          overflowY: 'auto',
          p: { xs: 2, md: 3 }
        }}
        className="custom-scrollbar"
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, px: 2 }}>
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
    </Box>
  );
};

export default AlbumPage;
