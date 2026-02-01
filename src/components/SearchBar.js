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
        <div className="relative flex items-center bg-base-200 border border-base-300 rounded-lg overflow-hidden transition-[border-color] duration-300 ease-in-out focus-within:border-primary focus-within:shadow-[0_0_0_2px_rgba(240,165,0,0.2)]">
          <input
            ref={this.searchInputRef}
            type="text"
            placeholder="Search albums and tracks..."
            value={query}
            onChange={this.handleInputChange}
            onFocus={this.handleInputFocus}
            onBlur={this.handleInputBlur}
            onKeyDown={this.handleKeyDown}
            className="input input-bordered flex-1 py-3 px-4 bg-transparent border-none text-base-content text-sm outline-none placeholder:text-base-content/50"
          />

          {query && (
            <button
              type="button"
              className="btn btn-ghost btn-sm text-lg"
              onClick={this.clearSearch}
              aria-label="Clear search"
            >
              ×
            </button>
          )}

          <button
            type="submit"
            className="btn btn-primary py-3 px-4 text-sm"
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
          <div ref={this.dropdownRef} className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 border-t-0 rounded-b-lg shadow-xl max-h-[400px] overflow-y-auto z-[1000] text-left custom-scrollbar">
            {isLoading && (
              <div className="p-4 text-center text-base-content/50 italic">
                <span>Searching...</span>
              </div>
            )}

            {error && (
              <div className="p-4 text-center text-error italic">
                <span>{error}</span>
              </div>
            )}

            {!isLoading && !error && hasResults && (
              <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                {results.albums.length > 0 && (
                  <div className="border-b border-base-300 last:border-b-0">
                    <h4 className="pt-3 px-4 pb-2 m-0 text-xs font-semibold uppercase text-base-content/50 bg-base-100 border-b border-base-300">Albums</h4>
                    {results.albums.slice(0, 5).map(album => (
                      <div
                        key={`album-${album.ratingKey}`}
                        className="flex items-center justify-between py-3 px-4 cursor-pointer transition-colors duration-300 ease-in-out border-b border-base-300/50 last:border-b-0 hover:bg-base-300"
                        onClick={() => this.handleResultClick(album, 'album')}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="block text-base-content font-medium text-sm mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{album.title}</span>
                          <span className="block text-base-content/50 text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            {album.parentTitle || 'Various Artists'}
                          </span>
                        </div>
                        <span className="badge badge-primary badge-sm uppercase ml-3 flex-shrink-0">Album</span>
                      </div>
                    ))}
                  </div>
                )}

                {results.tracks.length > 0 && (
                  <div className="border-b border-base-300 last:border-b-0">
                    <h4 className="pt-3 px-4 pb-2 m-0 text-xs font-semibold uppercase text-base-content/50 bg-base-100 border-b border-base-300">Tracks</h4>
                    {results.tracks.slice(0, 5).map(track => (
                      <div
                        key={`track-${track.ratingKey}`}
                        className="flex items-center justify-between py-3 px-4 cursor-pointer transition-colors duration-300 ease-in-out border-b border-base-300/50 last:border-b-0 hover:bg-base-300"
                        onClick={() => this.handleResultClick(track, 'track')}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="block text-base-content font-medium text-sm mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{track.title}</span>
                          <span className="block text-base-content/50 text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            {track.grandparentTitle} • {track.parentTitle}
                          </span>
                        </div>
                        <span className="badge badge-primary badge-sm uppercase ml-3 flex-shrink-0">Track</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 border-t border-base-300 bg-base-100">
                  <button
                    className="btn btn-primary w-full text-xs uppercase"
                    onClick={this.handleSubmit}
                  >
                    View all results
                  </button>
                </div>
              </div>
            )}

            {!isLoading && !error && !hasResults && query.trim().length >= 2 && (
              <div className="p-4 text-center text-base-content/50 italic">
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
