// src/components/SearchBar.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMusic, getPlexImageUrl } from '../api/plexApi';
import {
  TextField,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  Typography,
  Box,
  IconButton,
  InputAdornment,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import type { NavigateFunction } from 'react-router-dom';
import type { PlexAlbum, PlexTrack, SearchResults } from '../types';

/** Props of the exported, navigation-aware component. */
export interface SearchBarProps {
  onPlayTrack?: (track: PlexTrack) => void;
}

interface SearchBarInnerProps extends SearchBarProps {
  navigate: NavigateFunction;
}

interface SearchBarState {
  query: string;
  results: SearchResults;
  isLoading: boolean;
  showDropdown: boolean;
  error: string | null;
}

class SearchBar extends React.Component<SearchBarInnerProps, SearchBarState> {
  private searchInputRef: React.RefObject<HTMLInputElement | null>;
  private dropdownRef: React.RefObject<HTMLDivElement | null>;
  private searchTimeout: ReturnType<typeof setTimeout> | null;

  constructor(props: SearchBarInnerProps) {
    super(props);
    this.state = {
      query: '',
      results: { albums: [], tracks: [] },
      isLoading: false,
      showDropdown: false,
      error: null
    };

    this.searchInputRef = React.createRef<HTMLInputElement>();
    this.dropdownRef = React.createRef<HTMLDivElement>();
    this.searchTimeout = null;
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleInputFocus = this.handleInputFocus.bind(this);
    this.handleInputBlur = this.handleInputBlur.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleResultClick = this.handleResultClick.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.clearSearch = this.clearSearch.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  handleClickOutside(event: MouseEvent) {
    const target = event.target as Node;
    if (
      this.dropdownRef.current &&
      !this.dropdownRef.current.contains(target) &&
      !this.searchInputRef.current?.contains(target)
    ) {
      this.setState({ showDropdown: false });
    }
  }

  handleInputChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const query = event.target.value;
    this.setState({ query });

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (query.trim().length >= 2) {
      this.searchTimeout = setTimeout(() => {
        this.handleSearch(query);
      }, 300);
    } else {
      this.setState({
        results: { albums: [], tracks: [] },
        showDropdown: false
      });
    }
  }

  handleInputFocus() {
    if (this.state.query.trim().length >= 2) {
      this.setState({ showDropdown: true });
    }
  }

  handleInputBlur() {
    setTimeout(() => {
      this.setState({ showDropdown: false });
    }, 200);
  }

  handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.handleSubmit();
    } else if (event.key === 'Escape') {
      this.clearSearch();
      this.searchInputRef.current?.blur();
    }
  }

  async handleSearch(query: string) {
    if (!query || query.trim().length < 2) {
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      const results = await searchMusic(query, { limit: 10 });
      this.setState({
        results,
        showDropdown: true,
        isLoading: false
      });
    } catch (error) {
      console.error('Search error:', error);
      this.setState({
        error: 'Search failed. Please try again.',
        isLoading: false,
        showDropdown: false
      });
    }
  }

  handleResultClick(item: PlexAlbum | PlexTrack, type: 'album' | 'track') {
    if (type === 'album') {
      this.props.navigate(`/album/${item.ratingKey}`);
    } else if (type === 'track') {
      if (this.props.onPlayTrack) {
        this.props.onPlayTrack(item as PlexTrack);
      }
    }

    this.setState({ showDropdown: false });
  }

  handleSubmit() {
    if (this.state.query.trim()) {
      this.props.navigate(`/search?q=${encodeURIComponent(this.state.query.trim())}`);
      this.setState({ showDropdown: false });
    }
  }

  clearSearch() {
    this.setState({
      query: '',
      results: { albums: [], tracks: [] },
      showDropdown: false,
      error: null
    });
  }

  render() {
    const { query, results, isLoading, showDropdown, error } = this.state;
    const hasResults = results.albums.length > 0 || results.tracks.length > 0;

    return (
      <Box sx={{ position: 'relative', width: '100%', maxWidth: 400, mx: 'auto' }}>
        <TextField
          inputRef={this.searchInputRef}
          fullWidth
          size="small"
          placeholder="Search albums and tracks..."
          value={query}
          onChange={this.handleInputChange}
          onFocus={this.handleInputFocus}
          onBlur={this.handleInputBlur}
          onKeyDown={this.handleKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={this.clearSearch}
                  aria-label="Clear search"
                  edge="end"
                >
                  <CloseIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
                boxShadow: '0 0 0 2px rgba(240, 165, 0, 0.2)',
              },
            },
          }}
        />

        {showDropdown && (
          <Paper
            ref={this.dropdownRef}
            elevation={3}
            sx={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              maxHeight: 400,
              overflowY: 'auto',
              zIndex: 1000,
              textAlign: 'left',
            }}
            className="custom-scrollbar"
          >
            {isLoading && (
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  Searching...
                </Typography>
              </Box>
            )}

            {error && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              </Box>
            )}

            {!isLoading && !error && hasResults && (
              <Box>
                {results.albums.length > 0 && (
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        px: 2,
                        py: 1,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: 'text.secondary',
                        bgcolor: 'background.default',
                        borderBottom: 1,
                        borderColor: 'divider',
                      }}
                    >
                      Albums
                    </Typography>
                    <List disablePadding>
                      {results.albums.slice(0, 5).map(album => (
                        <ListItem
                          key={`album-${album.ratingKey}`}
                          disablePadding
                          sx={{ borderBottom: 1, borderColor: 'divider' }}
                        >
                          <ListItemButton onClick={() => this.handleResultClick(album, 'album')}>
                            {album.thumb && (
                              <Box
                                component="img"
                                src={getPlexImageUrl(album.thumb) ?? undefined}
                                alt={album.title ?? undefined}
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 1,
                                  objectFit: 'cover',
                                  mr: 1.5,
                                  flexShrink: 0
                                }}
                              />
                            )}
                            <ListItemText
                              primary={album.title}
                              secondary={album.parentTitle || 'Various Artists'}
                              primaryTypographyProps={{
                                variant: 'body2',
                                noWrap: true,
                              }}
                              secondaryTypographyProps={{
                                variant: 'caption',
                                noWrap: true,
                              }}
                            />
                            <Chip label="Album" size="small" color="primary" sx={{ ml: 2 }} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {results.tracks.length > 0 && (
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        px: 2,
                        py: 1,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: 'text.secondary',
                        bgcolor: 'background.default',
                        borderBottom: 1,
                        borderColor: 'divider',
                      }}
                    >
                      Tracks
                    </Typography>
                    <List disablePadding>
                      {results.tracks.slice(0, 5).map(track => (
                        <ListItem
                          key={`track-${track.ratingKey}`}
                          disablePadding
                          sx={{ borderBottom: 1, borderColor: 'divider' }}
                        >
                          <ListItemButton onClick={() => this.handleResultClick(track, 'track')}>
                            {(track.thumb || track.parentThumb) && (
                              <Box
                                component="img"
                                src={getPlexImageUrl(track.thumb || track.parentThumb) ?? undefined}
                                alt={track.parentTitle ?? undefined}
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 1,
                                  objectFit: 'cover',
                                  mr: 1.5,
                                  flexShrink: 0
                                }}
                              />
                            )}
                            <ListItemText
                              primary={track.title}
                              secondary={`${track.grandparentTitle} • ${track.parentTitle}`}
                              primaryTypographyProps={{
                                variant: 'body2',
                                noWrap: true,
                              }}
                              secondaryTypographyProps={{
                                variant: 'caption',
                                noWrap: true,
                              }}
                            />
                            <Chip label="Track" size="small" color="primary" sx={{ ml: 2 }} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="small"
                    onClick={this.handleSubmit}
                  >
                    View all results
                  </Button>
                </Box>
              </Box>
            )}

            {!isLoading && !error && !hasResults && query.trim().length >= 2 && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No results found for "{query}"
                </Typography>
              </Box>
            )}
          </Paper>
        )}
      </Box>
    );
  }
}

const SearchBarWithNavigation = (props: SearchBarProps) => {
  const navigate = useNavigate();
  return <SearchBar {...props} navigate={navigate} />;
};

export default SearchBarWithNavigation;
