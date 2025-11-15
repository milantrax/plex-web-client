/**
 * Audio Debugging Utility
 * 
 * This file contains functions to help diagnose audio streaming issues
 * with Plex API.
 */

import { PLEX_URL, PLEX_TOKEN } from '../config';

export const testPlexConnection = async () => {
  try {
    const response = await fetch(`${PLEX_URL}?X-Plex-Token=${PLEX_TOKEN}`, {
      method: 'GET',
    });
    
    if (response.ok) {
      console.log('✅ Plex server connection successful');
      return true;
    } else {
      console.error('❌ Plex server connection failed', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Plex server connection error:', error);
    return false;
  }
};

export const testAudioURL = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
    });
    
    console.log('Audio URL test response:', {
      status: response.status,
      ok: response.ok,
      headers: Array.from(response.headers.entries())
    });
    
    return response.ok;
  } catch (error) {
    console.error('Audio URL test error:', error);
    return false;
  }
};

export const logAudioElementInfo = (audioElement) => {
  if (!audioElement) {
    console.error('No audio element provided');
    return;
  }
  
  console.group('Audio Element Details');
  console.log('Current Time:', audioElement.currentTime);
  console.log('Duration:', audioElement.duration);
  console.log('Paused:', audioElement.paused);
  console.log('Source:', audioElement.currentSrc);
  console.log('Ready State:', audioElement.readyState);
  console.log('Network State:', audioElement.networkState);
  console.log('Error:', audioElement.error ? audioElement.error.code : 'None');
  console.groupEnd();
};

export const initAudioDiagnostics = () => {
  console.log('Audio diagnostics initialized');
  
  testPlexConnection().then(success => {
    if (!success) {
      console.error('Plex server connection test failed. Check your PLEX_URL and PLEX_TOKEN.');
    }
  });
  
  window.debugPlexAudio = (audioElement) => {
    logAudioElementInfo(audioElement);
  };
  
  console.log('You can debug audio element by calling window.debugPlexAudio(audioElement)');
};
