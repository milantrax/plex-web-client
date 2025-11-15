// src/pages/Genres.js
import React, { useState, useEffect } from 'react';
import { getSections, getGenres, getAlbumsByGenre } from '../api/plexApi';
import LoadingSpinner from '../components/LoadingSpinner';
import AlbumCard from '../components/AlbumCard';
import { getAlbumCardWidth } from '../utils/settingsStorage';
import './Genres.scss';

function Genres({ onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) { 
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [error, setError] = useState(null);
  const [musicSectionId, setMusicSectionId] = useState(null);
  const [cardWidth, setCardWidth] = useState(getAlbumCardWidth());

  useEffect(() => {
    const handleWidthChange = (event) => {
      setCardWidth(event.detail.width);
    };

    window.addEventListener('albumCardWidthChanged', handleWidthChange);
    return () => {
      window.removeEventListener('albumCardWidthChanged', handleWidthChange);
    };
  }, []);

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
           setError("Could not find a music library section.");
           setLoading(false);
        }
      } catch (err) {
         setError("Failed to connect or fetch library sections.");
         setLoading(false);
      }
    };
    fetchMusicSection();
  }, []);

  useEffect(() => {
    const fetchGenres = async () => {
      if (!musicSectionId) return; // Wait for section ID
      setError(null); // Clear previous errors
      try {
          const genreData = await getGenres(musicSectionId, 9);
          setGenres(genreData);
      } catch (err) {
          console.error("Failed to fetch genres:", err);
          setError("Failed to fetch genres.");
      } finally {
          setLoading(false);
      }
    };

    fetchGenres();
  }, [musicSectionId]);

  useEffect(() => {
      const fetchAlbumsForGenre = async () => {
          if (!selectedGenre || !musicSectionId) return;
          setLoadingAlbums(true);
          setAlbums([]);
          setError(null);
          try {
              const albumData = await getAlbumsByGenre(musicSectionId, selectedGenre.key, 9);
              setAlbums(albumData);
          } catch (err) {
             console.error(`Failed to fetch albums for genre ${selectedGenre.title}:`, err);
             setError(`Failed to fetch albums for genre: ${selectedGenre.title}.`);
          } finally {
            setLoadingAlbums(false);
          }
      };
      fetchAlbumsForGenre();
  }, [selectedGenre, musicSectionId]);

  const handleGenreClick = (genre) => {
    setSelectedGenre(genre);
  };

  if (loading) return <LoadingSpinner />; // Loading sections/genres
  if (error && !loadingAlbums) return <div className="error-message">{error}</div>; // Show general errors if not loading albums
  if (!musicSectionId && !error) return <div className="info-message">No music library found.</div>
  if (genres.length === 0 && !error) return <div className="info-message">No genres found in this library.</div>;

  return (
    <div className="genres-container" style={{'--card-width': `${cardWidth}px`}}>
      <div className="genres-sidebar">
        <ul className="genres-list">
          {genres.map(genre => (
            <li 
              key={genre.key} 
              className={`genre-item ${selectedGenre?.key === genre.key ? 'active' : ''}`}
              onClick={() => handleGenreClick(genre)}
            >
              {genre.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="albums-panel">
        {selectedGenre ? (
          <>
            <div className="albums-panel-header">
              <h3>{selectedGenre.title}</h3>
              <span className="album-count">{albums.length} albums</span>
            </div>
            
            {loadingAlbums ? (
              <LoadingSpinner />
            ) : albums.length === 0 ? (
              <div className="no-albums">No albums found for this genre</div>
            ) : (
              <div className="albums-grid">
                {albums.map(album => (
                  <AlbumCard 
                    key={album.ratingKey} 
                    album={album} 
                    onPlayTrack={onPlayTrack} 
                    currentTrack={currentTrack} 
                    isPlaying={isPlaying} 
                    onTogglePlayback={onTogglePlayback} 
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="no-selection">
            <h3>Select a genre</h3>
            <p>Choose a genre from the sidebar to view its albums</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Genres;