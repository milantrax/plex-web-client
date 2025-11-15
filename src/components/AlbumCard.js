// src/components/AlbumCard.js
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlexImageUrl, getAlbumTracks } from '../api/plexApi';
import { getAlbumCardWidth } from '../utils/settingsStorage';
import './AlbumCard.scss';

function AlbumCard({ album, onPlayTrack, currentTrack, isPlaying, onTogglePlayback }) {
  const imageUrl = getPlexImageUrl(album.thumb);
  const navigate = useNavigate();
  const actionInProgress = useRef(false);
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

  const isCurrentAlbum = currentTrack && currentTrack.parentTitle === album.title;
  const showPauseIcon = isCurrentAlbum && isPlaying;

  const handlePlayPauseClick = async (e) => {
    e.stopPropagation();
    
    if (actionInProgress.current) {
      return;
    }
    
    actionInProgress.current = true;
    
    if (isCurrentAlbum && isPlaying) {
      if (onTogglePlayback) {
        onTogglePlayback(); // Pause current playback
      }

      setTimeout(() => { actionInProgress.current = false; }, 500);
      return;
    }
    
    if (isCurrentAlbum && !isPlaying) {
      if (onTogglePlayback) {
        onTogglePlayback();
      }

      setTimeout(() => { actionInProgress.current = false; }, 500);
      return;
    }
    
    try {
        console.log(`Fetching tracks for album: ${album.title} (Key: ${album.ratingKey})`);
        const tracks = await getAlbumTracks(album.ratingKey);
        if (tracks && tracks.length > 0) {
            const firstPlayableTrack = tracks.find(t => t.Media && t.Media.length > 0 && t.Media[0].Part && t.Media[0].Part.length > 0);
            if (firstPlayableTrack) {
                console.log(`Playing first track: ${firstPlayableTrack.title}`);
                onPlayTrack(firstPlayableTrack); // Pass the whole track object
              } else {
                console.warn(`No playable tracks found in album: ${album.title}`);
                alert(`No playable tracks found in album: ${album.title}`);
            }
        } else {
            console.warn(`No tracks found for album: ${album.title}`);
            alert(`No tracks found for album: ${album.title}`);
        }
    } catch (error) {
        console.error("Error getting tracks for album:", error);
        alert("Could not load tracks for this album.");
    } finally {
        setTimeout(() => { actionInProgress.current = false; }, 500);
    }
  };

  const handleCardClick = () => {
    navigate(`/album/${album.ratingKey}`);
  };

  return (
    <div 
      className="album-card" 
      onClick={handleCardClick}
      style={{ 
        width: `${cardWidth}px`,
        '--card-width': `${cardWidth}px`,
        cursor: 'pointer'
      }}
    >
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={`${album.title} cover`} 
          loading="lazy"
          style={{ 
            width: '100%',
            height: `${cardWidth}px`,
            objectFit: 'cover'
          }}
        />
      ) : (
        <div 
          className="album-placeholder"
          style={{ 
            width: '100%',
            height: `${cardWidth}px`
          }}
        >
          No Art
        </div>
      )}
      <div className="album-info">
        <p className="album-title">{album.title}</p>
        <p className="album-artist">{album.parentTitle}</p> {/* Artist Name */}
      </div>
      <div className="album-overlay">
        <div className={`play-icon-button ${isCurrentAlbum ? 'playing' : ''}`} onClick={handlePlayPauseClick}>
          <span className="play-icon">
            {showPauseIcon ? '⏸' : '▶'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AlbumCard;