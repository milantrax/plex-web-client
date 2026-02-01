// src/pages/Playlists.js
import React, { useState, useEffect } from 'react';
import { getPlaylists, getPlaylistItems } from '../api/plexApi';
import { PLEX_URL, PLEX_TOKEN } from '../config';
import LoadingSpinner from '../components/LoadingSpinner';
import TrackList from '../components/TrackList';

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
  if (error) return <div className="alert alert-error text-center py-10 text-lg max-w-2xl mx-auto my-10">{error}</div>;
  if (playlists.length === 0) return <div className="text-center py-10 text-base-content/60 text-lg">No audio playlists found.</div>;

  return (
    <div className="px-5 py-5">
      <div className="flex gap-5">
        <div className="w-[250px] card bg-base-200 shadow-xl h-fit sticky top-5">
          <ul className="menu p-0 custom-scrollbar max-h-[calc(100vh-120px)] overflow-y-auto">
            {playlists.map(playlist => (
              <li key={playlist.ratingKey}>
                {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                <a
                  href="#"
                  className={`${selectedPlaylist?.ratingKey === playlist.ratingKey ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handlePlaylistClick(playlist); }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{playlist.title}</span>
                    <span className="text-sm opacity-70">
                      {playlist.leafCount} tracks
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1">
          {selectedPlaylist ? (
            <>
              <div className="card bg-base-200 shadow-xl p-5 mb-5">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="card-title text-2xl">{selectedPlaylist.title}</h2>
                    <span className="badge badge-primary">{playlistTracks.length} tracks</span>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={exportPlaylistAsM3U}
                    disabled={playlistTracks.length === 0}
                    title="Export playlist as M3U file"
                  >
                    Export M3U
                  </button>
                </div>
              </div>

              {loadingTracks ? (
                <LoadingSpinner />
              ) : playlistTracks.length === 0 ? (
                <div className="text-center py-10 text-base-content/60 text-lg">This playlist is empty</div>
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
            <div className="text-center py-20">
              <h3 className="text-2xl font-bold text-base-content mb-3">Select a playlist</h3>
              <p className="text-base-content/60">Choose a playlist from the sidebar to view its tracks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Playlists;