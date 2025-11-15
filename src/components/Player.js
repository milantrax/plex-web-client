// src/components/Player.js
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getPlexAudioUrl, getPlexTranscodeUrl, getPlexImageUrl } from '../api/plexApi';
import queueManager from '../utils/queueManager';
import '../styles/Player.scss';

const Player = forwardRef(({ currentTrack, onPlayStateChange, onTrackEnded, onPlayNext, onPlayPrevious }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);
  const [trackInfo, setTrackInfo] = useState(null);
  const [useTranscode, setUseTranscode] = useState(false);
  const audioRef = useRef(null);
  const [audioError, setAudioError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressBarRef = useRef(null);

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
        setDuration(currentTrack.duration / 1000); // Convert from milliseconds to seconds
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
  }, [currentTrack, audioSrc, onPlayStateChange]); // Include all dependencies

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

  const handleProgressClick = (e) => {
    if (!audioRef.current || !duration) return;
    
    const progressBar = progressBarRef.current;
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = duration * clickPosition;
    
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
    <div className={`player-bar ${!trackInfo ? 'hidden' : ''}`}>
      {trackInfo && (
        <div className="player-track-info">
          {trackInfo.artUrl && <img src={trackInfo.artUrl} alt="Track art" className="player-art"/>}
          <div>
            <p className="player-title">{trackInfo.title}</p>
            <p className="player-artist-album">{trackInfo.artist} - {trackInfo.album}</p>
          </div>
        </div>
      )}
      
      <div className="player-progress-container">
        <div 
          className="player-progress-bar" 
          onClick={handleProgressClick}
          ref={progressBarRef}
        >
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="progress-time-container">
          <span className="player-time current-time">{formatTime(currentTime)}</span>
          <span className="player-time total-time">{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="player-controls">
        <button 
          onClick={playPreviousTrack} 
          disabled={!hasPrevious}
          className="nav-btn previous-btn"
          title="Previous track"
        >
          ⏮
        </button>
        
        <button onClick={togglePlayPause} disabled={!audioSrc} className="play-pause-btn">
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <button 
          onClick={playNextTrack} 
          disabled={!hasNext}
          className="nav-btn next-btn"
          title="Next track"
        >
          ⏭
        </button>
        
        {audioError && (
          <button 
            onClick={() => setUseTranscode(!useTranscode)} 
            className="player-mode-toggle"
          >
            Try {useTranscode ? 'Direct Play' : 'Transcode'}
          </button>
        )}
      </div>
      
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
      />
    </div>
  );
});

export default Player;