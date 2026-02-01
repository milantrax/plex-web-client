// src/components/SearchBar.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMusic } from '../api/plexApi';

class SearchBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      query: '',
      results: { albums: [], tracks: [] },
      isLoading: false,
      showDropdown: false,
      error: null
    };
    
    this.searchInputRef = React.createRef();
    this.dropdownRef = React.createRef();
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

  handleClickOutside(event) {
    if (
      this.dropdownRef.current &&
      !this.dropdownRef.current.contains(event.target) &&
      !this.searchInputRef.current.contains(event.target)
    ) {
      this.setState({ showDropdown: false });
    }
  }

  handleInputChange(event) {
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

  handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.handleSubmit();
    } else if (event.key === 'Escape') {
      this.clearSearch();
      this.searchInputRef.current.blur();
    }
  }

  async handleSearch(query) {
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

  handleResultClick(item, type) {
    if (type === 'album') {
      this.props.navigate(`/album/${item.ratingKey}`);
    } else if (type === 'track') {
      if (this.props.onPlayTrack) {
        this.props.onPlayTrack(item);
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
      <div className="relative w-full max-w-[400px] mx-auto">
        <div className="relative flex items-center bg-plex-surface border border-plex-border rounded-lg overflow-hidden transition-[border-color] duration-300 ease-in-out focus-within:border-plex-accent focus-within:shadow-[0_0_0_2px_rgba(240,165,0,0.2)]">
          <input
            ref={this.searchInputRef}
            type="text"
            placeholder="Search albums and tracks..."
            value={query}
            onChange={this.handleInputChange}
            onFocus={this.handleInputFocus}
            onBlur={this.handleInputBlur}
            onKeyDown={this.handleKeyDown}
            className="flex-1 py-3 px-4 bg-transparent border-none text-plex-text text-sm outline-none placeholder:text-plex-text-muted"
          />

          {query && (
            <button
              type="button"
              className="bg-transparent border-none text-plex-text-muted text-lg p-2 cursor-pointer transition-colors duration-300 ease-in-out hover:text-plex-text"
              onClick={this.clearSearch}
              aria-label="Clear search"
            >
              ×
            </button>
          )}

          <button
            type="submit"
            className="bg-plex-accent border-none text-white py-3 px-4 cursor-pointer text-sm transition-colors duration-300 ease-in-out hover:bg-plex-accent-hover disabled:bg-plex-border disabled:cursor-not-allowed"
            onClick={this.handleSubmit}
            disabled={!query.trim()}
            aria-label="Search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </div>

        {showDropdown && (
          <div ref={this.dropdownRef} className="absolute top-full left-0 right-0 bg-plex-bg border border-plex-border border-t-0 rounded-b-lg shadow-[0_4px_12px_rgba(0,0,0,0.3)] max-h-[400px] overflow-y-auto z-[1000] text-left custom-scrollbar">
            {isLoading && (
              <div className="p-4 text-center text-plex-text-muted italic">
                <span>Searching...</span>
              </div>
            )}

            {error && (
              <div className="p-4 text-center text-plex-error italic">
                <span>{error}</span>
              </div>
            )}

            {!isLoading && !error && hasResults && (
              <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                {results.albums.length > 0 && (
                  <div className="border-b border-plex-border last:border-b-0">
                    <h4 className="pt-3 px-4 pb-2 m-0 text-xs font-semibold uppercase text-plex-text-muted bg-plex-bg border-b border-plex-border">Albums</h4>
                    {results.albums.slice(0, 5).map(album => (
                      <div
                        key={`album-${album.ratingKey}`}
                        className="flex items-center justify-between py-3 px-4 cursor-pointer transition-colors duration-300 ease-in-out border-b border-white/5 last:border-b-0 hover:bg-white/10"
                        onClick={() => this.handleResultClick(album, 'album')}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="block text-plex-text font-medium text-sm mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{album.title}</span>
                          <span className="block text-plex-text-muted text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            {album.parentTitle || 'Various Artists'}
                          </span>
                        </div>
                        <span className="text-[11px] text-plex-accent bg-plex-accent/10 py-0.5 px-1.5 rounded uppercase font-semibold ml-3 flex-shrink-0">Album</span>
                      </div>
                    ))}
                  </div>
                )}

                {results.tracks.length > 0 && (
                  <div className="border-b border-plex-border last:border-b-0">
                    <h4 className="pt-3 px-4 pb-2 m-0 text-xs font-semibold uppercase text-plex-text-muted bg-plex-bg border-b border-plex-border">Tracks</h4>
                    {results.tracks.slice(0, 5).map(track => (
                      <div
                        key={`track-${track.ratingKey}`}
                        className="flex items-center justify-between py-3 px-4 cursor-pointer transition-colors duration-300 ease-in-out border-b border-white/5 last:border-b-0 hover:bg-white/10"
                        onClick={() => this.handleResultClick(track, 'track')}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="block text-plex-text font-medium text-sm mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{track.title}</span>
                          <span className="block text-plex-text-muted text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            {track.grandparentTitle} • {track.parentTitle}
                          </span>
                        </div>
                        <span className="text-[11px] text-plex-accent bg-plex-accent/10 py-0.5 px-1.5 rounded uppercase font-semibold ml-3 flex-shrink-0">Track</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 border-t border-plex-border bg-plex-bg">
                  <button
                    className="w-full bg-plex-accent border-none text-white py-2 px-4 rounded cursor-pointer text-xs font-semibold uppercase transition-colors duration-300 ease-in-out hover:bg-plex-accent-hover"
                    onClick={this.handleSubmit}
                  >
                    View all results
                  </button>
                </div>
              </div>
            )}

            {!isLoading && !error && !hasResults && query.trim().length >= 2 && (
              <div className="p-4 text-center text-plex-text-muted italic">
                <span>No results found for "{query}"</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

const SearchBarWithNavigation = (props) => {
  const navigate = useNavigate();
  return <SearchBar {...props} navigate={navigate} />;
};

export default SearchBarWithNavigation;
