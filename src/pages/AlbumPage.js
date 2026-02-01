import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPlexImageUrl, getAlbumTracks } from '../api/plexApi';
import axios from 'axios';
import TrackList from '../components/TrackList';
import LoadingSpinner from '../components/LoadingSpinner';
import { PLEX_URL, PLEX_TOKEN } from '../config';

const AlbumPage = ({ onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) => {
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAlbumData = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get(`${PLEX_URL}/library/metadata/${albumId}`, {
          headers: {
            'Accept': 'application/json',
            'X-Plex-Token': PLEX_TOKEN,
          }
        });
        
        if (response.data && response.data.MediaContainer && response.data.MediaContainer.Metadata) {
          setAlbum(response.data.MediaContainer.Metadata[0]);
          
          const tracksData = await getAlbumTracks(albumId);
          setTracks(tracksData);
        } else {
          setError('Album data not found');
        }
      } catch (error) {
        console.error('Error fetching album data:', error);
        setError('Failed to load album data');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumData();
  }, [albumId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !album) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-plex-error text-lg mb-5">{error || 'Album not found'}</p>
        <Link
          to="/"
          className="inline-block bg-plex-accent text-plex-button-text px-5 py-2.5 rounded font-medium
                     no-underline transition-all duration-200 hover:bg-plex-accent-hover active:scale-95"
        >
          Back to Library
        </Link>
      </div>
    );
  }

  const albumArtUrl = getPlexImageUrl(album.thumb);

  return (
    <div className="px-5 py-5">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-plex-accent no-underline text-base
                     transition-colors duration-200 hover:text-plex-accent-hover"
        >
          &larr; Back to Library
        </Link>
      </div>

      <div className="flex gap-8 mb-8 flex-wrap md:flex-col md:items-center">
        <div className="flex-shrink-0">
          {albumArtUrl ? (
            <img
              src={albumArtUrl}
              alt={album.title}
              className="w-[300px] h-[300px] rounded-lg shadow-lg object-cover"
            />
          ) : (
            <div className="w-[300px] h-[300px] rounded-lg bg-plex-card flex items-center justify-center
                           text-plex-text-muted text-xl">
              No Cover
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-4xl font-bold text-plex-text-primary mb-2 mt-0">{album.title}</h1>
          <h2 className="text-2xl text-plex-text-secondary mb-4 mt-0 font-normal">
            {album.parentTitle || 'Unknown Artist'}
          </h2>
          <div className="flex gap-4 text-plex-text-muted">
            <span>{album.year || 'Unknown Year'}</span>
            <span>•</span>
            <span>{tracks.length} Track{tracks.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      <div className="bg-plex-surface rounded-lg p-5 border border-plex-border">
        <TrackList
          tracks={tracks}
          albumData={album}
          onPlayTrack={onPlayTrack}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onTogglePlayback={onTogglePlayback}
        />
      </div>
    </div>
  );
};

export default AlbumPage;
