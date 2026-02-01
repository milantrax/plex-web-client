// src/components/Player.js
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getPlexAudioUrl, getPlexTranscodeUrl, getPlexImageUrl } from '../api/plexApi';
import queueManager from '../utils/queueManager';

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
    <div className={`fixed bottom-0 left-0 w-full bg-base-300 border-t-2 border-primary px-5 py-2.5 flex items-center justify-between box-border transition-transform duration-300 ease-in-out z-[1000] ${!trackInfo ? 'translate-y-full' : ''}`}>
      {trackInfo && (
        <div className="flex items-center justify-start text-left flex-grow-0 min-w-[200px] overflow-hidden mr-5">
          {trackInfo.artUrl && <img src={trackInfo.artUrl} alt="Track art" className="w-[50px] h-[50px] object-cover mr-[15px] rounded bg-base-200"/>}
          <div className="overflow-hidden text-left">
            <p className="text-base-content font-bold m-0 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{trackInfo.title}</p>
            <p className="text-base-content/70 text-[0.9em] m-0 whitespace-nowrap overflow-hidden text-ellipsis">{trackInfo.artist} - {trackInfo.album}</p>
          </div>
        </div>
      )}

      <div className="flex-grow flex flex-col mx-[15px]">
        <div
          className="w-full h-1.5 bg-base-200 rounded-[3px] cursor-pointer relative"
          onClick={handleProgressClick}
          ref={progressBarRef}
        >
          <div
            className="h-full bg-primary rounded-[3px] absolute left-0 top-0 transition-[width] duration-100 ease-linear"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between mt-1.5 gap-2.5">
          <span className="text-base-content/60 text-[0.8em] font-[tabular-nums]">{formatTime(currentTime)}</span>
          <span className="text-base-content/60 text-[0.8em] font-[tabular-nums]">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-start mx-2.5 gap-2">
        <button
          onClick={playPreviousTrack}
          disabled={!hasPrevious}
          className="btn btn-ghost text-[1.2em]"
          title="Previous track"
        >
          ⏮
        </button>

        <button onClick={togglePlayPause} disabled={!audioSrc} className="btn btn-primary text-[1.4em] mx-2">
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          onClick={playNextTrack}
          disabled={!hasNext}
          className="btn btn-ghost text-[1.2em]"
          title="Next track"
        >
          ⏭
        </button>

        {audioError && (
          <button
            onClick={() => setUseTranscode(!useTranscode)}
            className="btn btn-ghost text-[0.9em]"
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
        className="hidden"
      />
    </div>
  );
});

export default Player;