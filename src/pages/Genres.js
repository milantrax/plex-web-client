// src/pages/Genres.js
import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, Typography, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getSections, getGenres } from '../api/plexApi';
import LoadingSpinner from '../components/LoadingSpinner';
import { SIDEBAR_WIDTH, PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';

function Genres() {
  const navigate = useNavigate();
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [musicSectionId, setMusicSectionId] = useState(null);

   useEffect(() => {
    const fetchMusicSection = async () => {
      setLoading(true);
      setError(null);
      try {
        const sections = await getSections();
        const sectionsArray = Array.isArray(sections) ? sections : [];
        const musicSection = sectionsArray.find(sec => sec.type === 'artist');
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
          setGenres(Array.isArray(genreData) ? genreData : []);
      } catch (err) {
          console.error("Failed to fetch genres:", err);
          setError("Failed to fetch genres.");
      } finally {
          setLoading(false);
      }
    };

    fetchGenres();
  }, [musicSectionId]);

  const handleGenreClick = (genre) => {
    navigate(`/genre/${genre.key}`, { state: { genreTitle: genre.title, sectionId: musicSectionId } });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <Box sx={{ textAlign: 'center', py: 10, px: 2 }}>
      <Typography color="error" variant="h6" sx={{ maxWidth: 600, mx: 'auto' }}>
        {error}
      </Typography>
    </Box>
  );
  if (!musicSectionId) return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography color="text.secondary" variant="h6">
        No music library found.
      </Typography>
    </Box>
  );
  if (genres.length === 0) return (
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
        <List sx={{ height: '100%', overflowY: 'auto', px: 0, pt: `${NAVBAR_HEIGHT + 20}px`, pb: `${PLAYER_HEIGHT + 20}px` }} className="custom-scrollbar">
          {genres.map(genre => (
            <ListItem key={genre.key} disablePadding>
              <ListItemButton
                onClick={() => handleGenreClick(genre)}
                sx={{ py: 1.5, px: 2.5 }}
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
              variant="outlined"
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
          pb: `${PLAYER_HEIGHT + 20}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        className="custom-scrollbar"
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Select a genre
          </Typography>
          <Typography color="text.secondary">
            Choose a genre from the sidebar to view its albums
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default Genres;
