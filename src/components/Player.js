// src/components/Player.js
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getPlexAudioUrl, getPlexTranscodeUrl, getPlexImageUrl } from '../api/plexApi';
import queueManager from '../utils/queueManager';
import {
  AppBar,
  Toolbar,
  Box,
  Slider,
  IconButton,
  Typography,
  Stack
} from '@mui/material';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

const Player = forwardRef(({ currentTrack, onPlayStateChange, onTrackEnded, onPlayNext, onPlayPrevious }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);
  const [trackInfo, setTrackInfo] = useState(null);
  const [useTranscode, setUseTranscode] = useState(false);
  const audioRef = useRef(null);
  const [audioError, setAudioError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useImperativeHandle(ref, () => ({
    togglePlayPause: () => togglePlayPause(),
    playNext: () => playNextTrack(),
    playPrevious: () => playPreviousTrack()
  }));

  useEffect(() => {
    if (currentTrack && currentTrack.Media && currentTrack.Media.length > 0 &&
        currentTrack.Media[0].Part && currentTrack.Media[0].Part.length > 0) {

      const partKey = currentTrack.Media[0].Part[0].key;
      const streamUrl = useTranscode ? getPlexTranscodeUrl(partKey) : getPlexAudioUrl(partKey);

      console.log("Setting audio source:", streamUrl);
      setAudioSrc(streamUrl);
      setAudioError(false);
      setCurrentTime(0);

      if (currentTrack.duration) {
        setDuration(currentTrack.duration / 1000);
      }

      setTrackInfo({
        title: currentTrack.title,
        artist: currentTrack.grandparentTitle || 'Unknown Artist',
        album: currentTrack.parentTitle || 'Unknown Album',
        artUrl: getPlexImageUrl(currentTrack.thumb || currentTrack.parentThumb || currentTrack.grandparentThumb)
      });

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.load();
      }
    } else {
      setAudioSrc(null);
      setTrackInfo(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    }
  }, [currentTrack, useTranscode]);

  useEffect(() => {
    if (audioSrc && audioRef.current && currentTrack) {
      console.log("Auto-playing new track:", currentTrack.title);

      if (audioRef.current.src !== audioSrc) {
        audioRef.current.src = audioSrc;
        audioRef.current.load();
      }

      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Audio auto-play started successfully");
            setIsPlaying(true);
            if (onPlayStateChange) {
              onPlayStateChange(true);
            }
          })
          .catch(error => {
            console.error("Error auto-playing audio:", error);
            setIsPlaying(false);
            if (onPlayStateChange) {
              onPlayStateChange(false);
            }
          });
      }
    }
  }, [currentTrack, audioSrc, onPlayStateChange]);

  const playNextTrack = () => {
    if (!currentTrack) return;

    const nextTrack = queueManager.getNextTrack(currentTrack.ratingKey);
    if (nextTrack && onPlayNext) {
      console.log('Manually playing next track:', nextTrack);
      onPlayNext(nextTrack);
    }
  };

  const playPreviousTrack = () => {
    if (!currentTrack) return;

    const previousTrack = queueManager.getPreviousTrack(currentTrack.ratingKey);
    if (previousTrack && onPlayPrevious) {
      console.log('Manually playing previous track:', previousTrack);
      onPlayPrevious(previousTrack);
    }
  };

  const togglePlayPause = () => {
    console.log('Player togglePlayPause called, current isPlaying:', isPlaying);

    if (!audioRef.current || !audioSrc) {
      console.log('No audio element or source available');
      return;
    }

    if (isPlaying) {
      console.log('Player: Pausing audio');
      audioRef.current.pause();
      setIsPlaying(false);
      if (onPlayStateChange) {
        onPlayStateChange(false);
      }
    } else {
      console.log('Player: Starting audio');
      audioRef.current.play()
        .then(() => {
          console.log('Play promise resolved successfully');
          setIsPlaying(true);
          if (onPlayStateChange) {
            onPlayStateChange(true);
          }
        })
        .catch(e => {
          console.error("Error playing audio:", e);
          setIsPlaying(false);
          if (onPlayStateChange) {
            onPlayStateChange(false);
          }
        });
    }
  };

  const handleAudioError = (e) => {
    console.error("Audio Error:", e);
    setAudioError(true);

    if (!useTranscode && currentTrack) {
      console.log("Direct playback failed, trying transcoding...");
      setUseTranscode(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleMetadataLoaded = () => {
    if (audioRef.current && audioRef.current.duration !== Infinity) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds) return "0:00";

    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleProgressChange = (event, newValue) => {
    if (!audioRef.current || !duration) return;

    const newTime = (newValue / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    if (onPlayStateChange) {
      onPlayStateChange(true);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (onPlayStateChange) {
      onPlayStateChange(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (onPlayStateChange) {
      onPlayStateChange(false);
    }

    if (onTrackEnded) {
      onTrackEnded(currentTrack);
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasNext = currentTrack ? queueManager.hasNextTrack(currentTrack.ratingKey) : false;
  const hasPrevious = currentTrack ? queueManager.hasPreviousTrack(currentTrack.ratingKey) : false;

  return (
    <AppBar
      position="fixed"
      color="default"
      sx={{
        top: 'auto',
        bottom: 0,
        borderTop: 2,
        borderColor: 'primary.main',
        transition: 'transform 0.3s ease-in-out',
        transform: !trackInfo ? 'translateY(100%)' : 'translateY(0)',
        zIndex: 1000,
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(26, 26, 26, 0.8)'
            : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <Toolbar sx={{ gap: 2, justifyContent: 'space-between' }}>
        {/* Track Info */}
        {trackInfo && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              minWidth: 200,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {trackInfo.artUrl && (
              <Box
                component="img"
                src={trackInfo.artUrl}
                alt="Track art"
                sx={{
                  width: 50,
                  height: 50,
                  objectFit: 'cover',
                  mr: 2,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                }}
              />
            )}
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {trackInfo.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {trackInfo.artist} - {trackInfo.album}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Progress Section */}
        <Box sx={{ flexGrow: 1, mx: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Slider
            value={progressPercentage}
            onChange={handleProgressChange}
            aria-label="Progress"
            sx={{
              height: 6,
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
              },
              '& .MuiSlider-rail': {
                opacity: 0.3,
              },
            }}
          />
          <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mt: 0.25, mb: 0.75 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
              {formatTime(currentTime)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
              {formatTime(duration)}
            </Typography>
          </Stack>
        </Box>

        {/* Control Buttons */}
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            onClick={playPreviousTrack}
            disabled={!hasPrevious}
            color="inherit"
            title="Previous track"
          >
            <SkipPreviousIcon />
          </IconButton>

          <IconButton
            onClick={togglePlayPause}
            disabled={!audioSrc}
            color="primary"
            size="large"
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              '&:disabled': {
                bgcolor: 'action.disabledBackground',
              },
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          <IconButton
            onClick={playNextTrack}
            disabled={!hasNext}
            color="inherit"
            title="Next track"
          >
            <SkipNextIcon />
          </IconButton>

          {audioError && (
            <IconButton
              onClick={() => setUseTranscode(!useTranscode)}
              color="inherit"
              size="small"
              title={`Try ${useTranscode ? 'Direct Play' : 'Transcode'}`}
            >
              <SwapHorizIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Toolbar>

      <audio
        ref={audioRef}
        src={audioSrc || ''}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleAudioError}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleMetadataLoaded}
        preload="auto"
        style={{ display: 'none' }}
      />
    </AppBar>
  );
});

export default Player;
