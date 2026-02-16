// src/pages/Artists.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { getSections, getArtists } from '../api/plexApi';
import AlbumCard from '../components/AlbumCard';
import LoadingSpinner from '../components/LoadingSpinner';
import BackToTop from '../components/BackToTop';
import { NAVBAR_HEIGHT, PLAYER_HEIGHT } from '../theme/theme';

function Artists() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [musicSectionId, setMusicSectionId] = useState(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const ARTISTS_PER_PAGE = 100;

  const scrollContainerRef = useRef(null);

  const loadMoreArtists = useCallback(async () => {
    if (loadingMore || !hasMorePages || !musicSectionId) return;

    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const startIndex = nextPage * ARTISTS_PER_PAGE;

      const moreArtists = await getArtists(musicSectionId, startIndex, ARTISTS_PER_PAGE);

      if (moreArtists.length > 0) {
        setArtists(prevArtists => [...prevArtists, ...moreArtists]);
        setCurrentPage(nextPage);

        if (moreArtists.length < ARTISTS_PER_PAGE) {
          setHasMorePages(false);
        }
      } else {
        setHasMorePages(false);
      }
    } catch (err) {
      console.error("Failed to load more artists:", err);
      setHasMorePages(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMorePages, musicSectionId, currentPage, ARTISTS_PER_PAGE]);

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMorePages) return;

      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 200) {
        loadMoreArtists();
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [loadMoreArtists, loadingMore, hasMorePages]);

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
          console.warn("No music library section found.");
          setError("Could not find a music library section on your Plex server.");
        }
      } catch (err) {
        console.error("Failed to fetch sections:", err);
        setError("Failed to connect to Plex server or fetch library sections.");
      }
    };
    fetchMusicSection();
  }, []);

  useEffect(() => {
    const fetchArtists = async () => {
      if (!musicSectionId) {
        if (!error) setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const artistData = await getArtists(musicSectionId, 0, ARTISTS_PER_PAGE);
        setArtists(artistData);
        setCurrentPage(0);
        setHasMorePages(artistData.length === ARTISTS_PER_PAGE);
      } catch (err) {
        console.error("Failed to fetch artists:", err);
        setError("Failed to fetch artists from the music library.");
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, [musicSectionId, error, ARTISTS_PER_PAGE]);

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
  if (artists.length === 0) return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography color="text.secondary" variant="h6">
        No artists found in this library.
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
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
        Artists
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {artists.length} artist{artists.length !== 1 ? 's' : ''} loaded
        {hasMorePages && ' (scroll for more)'}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        {artists.map(artist => (
          <AlbumCard
            key={artist.ratingKey}
            album={artist}
            isArtist={true}
          />
        ))}
      </Box>

      {loadingMore && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <LoadingSpinner />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Loading more artists...
          </Typography>
        </Box>
      )}

      {!hasMorePages && artists.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography color="text.secondary">
            You've reached the end ({artists.length} artists total)
          </Typography>
        </Box>
      )}

      <BackToTop scrollContainerRef={scrollContainerRef} />
    </Box>
  );
}

export default Artists;
