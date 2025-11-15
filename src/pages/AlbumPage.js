import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPlexImageUrl, getAlbumTracks } from '../api/plexApi';
import axios from 'axios';
import TrackList from '../components/TrackList';
import LoadingSpinner from '../components/LoadingSpinner';
import { PLEX_URL, PLEX_TOKEN } from '../config';
import '../styles/AlbumPage.scss';

const AlbumPage = ({ onPlayTrack }) => {
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
      <div className="album-page album-page--error">
        <p>{error || 'Album not found'}</p>
        <Link to="/" className="album-page__back-button">Back to Library</Link>
      </div>
    );
  }

  const albumArtUrl = getPlexImageUrl(album.thumb);

  return (
    <div className="album-page">
      <div className="album-page__header">
        <Link to="/" className="album-page__back-button">
          &larr; Back to Library
        </Link>
        <div className="album-page__content-wrapper">
          <div className="album-page__cover">
            {albumArtUrl ? (
              <img src={albumArtUrl} alt={album.title} />
            ) : (
              <div className="album-page__placeholder">No Cover</div>
            )}
          </div>
          <div className="album-page__info">
            <h1>{album.title}</h1>
            <h2>{album.parentTitle || 'Unknown Artist'}</h2>
            <div className="album-page__meta">
              <span>{album.year || 'Unknown Year'}</span>
              <span>{tracks.length} Tracks</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="album-page__tracks">
        <TrackList tracks={tracks} albumData={album} onPlayTrack={onPlayTrack} />
      </div>
    </div>
  );
};

export default AlbumPage;
