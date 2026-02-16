/**
 * Service Worker registration
 * Handles registration, updates, and communication with the service worker
 */

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

/**
 * Register the service worker
 * @param {object} config - Configuration with callbacks
 * @returns {void}
 */
export function register(config) {
  if ('serviceWorker' in navigator) {
    // Wait for the page to load
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        // Running on localhost - check if service worker exists
        checkValidServiceWorker(swUrl, config);

        // Log additional info for localhost
        navigator.serviceWorker.ready.then(() => {
          console.log(
            'This web app is being served cache-first by a service worker.'
          );
        });
      } else {
        // Not localhost - register service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

/**
 * Register valid service worker
 */
function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[Service Worker] Registered successfully');

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New service worker available
              console.log('[Service Worker] New content available, will refresh on next visit');

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Content cached for offline use
              console.log('[Service Worker] Content cached for offline use');

              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[Service Worker] Registration failed:', error);
    });
}

/**
 * Check if service worker exists
 */
function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // Service worker not found - reload page
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found - proceed with registration
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('[Service Worker] No internet connection, running in offline mode');
    });
}

/**
 * Unregister service worker
 */
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log('[Service Worker] Unregistered');
      })
      .catch((error) => {
        console.error('[Service Worker] Unregister error:', error.message);
      });
  }
}

/**
 * Clear all service worker caches
 * @returns {Promise<boolean>} - Success status
 */
export async function clearServiceWorkerCache() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          console.log('[Service Worker] Cache cleared successfully');
          resolve(true);
        } else {
          console.error('[Service Worker] Failed to clear cache');
          resolve(false);
        }
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  }

  // Fallback: manually clear caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => {
        if (cacheName.startsWith('plex-player-')) {
          return caches.delete(cacheName);
        }
        return Promise.resolve();
      })
    );
    console.log('[Cache API] Cleared all caches');
    return true;
  }

  return false;
}

/**
 * Get cache storage estimate
 * @returns {Promise<object|null>} - Cache size info
 */
export async function getCacheStorageEstimate() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;
      const cacheSizes = {};

      for (const cacheName of cacheNames) {
        if (cacheName.startsWith('plex-player-')) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();

          let cacheSize = 0;
          for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              cacheSize += blob.size;
            }
          }

          cacheSizes[cacheName] = {
            size: cacheSize,
            sizeInMB: (cacheSize / (1024 * 1024)).toFixed(2),
            entries: keys.length
          };
          totalSize += cacheSize;
        }
      }

      return {
        totalSize,
        totalSizeInMB: (totalSize / (1024 * 1024)).toFixed(2),
        caches: cacheSizes
      };
    } catch (error) {
      console.error('[Cache API] Failed to estimate cache size:', error);
      return null;
    }
  }
  return null;
}
