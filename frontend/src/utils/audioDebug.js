/**
 * Audio Debugging Utility
 */

export const testPlexConnection = async () => {
  try {
    const response = await fetch('/api/plex/test-connection', {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log('✅ Plex server connection successful:', data.serverName, data.version);
        return true;
      }
    }
    console.error('❌ Plex server connection failed');
    return false;
  } catch (error) {
    console.error('❌ Plex server connection error:', error);
    return false;
  }
};

export const testAudioURL = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      credentials: 'include'
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

  window.debugPlexAudio = (audioElement) => {
    logAudioElementInfo(audioElement);
  };

  console.log('You can debug audio element by calling window.debugPlexAudio(audioElement)');
};
