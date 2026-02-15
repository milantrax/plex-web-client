// src/pages/Genres.js
import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, Typography, Chip, Stack } from '@mui/material';
import { getSections, getGenres, getAlbumsByGenre } from '../api/plexApi';
import LoadingSpinner from '../components/LoadingSpinner';
import AlbumCard from '../components/AlbumCard';
import { SIDEBAR_WIDTH } from '../theme/theme';

function Genres({ onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) {
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [error, setError] = useState(null);
  const [musicSectionId, setMusicSectionId] = useState(null);

   useEffect(() => {
    const fetchMusicSection = async () => {
      setLoading(true);
      setError(null);
      try {
        const sections = await getSections();
        const musicSection = sections.find(sec => sec.type === 'artist');
        if (musicSection) {
          setMusicSectionId(musicSection.key);
        } else {
           setError("Could not find a music library section.");
           setLoading(false);
        }
      } catch (err) {
         setError("Failed to connect or fetch library sections.");
         setLoading(false);
      }
    };
    fetchMusicSection();
  }, []);

  useEffect(() => {
    const fetchGenres = async () => {
      if (!musicSectionId) return;
      setError(null);
      try {
          const genreData = await getGenres(musicSectionId, 9);
          setGenres(genreData);
      } catch (err) {
          console.error("Failed to fetch genres:", err);
          setError("Failed to fetch genres.");
      } finally {
          setLoading(false);
      }
    };

    fetchGenres();
  }, [musicSectionId]);

  useEffect(() => {
      const fetchAlbumsForGenre = async () => {
          if (!selectedGenre || !musicSectionId) return;
          setLoadingAlbums(true);
          setAlbums([]);
          setError(null);
          try {
              const albumData = await getAlbumsByGenre(musicSectionId, selectedGenre.key, 9);
              setAlbums(albumData);
          } catch (err) {
             console.error(`Failed to fetch albums for genre ${selectedGenre.title}:`, err);
             setError(`Failed to fetch albums for genre: ${selectedGenre.title}.`);
          } finally {
            setLoadingAlbums(false);
          }
      };
      fetchAlbumsForGenre();
  }, [selectedGenre, musicSectionId]);

  const handleGenreClick = (genre) => {
    setSelectedGenre(genre);
  };

  if (loading) return <LoadingSpinner />;
  if (error && !loadingAlbums) return (
    <Box sx={{ textAlign: 'center', py: 10, px: 2 }}>
      <Typography color="error" variant="h6" sx={{ maxWidth: 600, mx: 'auto' }}>
        {error}
      </Typography>
    </Box>
  );
  if (!musicSectionId && !error) return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography color="text.secondary" variant="h6">
        No music library found.
      </Typography>
    </Box>
  );
  if (genres.length === 0 && !error) return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography color="text.secondary" variant="h6">
        No genres found in this library.
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
        <List sx={{ height: '100%', overflowY: 'auto', p: 0 }} className="custom-scrollbar">
          {genres.map(genre => (
            <ListItem key={genre.key} disablePadding>
              <ListItemButton
                selected={selectedGenre?.key === genre.key}
                onClick={() => handleGenreClick(genre)}
              >
                <ListItemText primary={genre.title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Mobile Genres Dropdown */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, width: '100%', p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Genre:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {genres.map(genre => (
            <Chip
              key={genre.key}
              label={genre.title}
              onClick={() => handleGenreClick(genre)}
              color={selectedGenre?.key === genre.key ? 'primary' : 'default'}
              variant={selectedGenre?.key === genre.key ? 'filled' : 'outlined'}
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
          p: 2.5
        }}
        className="custom-scrollbar"
      >
        {selectedGenre ? (
          <>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                mb: 2.5,
                pb: 2,
                borderBottom: 1,
                borderColor: 'divider'
              }}
            >
              <Typography variant="h5" component="h3" sx={{ fontWeight: 700, m: 0 }}>
                {selectedGenre.title}
              </Typography>
              <Chip
                label={`${albums.length} album${albums.length !== 1 ? 's' : ''}`}
                color="primary"
                size="small"
              />
            </Stack>

            {loadingAlbums ? (
              <LoadingSpinner />
            ) : albums.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <Typography color="text.secondary" variant="h6">
                  No albums found for this genre
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
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 20 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Select a genre
            </Typography>
            <Typography color="text.secondary" sx={{ m: 0 }}>
              Choose a genre from the sidebar to view its albums
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default Genres;
