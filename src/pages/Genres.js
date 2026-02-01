// src/pages/Genres.js
import React, { useState, useEffect } from 'react';
import { getSections, getGenres, getAlbumsByGenre } from '../api/plexApi';
import LoadingSpinner from '../components/LoadingSpinner';
import AlbumCard from '../components/AlbumCard';

function Genres({ onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) {
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [error, setError] = useState(null);
  const [musicSectionId, setMusicSectionId] = useState(null);

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

  if (loading) return <LoadingSpinner />;
  if (error && !loadingAlbums) return <div className="alert alert-error text-center py-10 text-lg max-w-2xl mx-auto my-10">{error}</div>;
  if (!musicSectionId && !error) return <div className="text-center py-10 text-base-content/60 text-lg">No music library found.</div>
  if (genres.length === 0 && !error) return <div className="text-center py-10 text-base-content/60 text-lg">No genres found in this library.</div>;

  return (
    <div className="flex gap-5 p-5 h-full md:flex-col">
      <div className="w-[250px] bg-base-200 rounded-lg shadow-xl overflow-hidden md:w-full md:max-h-[200px]">
        <ul className="menu p-0 overflow-y-auto h-full custom-scrollbar">
          {genres.map(genre => (
            <li key={genre.key}>
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a
                href="#"
                className={`${selectedGenre?.key === genre.key ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleGenreClick(genre); }}
              >
                {genre.title}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 card bg-base-200 shadow-xl p-5 overflow-y-auto custom-scrollbar">
        {selectedGenre ? (
          <>
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-base-300">
              <h3 className="text-2xl font-bold text-base-content m-0">{selectedGenre.title}</h3>
              <span className="badge badge-primary">{albums.length} album{albums.length !== 1 ? 's' : ''}</span>
            </div>

            {loadingAlbums ? (
              <LoadingSpinner />
            ) : albums.length === 0 ? (
              <div className="text-center py-10 text-base-content/60 text-lg">No albums found for this genre</div>
            ) : (
              <div className="flex flex-wrap justify-center gap-0">
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
          <div className="text-center py-20 text-base-content/60">
            <h3 className="text-xl font-bold mb-2">Select a genre</h3>
            <p className="m-0">Choose a genre from the sidebar to view its albums</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Genres;