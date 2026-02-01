// src/pages/Search.js
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
      <div className="px-5 py-5" style={{'--card-width': `${cardWidth}px`}}>
        {query && (
          <div className="mb-5">
            <p className="text-base-content/60">
              Showing results for: <strong className="text-base-content">"{query}"</strong>
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-10">
            <LoadingSpinner />
            <p className="text-base-content/60 mt-4">Searching for albums and tracks...</p>
          </div>
        )}

        {error && (
          <div className="flex justify-center py-10">
            <div className="card bg-base-200 shadow-xl p-6 max-w-md w-full">
              <div className="card-body">
                <h3 className="card-title text-error">Search Error</h3>
                <p className="text-base-content/60 mb-4">{error}</p>
                <button
                  className="btn btn-primary w-full"
                  onClick={() => this.searchAlbums(query)}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && albums.length === 0 && query && (
          <div className="text-center py-10">
            <h3 className="text-2xl font-bold text-base-content mb-3">No Results Found</h3>
            <p className="text-base-content/60 mb-2">No albums or tracks found matching "{query}".</p>
            <p className="text-base-content/60">Try searching with different keywords or check your spelling.</p>
          </div>
        )}

        {!isLoading && !error && albums.length > 0 && (
          <div>
            <div className="card bg-base-200 shadow-xl p-5 mb-5">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <p className="text-base-content font-medium">
                  Found {albums.length} album{albums.length !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-4 text-base-content/60 text-sm">
                  {albums.filter(album => album.matchType === 'album').length > 0 && (
                    <span className="badge badge-primary badge-outline">
                      {albums.filter(album => album.matchType === 'album').length} album title matches
                    </span>
                  )}
                  {albums.filter(album => album.matchType === 'track').length > 0 && (
                    <span className="badge badge-primary badge-outline">
                      {albums.filter(album => album.matchType === 'track').length} albums with matching tracks
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-0">
              {albums.map(album => {
                const isExpanded = expandedItems.has(album.ratingKey);
                const hasTrackMatch = album.matchType === 'track' && album.matchingTrack;

                return (
                  <div key={album.ratingKey} className="relative">
                    <AlbumCard
                      album={album}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      onPlayTrack={onPlayTrack}
                      onTogglePlayback={onTogglePlayback}
                      onCurrentTrackChange={onCurrentTrackChange}
                    />
                    {hasTrackMatch && (
                      <div className="mt-2 mx-2">
                        <button
                          className={`btn btn-ghost w-full flex items-center justify-center gap-2
                                     ${isExpanded ? 'btn-active' : ''}`}
                          onClick={() => this.toggleExpanded(album.ratingKey)}
                          aria-label={isExpanded ? 'Hide track match info' : 'Show track match info'}
                        >
                          <span className="text-primary font-bold text-lg">{isExpanded ? '−' : '+'}</span>
                          <span className="text-sm">Track Match</span>
                        </button>
                        {isExpanded && (
                          <div className="mt-2 card bg-base-200 shadow p-3 animate-slide-down">
                            <span className="badge badge-primary mb-2">
                              Track Match
                            </span>
                            <div className="text-base-content/60 text-sm">
                              Contains: "{album.matchingTrack}"
                            </div>
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
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-base-content mb-4">Search Music</h2>
            <p className="text-base-content/60 mb-6">Use the search bar above to find albums and tracks in your Plex library.</p>
            <div className="card bg-base-200 shadow-xl p-6 max-w-2xl mx-auto">
              <div className="card-body">
                <h3 className="card-title mb-4">Search Tips:</h3>
                <ul className="text-left text-base-content/60 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Search by album name, artist name, or song title</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Use partial words - "beet" will find "The Beatles"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Search is case-insensitive</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Results include albums that contain matching tracks</span>
                  </li>
                </ul>
              </div>
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
