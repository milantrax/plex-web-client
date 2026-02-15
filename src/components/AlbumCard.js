// src/components/AlbumCard.js
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlexImageUrl, getAlbumTracks } from '../api/plexApi';
import { getAlbumCardWidth } from '../utils/settingsStorage';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

function AlbumCard({ album, onPlayTrack, currentTrack, isPlaying, onTogglePlayback, isArtist = false }) {
  const imageUrl = getPlexImageUrl(album.thumb || album.art);
  const navigate = useNavigate();
  const actionInProgress = useRef(false);
  const [cardWidth, setCardWidth] = useState(getAlbumCardWidth());
  const [isHovered, setIsHovered] = useState(false);

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
        onTogglePlayback();
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
          onPlayTrack(firstPlayableTrack);
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
    if (isArtist) {
      navigate(`/artist/${album.ratingKey}`);
    } else {
      navigate(`/album/${album.ratingKey}`);
    }
  };

  return (
    <Card
      elevation={2}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      sx={{
        width: cardWidth,
        m: 1.25,
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          elevation: 4,
        },
      }}
    >
      {/* Album Cover or Placeholder */}
      {imageUrl ? (
        <CardMedia
          component="img"
          image={imageUrl}
          alt={`${album.title} cover`}
          sx={{
            width: cardWidth,
            height: cardWidth,
            objectFit: 'cover',
          }}
          loading="lazy"
        />
      ) : (
        <Box
          sx={{
            width: cardWidth,
            height: cardWidth,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.disabledBackground',
            color: 'text.disabled',
            fontSize: '1.2rem',
          }}
        >
          No Art
        </Box>
      )}

      {/* Play/Pause Overlay - Only for albums, not artists */}
      {!isArtist && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: cardWidth,
            height: cardWidth,
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: isHovered || isCurrentAlbum ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            pointerEvents: isHovered || isCurrentAlbum ? 'auto' : 'none',
          }}
        >
          <IconButton
            onClick={handlePlayPauseClick}
            sx={{
              width: 60,
              height: 60,
              bgcolor: isCurrentAlbum ? 'error.main' : 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: isCurrentAlbum ? 'error.dark' : 'primary.dark',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease-in-out',
              boxShadow: 3,
            }}
          >
            {showPauseIcon ? (
              <PauseIcon sx={{ fontSize: '2rem' }} />
            ) : (
              <PlayArrowIcon sx={{ fontSize: '2rem' }} />
            )}
          </IconButton>
        </Box>
      )}

      {/* Album/Artist Info */}
      <CardContent sx={{ p: 1.25, textAlign: 'left' }}>
        <Typography
          variant="body2"
          component="h2"
          sx={{
            fontWeight: 700,
            my: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.2,
            wordBreak: 'break-word',
          }}
        >
          {album.title}
        </Typography>
        {!isArtist && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              m: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              wordBreak: 'break-word',
            }}
          >
            {album.parentTitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default AlbumCard;
