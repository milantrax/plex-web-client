// src/components/AlbumCard.js
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlexImageUrl, getAlbumTracks } from '../api/plexApi';
import { getAlbumCardWidth } from '../utils/settingsStorage';

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
      className="bg-plex-card rounded-lg overflow-hidden flex flex-col cursor-pointer relative
                 transition-all duration-200 shadow-[0_2px_5px_rgba(0,0,0,0.3)]
                 hover:-translate-y-1 hover:shadow-[0_8px_15px_rgba(0,0,0,0.4)]
                 group m-2.5"
      onClick={handleCardClick}
      style={{
        width: `${cardWidth}px`,
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${album.title} cover`}
          loading="lazy"
          className="w-full object-cover block"
          style={{
            height: `${cardWidth}px`,
          }}
        />
      ) : (
        <div
          className="w-full flex items-center justify-center bg-plex-card-hover text-plex-text-secondary text-xl"
          style={{
            height: `${cardWidth}px`,
          }}
        >
          No Art
        </div>
      )}
      <div className="p-2.5 text-left flex flex-col justify-start">
        <p className="font-bold text-[0.95em] my-0.5 text-plex-text-primary overflow-hidden text-ellipsis line-clamp-2 leading-tight break-words">
          {album.title}
        </p>
        <p className="text-[0.85em] text-plex-text-secondary m-0 overflow-hidden text-ellipsis line-clamp-1 break-words">
          {album.parentTitle}
        </p>
      </div>
      <div
        className="absolute top-0 left-0 w-full bg-black/70 flex flex-col justify-center items-center
                   opacity-0 transition-opacity duration-300 gap-2.5 group-hover:opacity-100"
        style={{ height: `${cardWidth}px` }}
      >
        <div
          className={`w-15 h-15 rounded-full border-0 cursor-pointer font-bold
                     transition-all duration-200 flex items-center justify-center
                     shadow-[0_4px_12px_rgba(0,0,0,0.3)]
                     hover:scale-110 hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)]
                     ${isCurrentAlbum
                       ? 'bg-[#ff6b6b] hover:bg-[#ff5252]'
                       : 'bg-plex-accent/50 text-black hover:bg-[#ffb800]'}`}
          onClick={handlePlayPauseClick}
        >
          <span className={`text-[1.8em] leading-none ${showPauseIcon ? '' : 'ml-0.5'}`}>
            {showPauseIcon ? '⏸' : '▶'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AlbumCard;