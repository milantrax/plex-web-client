// src/pages/Library.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Card, CardContent, FormControl, InputLabel, Select, MenuItem, Button, Typography, Stack } from '@mui/material';
import { getSections, getSectionItems, getGenres, getYears, getLabels, getAlbumsByGenre, getAlbumsByYear, getAlbumsByLabel } from '../api/plexApi';
import AlbumCard from '../components/AlbumCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { NAVBAR_HEIGHT, PLAYER_HEIGHT } from '../theme/theme';

function Library({ onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [musicSectionId, setMusicSectionId] = useState(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const ALBUMS_PER_PAGE = 100;

  const [genres, setGenres] = useState([]);
  const [years, setYears] = useState([]);
  const [labels, setLabels] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [filtersLoading, setFiltersLoading] = useState(false);

  const scrollContainerRef = useRef(null);

  const loadMoreAlbums = useCallback(async () => {
    if (loadingMore || !hasMorePages || !musicSectionId) return;

    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const startIndex = nextPage * ALBUMS_PER_PAGE;

      let moreAlbums;

      if (selectedGenre || selectedYear || selectedLabel) {
        setHasMorePages(false);
        return;
      } else {
        moreAlbums = await getSectionItems(musicSectionId, 9, startIndex, ALBUMS_PER_PAGE);
      }

      if (moreAlbums.length > 0) {
        setAlbums(prevAlbums => [...prevAlbums, ...moreAlbums]);
        setCurrentPage(nextPage);

        if (moreAlbums.length < ALBUMS_PER_PAGE) {
          setHasMorePages(false);
        }
      } else {
        setHasMorePages(false);
      }
    } catch (err) {
      console.error("Failed to load more albums:", err);
      setHasMorePages(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMorePages, musicSectionId, currentPage, selectedGenre, selectedYear, selectedLabel, ALBUMS_PER_PAGE]);

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMorePages) return;

      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 200) {
        loadMoreAlbums();
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [loadMoreAlbums, loadingMore, hasMorePages]);

  useEffect(() => {
    const fetchMusicSection = async () => {
      setLoading(true);
      setError(null);
      try {
        const sections = await getSections();
        // Find the first section of type 'artist' (which signifies a music library)
        const musicSection = sections.find(sec => sec.type === 'artist');
        if (musicSection) {
          setMusicSectionId(musicSection.key);
        } else {
           console.warn("No music library section found.");
           setError("Could not find a music library section on your Plex server.");
        }
      } catch (err) {
         console.error("Failed to fetch sections:", err);
         setError("Failed to connect to Plex server or fetch library sections.");
      } finally {
         // Don't stop loading here, wait for albums to load or error out
      }
    };
    fetchMusicSection();
  }, []);

   useEffect(() => {
     const fetchAlbums = async () => {
         if (!musicSectionId) {
             if (!error) setLoading(false);
             return;
         };
         setLoading(true);
         setError(null);
         try {
            const albumData = await getSectionItems(musicSectionId, 9, 0, ALBUMS_PER_PAGE);
            setAlbums(albumData);
            setCurrentPage(0);
            setHasMorePages(albumData.length === ALBUMS_PER_PAGE);
         } catch (err) {
             console.error("Failed to fetch albums:", err);
             setError("Failed to fetch albums from the music library.");
         } finally {
            setLoading(false);
         }
     };

     fetchAlbums();
  }, [musicSectionId, error]);

  useEffect(() => {
    const fetchFilters = async () => {
      if (!musicSectionId) return;

      setFiltersLoading(true);
      try {
        console.log('Fetching filters for music section:', musicSectionId);
        const [genresData, yearsData, labelsData] = await Promise.all([
          getGenres(musicSectionId, 9, false),
          getYears(musicSectionId, 9, false),
          getLabels(musicSectionId, 9, false)
        ]);
        console.log('Genres received:', genresData);
        console.log('Years received:', yearsData);
        console.log('Labels received:', labelsData);
        setGenres(genresData);
        setYears(yearsData.sort((a, b) => parseInt(b.title) - parseInt(a.title)));
        setLabels(labelsData.sort((a, b) => a.title.localeCompare(b.title)));
      } catch (err) {
        console.error("Failed to fetch filters:", err);
      } finally {
        setFiltersLoading(false);
      }
    };

    fetchFilters();
  }, [musicSectionId]);

  const handleGenreChange = async (genreSelection) => {
    setSelectedGenre(genreSelection);
    setCurrentPage(0);
    setHasMorePages(false);
    await applyFilters(genreSelection, selectedYear, selectedLabel);
  };

  const handleYearChange = async (yearSelection) => {
    setSelectedYear(yearSelection);
    setCurrentPage(0);
    setHasMorePages(false);
    await applyFilters(selectedGenre, yearSelection, selectedLabel);
  };

  const handleLabelChange = async (labelSelection) => {
    setSelectedLabel(labelSelection);
    setCurrentPage(0);
    setHasMorePages(false);
    await applyFilters(selectedGenre, selectedYear, labelSelection);
  };

  const applyFilters = async (genreFilter, yearFilter, labelFilter) => {
    if (!musicSectionId) return;

    setLoading(true);
    try {
      let filteredAlbums;

      const activeFilters = [];
      if (genreFilter) activeFilters.push({ type: 'genre', value: genreFilter });
      if (yearFilter) activeFilters.push({ type: 'year', value: yearFilter });
      if (labelFilter) activeFilters.push({ type: 'label', value: labelFilter });

      if (activeFilters.length === 0) {
        const albumData = await getSectionItems(musicSectionId, 9, 0, ALBUMS_PER_PAGE);
        setAlbums(albumData);
        setCurrentPage(0);
        setHasMorePages(albumData.length === ALBUMS_PER_PAGE);
        return;
      } else if (activeFilters.length === 1) {
        const filter = activeFilters[0];
        if (filter.type === 'genre') {
          filteredAlbums = await getAlbumsByGenre(musicSectionId, filter.value);
        } else if (filter.type === 'year') {
          filteredAlbums = await getAlbumsByYear(musicSectionId, filter.value);
        } else if (filter.type === 'label') {
          filteredAlbums = await getAlbumsByLabel(musicSectionId, filter.value);
        }
      } else {
        const filterPromises = activeFilters.map(filter => {
          if (filter.type === 'genre') {
            return getAlbumsByGenre(musicSectionId, filter.value);
          } else if (filter.type === 'year') {
            return getAlbumsByYear(musicSectionId, filter.value);
          } else if (filter.type === 'label') {
            return getAlbumsByLabel(musicSectionId, filter.value);
          }
          return Promise.resolve([]);
        });

        const filterResults = await Promise.all(filterPromises);

        filteredAlbums = filterResults[0].filter(album =>
          filterResults.every(result =>
            result.some(resultAlbum => resultAlbum.ratingKey === album.ratingKey)
          )
        );
      }

      setAlbums(filteredAlbums);
    } catch (err) {
      console.error("Failed to apply filters:", err);
      setError("Failed to filter albums.");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = async () => {
    setSelectedGenre('');
    setSelectedYear('');
    setSelectedLabel('');

    setLoading(true);
    try {
      const albumData = await getSectionItems(musicSectionId, 9, 0, ALBUMS_PER_PAGE);
      setAlbums(albumData);
      setCurrentPage(0);
      setHasMorePages(albumData.length === ALBUMS_PER_PAGE);
    } catch (err) {
      console.error("Failed to reset to first page:", err);
      setError("Failed to reset albums.");
    } finally {
      setLoading(false);
    }
  };


  if (loading) return <LoadingSpinner />;
  if (error) return (
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
  if (albums.length === 0 && !selectedGenre && !selectedYear && !selectedLabel) return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography color="text.secondary" variant="h6">
        No albums found in this library.
      </Typography>
    </Box>
  );

  return (
    <Box
      ref={scrollContainerRef}
      sx={{
        height: '100%',
        overflowY: 'auto',
        px: 2.5,
        pt: `${NAVBAR_HEIGHT + 20}px`,
        pb: `${PLAYER_HEIGHT + 20}px`
      }}
      className="custom-scrollbar"
    >
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" flexWrap="wrap" spacing={2} alignItems="flex-end" sx={{ mb: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="genre-filter-label">Genre</InputLabel>
              <Select
                labelId="genre-filter-label"
                id="genre-filter"
                value={selectedGenre}
                label="Genre"
                onChange={(e) => handleGenreChange(e.target.value)}
                disabled={filtersLoading}
              >
                <MenuItem value="">All Genres</MenuItem>
                {genres.map(genre => (
                  <MenuItem key={genre.id} value={genre.tag || genre.title}>
                    {genre.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="year-filter-label">Year</InputLabel>
              <Select
                labelId="year-filter-label"
                id="year-filter"
                value={selectedYear}
                label="Year"
                onChange={(e) => handleYearChange(e.target.value)}
                disabled={filtersLoading}
              >
                <MenuItem value="">All Years</MenuItem>
                {years.map(year => (
                  <MenuItem key={year.id} value={year.title}>
                    {year.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="label-filter-label">Label</InputLabel>
              <Select
                labelId="label-filter-label"
                id="label-filter"
                value={selectedLabel}
                label="Label"
                onChange={(e) => handleLabelChange(e.target.value)}
                disabled={filtersLoading}
              >
                <MenuItem value="">All Labels</MenuItem>
                {labels.map(label => (
                  <MenuItem key={label.id} value={label.tag || label.title}>
                    {label.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {(selectedGenre || selectedYear || selectedLabel) && (
              <Button
                variant="contained"
                color="primary"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {selectedGenre || selectedYear || selectedLabel ? (
              <span>
                {albums.length} album{albums.length !== 1 ? 's' : ''} found
                {selectedGenre && ` in ${genres.find(g => (g.tag || g.title) === selectedGenre)?.title || 'selected genre'}`}
                {selectedYear && ` from ${years.find(y => y.title === selectedYear)?.title || selectedYear}`}
                {selectedLabel && ` with label ${labels.find(l => (l.tag || l.title) === selectedLabel)?.title || 'selected label'}`}
              </span>
            ) : (
              <span>
                {albums.length} album{albums.length !== 1 ? 's' : ''} loaded
                {hasMorePages && ' (scroll for more)'}
              </span>
            )}
          </Typography>
        </CardContent>
      </Card>

      {albums.length === 0 && (selectedGenre || selectedYear || selectedLabel) ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography color="text.secondary" variant="h6">
            No albums found matching the selected filters.
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {albums.map(album => (
              <AlbumCard key={album.ratingKey} album={album} onPlayTrack={onPlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlayback={onTogglePlayback} />
            ))}
          </Box>

          {loadingMore && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <LoadingSpinner />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Loading more albums...
              </Typography>
            </Box>
          )}

          {!hasMorePages && albums.length > 0 && !selectedGenre && !selectedYear && !selectedLabel && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography color="text.secondary">
                You've reached the end of your library ({albums.length} albums total)
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

export default Library;
