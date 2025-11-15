// src/pages/Search.js
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchAlbumsWithMatchingTracks } from '../api/plexApi';
import AlbumCard from '../components/AlbumCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { getAlbumCardWidth } from '../utils/settingsStorage';
import '../styles/Search.scss';

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
      <div className="search-page" style={{'--card-width': `${cardWidth}px`}}>
        <div className="search-header">
          {query && (
            <p className="search-query">
              Showing results for: <strong>"{query}"</strong>
            </p>
          )}
        </div>

        {isLoading && (
          <div className="search-loading-container">
            <LoadingSpinner />
            <p>Searching for albums and tracks...</p>
          </div>
        )}

        {error && (
          <div className="search-error-container">
            <div className="search-error">
              <h3>Search Error</h3>
              <p>{error}</p>
              <button 
                className="retry-btn"
                onClick={() => this.searchAlbums(query)}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && albums.length === 0 && query && (
          <div className="search-no-results">
            <h3>No Results Found</h3>
            <p>No albums or tracks found matching "{query}".</p>
            <p>Try searching with different keywords or check your spelling.</p>
          </div>
        )}

        {!isLoading && !error && albums.length > 0 && (
          <div className="search-results-container">
            <div className="search-results-header">
              <p>
                Found {albums.length} album{albums.length !== 1 ? 's' : ''}
              </p>
              <div className="search-results-info">
                {albums.filter(album => album.matchType === 'album').length > 0 && (
                  <span className="match-type-info">
                    {albums.filter(album => album.matchType === 'album').length} album title matches
                  </span>
                )}
                {albums.filter(album => album.matchType === 'track').length > 0 && (
                  <span className="match-type-info">
                    {albums.filter(album => album.matchType === 'track').length} albums with matching tracks
                  </span>
                )}
              </div>
            </div>

            <div className="search-results-grid">
              {albums.map(album => {
                const isExpanded = expandedItems.has(album.ratingKey);
                const hasTrackMatch = album.matchType === 'track' && album.matchingTrack;
                
                return (
                  <div key={album.ratingKey} className="search-result-item">
                    <AlbumCard
                      album={album}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      onPlayTrack={onPlayTrack}
                      onTogglePlayback={onTogglePlayback}
                      onCurrentTrackChange={onCurrentTrackChange}
                    />
                    {hasTrackMatch && (
                      <div className="match-info-container">
                        <button 
                          className={`match-expand-btn ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => this.toggleExpanded(album.ratingKey)}
                          aria-label={isExpanded ? 'Hide track match info' : 'Show track match info'}
                        >
                          <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
                          <span className="expand-text">Track Match</span>
                        </button>
                        {isExpanded && (
                          <div className="match-info">
                            <span className="match-type-badge">Track Match</span>
                            <span className="matching-track">
                              Contains: "{album.matchingTrack}"
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!query && !isLoading && (
          <div className="search-empty-state">
            <h2>Search Music</h2>
            <p>Use the search bar above to find albums and tracks in your Plex library.</p>
            <div className="search-tips">
              <h3>Search Tips:</h3>
              <ul>
                <li>Search by album name, artist name, or song title</li>
                <li>Use partial words - "beet" will find "The Beatles"</li>
                <li>Search is case-insensitive</li>
                <li>Results include albums that contain matching tracks</li>
              </ul>
            </div>
          </div>
        )}
      </div>
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
