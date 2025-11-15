// src/pages/Playlists.js
import React, { useState, useEffect } from 'react';
import { getPlaylists, getPlaylistItems } from '../api/plexApi';
import { PLEX_URL, PLEX_TOKEN } from '../config';
import LoadingSpinner from '../components/LoadingSpinner';
import TrackList from '../components/TrackList';
import './Playlists.scss';

function Playlists({ onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPlaylists();
        setPlaylists(data);
      } catch (err) {
         console.error("Failed to fetch playlists:", err);
         setError("Failed to fetch playlists.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, []);

  const handlePlaylistClick = async (playlist) => {
    setSelectedPlaylist(playlist);
    setLoadingTracks(true);
    setError(null);
    
    try {
      const tracks = await getPlaylistItems(playlist.ratingKey);
      setPlaylistTracks(tracks);
    } catch (err) {
      console.error("Failed to fetch playlist items:", err);
      setError("Failed to fetch tracks for this playlist.");
    } finally {
      setLoadingTracks(false);
    }
  };

  const exportPlaylistAsM3U = () => {
    if (!selectedPlaylist || playlistTracks.length === 0) {
      alert('No playlist selected or playlist is empty');
      return;
    }

    let m3uContent = '#EXTM3U\n';
    m3uContent += `#PLAYLIST:${selectedPlaylist.title}\n\n`;

    playlistTracks.forEach(track => {
      const duration = track.duration ? Math.floor(track.duration / 1000) : -1;
      const artist = track.originalTitle || track.grandparentTitle || 'Unknown Artist';
      const title = track.title || 'Unknown Title';
      
      m3uContent += `#EXTINF:${duration},${artist} - ${title}\n`;
      
      const trackUrl = `${PLEX_URL}/library/parts/${track.Media?.[0]?.Part?.[0]?.id}/file?X-Plex-Token=${PLEX_TOKEN}`;
      m3uContent += `${trackUrl}\n\n`;
    });

    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedPlaylist.title.replace(/[^\w\s-]/g, '')}.m3u`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-message">{error}</div>;
  if (playlists.length === 0) return <div className="info-message">No audio playlists found.</div>;

  return (
    <div className="playlists-container">
      <div className="playlists-layout">
        <div className="playlists-sidebar">
          <div className="playlists-list">
            {playlists.map(playlist => (
              <div 
                key={playlist.ratingKey} 
                className={`playlist-item ${selectedPlaylist?.ratingKey === playlist.ratingKey ? 'selected' : ''}`}
                onClick={() => handlePlaylistClick(playlist)}
              >
                <div className="playlist-info">
                  <span className="playlist-title">{playlist.title}</span>
                  <span className="playlist-count">{playlist.leafCount} tracks</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tracks-panel">
          {selectedPlaylist ? (
            <>
              <div className="playlist-tracks-header">
                <div className="header-info">
                  <h2>{selectedPlaylist.title}</h2>
                  <span className="tracks-count">{playlistTracks.length} tracks</span>
                </div>
                <button 
                  className="export-playlist-btn" 
                  onClick={exportPlaylistAsM3U}
                  disabled={playlistTracks.length === 0}
                  title="Export playlist as M3U file"
                >
                  Export M3U
                </button>
              </div>
              
              {loadingTracks ? (
                <LoadingSpinner />
              ) : playlistTracks.length === 0 ? (
                <div className="no-tracks">This playlist is empty</div>
              ) : (
                <TrackList 
                  tracks={playlistTracks} 
                  albumData={selectedPlaylist} 
                  onPlayTrack={onPlayTrack} 
                  currentTrack={currentTrack} 
                  isPlaying={isPlaying} 
                  onTogglePlayback={onTogglePlayback} 
                />
              )}
            </>
          ) : (
            <div className="no-playlist-selected">
              <h3>Select a playlist</h3>
              <p>Choose a playlist from the sidebar to view its tracks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Playlists;