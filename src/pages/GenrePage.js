// src/pages/GenrePage.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Stack, Divider, Select, MenuItem, FormControl,
  List, ListItem, ListItemButton, ListItemText
} from '@mui/material';
import { getSections, getGenres, getAlbumsByGenre } from '../api/plexApi';
import AlbumCard from '../components/AlbumCard';
import LoadingSpinner from '../components/LoadingSpinner';
import BackToTop from '../components/BackToTop';
import { SIDEBAR_WIDTH, PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';
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
  const navigate = useNavigate();
  const { currentTrack, isPlaying, onPlayTrack, onTogglePlayback } = usePlayback();

  const [genreTitle, setGenreTitle] = useState(location.state?.genreTitle || genreKey);
  const [genres, setGenres] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [sectionId, setSectionId] = useState(location.state?.sectionId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const scrollContainerRef = useRef(null);

  // Resolve sectionId and fetch genres list once
  useEffect(() => {
    const init = async () => {
      let sid = location.state?.sectionId;
      if (!sid) {
        try {
          const sections = await getSections();
          const musicSection = (Array.isArray(sections) ? sections : []).find(s => s.type === 'artist');
          sid = musicSection?.key;
        } catch {
          // sectionId stays null; handled below
        }
      }
      if (sid) {
        setSectionId(sid);
        try {
          const genreData = await getGenres(sid, 9);
          setGenres(Array.isArray(genreData) ? genreData : []);
        } catch {
          // genres list is non-critical; leave empty
        }
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch albums whenever genreKey or sectionId changes
  useEffect(() => {
    if (!sectionId) return;
    const fetchAlbums = async () => {
      setLoading(true);
      setError(null);
      setSelectedYear('');
      try {
        if (location.state?.genreTitle) setGenreTitle(location.state.genreTitle);
        const albumData = await getAlbumsByGenre(sectionId, genreKey, 9);
        setAlbums(Array.isArray(albumData) ? albumData : []);
      } catch {
        setError('Failed to load genre albums.');
      } finally {
        setLoading(false);
      }
    };
    fetchAlbums();
  }, [genreKey, sectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenreClick = (genre) => {
    setGenreTitle(genre.title);
    navigate(`/genre/${genre.key}`, { state: { genreTitle: genre.title, sectionId } });
  };

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

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 10, px: 2 }}>
        <Typography color="error" variant="h6">{error}</Typography>
      </Box>
    );
  }

  const grouped = groupAlbumsByYear(albums);

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          height: '100%',
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: { xs: 'none', md: 'block' },
          flexShrink: 0,
        }}
      >
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
          {genres.map(genre => (
            <ListItem key={genre.key} disablePadding>
              <ListItemButton
                selected={genre.key === genreKey}
                onClick={() => handleGenreClick(genre)}
                sx={{ py: 1.5, px: 2.5 }}
              >
                <ListItemText primary={genre.title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Main content */}
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
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
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
          </>
        )}
      </Box>

      <BackToTop scrollContainerRef={scrollContainerRef} />
    </Box>
  );
};

export default GenrePage;
