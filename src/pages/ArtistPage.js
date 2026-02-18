// src/pages/ArtistPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { getPlexImageUrl, getArtistAlbums, getMetadata } from '../api/plexApi';
import AlbumCard from '../components/AlbumCard';
import LoadingSpinner from '../components/LoadingSpinner';
import BackToTop from '../components/BackToTop';
import { PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';
import { usePlayback } from '../contexts/PlaybackContext';

const ArtistPage = () => {
  const { currentTrack, isPlaying, onPlayTrack, onTogglePlayback } = usePlayback();
  const { artistId } = useParams();
  const [artist, setArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        setLoading(true);

        const artistData = await getMetadata(artistId);

        if (artistData) {
          setArtist(artistData);
          const albumsData = await getArtistAlbums(artistId);
          setAlbums(albumsData);
        } else {
          setError('Artist data not found');
        }
      } catch (error) {
        console.error('Error fetching artist data:', error);
        setError('Failed to load artist data');
      } finally {
        setLoading(false);
      }
    };

    fetchArtistData();
  }, [artistId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !artist) {
    return (
      <Box sx={{ px: 2.5, py: 10, textAlign: 'center' }}>
        <Card sx={{ maxWidth: 400, mx: 'auto', boxShadow: 3 }}>
          <CardContent>
            <Typography color="error">
              {error || 'Artist not found'}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const artistImageUrl = getPlexImageUrl(artist.thumb || artist.art);

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        flexDirection: { xs: 'column', md: 'row' }
      }}
    >
      {/* Left Column - Artist Info */}
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
        {/* Artist Image */}
        {artistImageUrl ? (
          <Box
            component="img"
            src={artistImageUrl}
            alt={artist.title}
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
            No Image
          </Box>
        )}

        {/* Artist Name */}
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          {artist.title}
        </Typography>

        {/* Album Count */}
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {albums.length} Album{albums.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Right Column - Albums */}
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
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          Albums
        </Typography>

        {albums.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography color="text.secondary">
              No albums found for this artist.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {albums.map(album => (
              <AlbumCard
                key={album.ratingKey}
                album={album}
                onPlayTrack={onPlayTrack}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onTogglePlayback={onTogglePlayback}
              />
            ))}
          </Box>
        )}
      </Box>

      <BackToTop scrollContainerRef={scrollContainerRef} />
    </Box>
  );
};

export default ArtistPage;
