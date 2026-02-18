// src/pages/GenrePage.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Box, Typography, Chip, Stack, Divider, Select, MenuItem, FormControl
} from '@mui/material';
import { getSections, getAlbumsByGenre } from '../api/plexApi';
import AlbumCard from '../components/AlbumCard';
import LoadingSpinner from '../components/LoadingSpinner';
import BackToTop from '../components/BackToTop';
import { PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';
import { usePlayback } from '../contexts/PlaybackContext';

const groupAlbumsByYear = (albums) => {
  const grouped = albums.reduce((acc, album) => {
    const year = album.year || 'Unknown';
    if (!acc[year]) acc[year] = [];
    acc[year].push(album);
    return acc;
  }, {});

  return Object.keys(grouped)
    .sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return Number(b) - Number(a);
    })
    .map(year => ({ year, albums: grouped[year] }));
};

const GenrePage = () => {
  const { genreKey } = useParams();
  const location = useLocation();
  const { currentTrack, isPlaying, onPlayTrack, onTogglePlayback } = usePlayback();

  const [genreTitle, setGenreTitle] = useState(location.state?.genreTitle || genreKey);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let sectionId = location.state?.sectionId;
        if (!sectionId) {
          const sections = await getSections();
          const musicSection = (Array.isArray(sections) ? sections : []).find(s => s.type === 'artist');
          sectionId = musicSection?.key;
        }
        if (!sectionId) {
          setError('Could not find a music library section.');
          return;
        }
        if (location.state?.genreTitle) {
          setGenreTitle(location.state.genreTitle);
        }
        const albumData = await getAlbumsByGenre(sectionId, genreKey, 9);
        setAlbums(Array.isArray(albumData) ? albumData : []);
      } catch {
        setError('Failed to load genre albums.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [genreKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    if (year) {
      setTimeout(() => {
        const yearElement = document.getElementById(`year-${year}`);
        const container = scrollContainerRef.current;
        if (yearElement && container) {
          const containerRect = container.getBoundingClientRect();
          const yearRect = yearElement.getBoundingClientRect();
          const offset = yearRect.top - containerRect.top + container.scrollTop;
          container.scrollTo({ top: offset - 20, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 10, px: 2 }}>
        <Typography color="error" variant="h6">{error}</Typography>
      </Box>
    );
  }

  const grouped = groupAlbumsByYear(albums);

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
        {/* Genre initial placeholder */}
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
            fontSize: '5rem',
            fontWeight: 700,
            mb: 3,
            boxShadow: 1
          }}
        >
          {genreTitle.charAt(0).toUpperCase()}
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {genreTitle}
        </Typography>
        <Typography variant="body1" color="text.secondary">
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
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
          sx={{ mb: 2.5 }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 700, m: 0 }}>
              {genreTitle}
            </Typography>
            {albums.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={selectedYear}
                  onChange={(e) => handleYearSelect(e.target.value)}
                  displayEmpty
                  sx={{ fontSize: '0.875rem', '& .MuiSelect-select': { py: 0.75 } }}
                >
                  <MenuItem value="">All Years</MenuItem>
                  {grouped.map(({ year }) => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
          <Chip
            label={`${albums.length} album${albums.length !== 1 ? 's' : ''}`}
            color="primary"
            size="small"
          />
        </Stack>

        {albums.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography color="text.secondary" variant="h6">
              No albums found for this genre
            </Typography>
          </Box>
        ) : (
          <Box>
            {grouped.map(({ year, albums: yearAlbums }) => (
              <Box key={year} id={`year-${year}`} sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary', flexShrink: 0 }}>
                    {year}
                  </Typography>
                  <Divider sx={{ flexGrow: 1 }} />
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  {yearAlbums.map(album => (
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
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <BackToTop scrollContainerRef={scrollContainerRef} />
    </Box>
  );
};

export default GenrePage;
