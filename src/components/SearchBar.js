// src/components/SearchBar.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMusic } from '../api/plexApi';
import '../styles/SearchBar.scss';

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
      <div className="search-bar">
        <div className="search-input-container">
          <input
            ref={this.searchInputRef}
            type="text"
            placeholder="Search albums and tracks..."
            value={query}
            onChange={this.handleInputChange}
            onFocus={this.handleInputFocus}
            onBlur={this.handleInputBlur}
            onKeyDown={this.handleKeyDown}
            className="search-input"
          />
          
          {query && (
            <button 
              type="button" 
              className="search-clear-btn"
              onClick={this.clearSearch}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
          
          <button 
            type="submit" 
            className="search-submit-btn"
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
          <div ref={this.dropdownRef} className="search-dropdown">
            {isLoading && (
              <div className="search-loading">
                <span>Searching...</span>
              </div>
            )}

            {error && (
              <div className="search-error">
                <span>{error}</span>
              </div>
            )}

            {!isLoading && !error && hasResults && (
              <div className="search-results">
                {results.albums.length > 0 && (
                  <div className="search-section">
                    <h4 className="search-section-title">Albums</h4>
                    {results.albums.slice(0, 5).map(album => (
                      <div
                        key={`album-${album.ratingKey}`}
                        className="search-result-item"
                        onClick={() => this.handleResultClick(album, 'album')}
                      >
                        <div className="search-result-info">
                          <span className="search-result-title">{album.title}</span>
                          <span className="search-result-subtitle">
                            {album.parentTitle || 'Various Artists'}
                          </span>
                        </div>
                        <span className="search-result-type">Album</span>
                      </div>
                    ))}
                  </div>
                )}

                {results.tracks.length > 0 && (
                  <div className="search-section">
                    <h4 className="search-section-title">Tracks</h4>
                    {results.tracks.slice(0, 5).map(track => (
                      <div
                        key={`track-${track.ratingKey}`}
                        className="search-result-item"
                        onClick={() => this.handleResultClick(track, 'track')}
                      >
                        <div className="search-result-info">
                          <span className="search-result-title">{track.title}</span>
                          <span className="search-result-subtitle">
                            {track.grandparentTitle} • {track.parentTitle}
                          </span>
                        </div>
                        <span className="search-result-type">Track</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="search-footer">
                  <button 
                    className="search-view-all-btn"
                    onClick={this.handleSubmit}
                  >
                    View all results
                  </button>
                </div>
              </div>
            )}

            {!isLoading && !error && !hasResults && query.trim().length >= 2 && (
              <div className="search-no-results">
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
