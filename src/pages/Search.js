// src/pages/Search.js
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Button, Typography, Chip, Stack } from '@mui/material';
import { searchAlbumsWithMatchingTracks } from '../api/plexApi';
import AlbumCard from '../components/AlbumCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { getAlbumCardWidth } from '../utils/settingsStorage';

class Search extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      albums: [],
      isLoading: false,
      error: null,
      query: '',
      expandedItems: new Set(),
      cardWidth: getAlbumCardWidth()
    };

    this.searchAlbums = this.searchAlbums.bind(this);
    this.toggleExpanded = this.toggleExpanded.bind(this);
    this.handleWidthChange = this.handleWidthChange.bind(this);
  }

  componentDidMount() {
    const urlParams = new URLSearchParams(this.props.location.search);
    const query = urlParams.get('q');

    if (query) {
      this.setState({ query });
      this.searchAlbums(query);
    }

    window.addEventListener('albumCardWidthChanged', this.handleWidthChange);
  }

  componentWillUnmount() {
    window.removeEventListener('albumCardWidthChanged', this.handleWidthChange);
  }

  handleWidthChange = (event) => {
    this.setState({ cardWidth: event.detail.width });
  };

  componentDidUpdate(prevProps) {
    const prevParams = new URLSearchParams(prevProps.location.search);
    const currentParams = new URLSearchParams(this.props.location.search);
    const prevQuery = prevParams.get('q');
    const currentQuery = currentParams.get('q');

    if (prevQuery !== currentQuery && currentQuery) {
      this.setState({ query: currentQuery });
      this.searchAlbums(currentQuery);
    }
  }

  async searchAlbums(query) {
    if (!query || query.trim().length < 2) {
      this.setState({ albums: [], error: null });
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      const albums = await searchAlbumsWithMatchingTracks(query);
      this.setState({
        albums,
        isLoading: false
      });
    } catch (error) {
      console.error('Search error:', error);
      this.setState({
        error: 'Failed to search albums. Please try again.',
        isLoading: false,
        albums: []
      });
    }
  }

  toggleExpanded(albumKey) {
    this.setState(prevState => {
      const newExpandedItems = new Set(prevState.expandedItems);
      if (newExpandedItems.has(albumKey)) {
        newExpandedItems.delete(albumKey);
      } else {
        newExpandedItems.add(albumKey);
      }
      return { expandedItems: newExpandedItems };
    });
  }

  render() {
    const { albums, isLoading, error, query, expandedItems, cardWidth } = this.state;
    const {
      currentTrack,
      isPlaying,
      onPlayTrack,
      onTogglePlayback,
      onCurrentTrackChange
    } = this.props;

    return (
      <Box sx={{ px: 2.5, py: 2.5 }} style={{'--card-width': `${cardWidth}px`}}>
        {query && (
          <Box sx={{ mb: 2.5 }}>
            <Typography color="text.secondary">
              Showing results for: <strong style={{ color: 'inherit' }}>"{query}"</strong>
            </Typography>
          </Box>
        )}

        {isLoading && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <LoadingSpinner />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Searching for albums and tracks...
            </Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <Card sx={{ maxWidth: 400, width: '100%', boxShadow: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" color="error" sx={{ mb: 2 }}>
                  Search Error
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {error}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => this.searchAlbums(query)}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </Box>
        )}

        {!isLoading && !error && albums.length === 0 && query && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
              No Results Found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              No albums or tracks found matching "{query}".
            </Typography>
            <Typography color="text.secondary">
              Try searching with different keywords or check your spelling.
            </Typography>
          </Box>
        )}

        {!isLoading && !error && albums.length > 0 && (
          <Box>
            <Card sx={{ mb: 2.5, boxShadow: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
                  <Typography sx={{ fontWeight: 500 }}>
                    Found {albums.length} album{albums.length !== 1 ? 's' : ''}
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    {albums.filter(album => album.matchType === 'album').length > 0 && (
                      <Chip
                        label={`${albums.filter(album => album.matchType === 'album').length} album title matches`}
                        variant="outlined"
                        color="primary"
                        size="small"
                      />
                    )}
                    {albums.filter(album => album.matchType === 'track').length > 0 && (
                      <Chip
                        label={`${albums.filter(album => album.matchType === 'track').length} albums with matching tracks`}
                        variant="outlined"
                        color="primary"
                        size="small"
                      />
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
              {albums.map(album => {
                const isExpanded = expandedItems.has(album.ratingKey);
                const hasTrackMatch = album.matchType === 'track' && album.matchingTrack;

                return (
                  <Box key={album.ratingKey} sx={{ position: 'relative' }}>
                    <AlbumCard
                      album={album}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      onPlayTrack={onPlayTrack}
                      onTogglePlayback={onTogglePlayback}
                      onCurrentTrackChange={onCurrentTrackChange}
                    />
                    {hasTrackMatch && (
                      <Box sx={{ mt: 1, mx: 1 }}>
                        <Button
                          variant="text"
                          fullWidth
                          onClick={() => this.toggleExpanded(album.ratingKey)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1
                          }}
                        >
                          <Typography
                            component="span"
                            color="primary"
                            sx={{ fontWeight: 700, fontSize: '1.125rem' }}
                          >
                            {isExpanded ? '−' : '+'}
                          </Typography>
                          <Typography variant="body2">Track Match</Typography>
                        </Button>
                        {isExpanded && (
                          <Card sx={{ mt: 1, boxShadow: 2 }}>
                            <CardContent sx={{ p: 1.5 }}>
                              <Chip
                                label="Track Match"
                                color="primary"
                                size="small"
                                sx={{ mb: 1 }}
                              />
                              <Typography variant="body2" color="text.secondary">
                                Contains: "{album.matchingTrack}"
                              </Typography>
                            </CardContent>
                          </Card>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {!query && !isLoading && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              Search Music
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Use the search bar above to find albums and tracks in your Plex library.
            </Typography>
            <Card sx={{ maxWidth: 600, mx: 'auto', boxShadow: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Search Tips:
                </Typography>
                <Stack spacing={1} sx={{ textAlign: 'left' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Typography color="primary" sx={{ mt: 0.5 }}>•</Typography>
                    <Typography color="text.secondary">
                      Search by album name, artist name, or song title
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Typography color="primary" sx={{ mt: 0.5 }}>•</Typography>
                    <Typography color="text.secondary">
                      Use partial words - "beet" will find "The Beatles"
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Typography color="primary" sx={{ mt: 0.5 }}>•</Typography>
                    <Typography color="text.secondary">
                      Search is case-insensitive
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Typography color="primary" sx={{ mt: 0.5 }}>•</Typography>
                    <Typography color="text.secondary">
                      Results include albums that contain matching tracks
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    );
  }
}

const SearchWithRouter = (props) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const location = {
    search: `?${searchParams.toString()}`
  };

  return <Search {...props} location={location} navigate={navigate} />;
};

export default SearchWithRouter;
