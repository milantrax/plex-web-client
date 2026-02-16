/* eslint-disable no-restricted-globals */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `plex-player-static-${CACHE_VERSION}`;
const MEDIA_CACHE = `plex-player-media-${CACHE_VERSION}`;
const RUNTIME_CACHE = `plex-player-runtime-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/favicon.ico'
];

// Maximum cache sizes
const MAX_MEDIA_CACHE_SIZE = 50; // Maximum 50 media files
const MAX_RUNTIME_CACHE_SIZE = 100; // Maximum 100 runtime entries

// Cache freshness duration (3 hours in milliseconds)
const CACHE_FRESHNESS_DURATION = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        // Don't fail installation if some assets can't be cached
        return cache.addAll(STATIC_ASSETS.filter(url => {
          // Only cache root HTML and manifest, skip built assets that may not exist yet
          return url === '/' || url === '/index.html' || url === '/manifest.json' || url === '/favicon.ico';
        })).catch((error) => {
          console.warn('[Service Worker] Failed to cache some static assets:', error);
          // Continue installation even if caching fails
          return Promise.resolve();
        });
      })
      // Don't auto-skipWaiting - wait for user approval or explicit message
      // .then(() => self.skipWaiting())
  );
});

/**
 * Activate event - cleanup old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old cache versions
            if (cacheName.startsWith('plex-player-') &&
                cacheName !== STATIC_CACHE &&
                cacheName !== MEDIA_CACHE &&
                cacheName !== RUNTIME_CACHE) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event - serve from cache or network
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests (except Plex server)
  if (url.origin !== self.location.origin && !url.href.includes(':32400')) {
    return;
  }

  // Determine caching strategy based on request type
  if (isPlexMediaRequest(url)) {
    // Plex media (images, audio) - cache-first with 3-hour freshness
    event.respondWith(cacheFirstWithRevalidation(request, MEDIA_CACHE, MAX_MEDIA_CACHE_SIZE));
  } else if (isPlexAPIRequest(url)) {
    // Plex API requests - cache-first with 3-hour freshness
    event.respondWith(cacheFirstWithRevalidation(request, RUNTIME_CACHE, MAX_RUNTIME_CACHE_SIZE));
  } else if (isStaticAsset(url)) {
    // Static assets - cache-first strategy (no revalidation needed)
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else {
    // Default - network-first for HTML pages
    event.respondWith(networkFirstStrategy(request, RUNTIME_CACHE));
  }
});

/**
 * Check if request is for Plex media (images, audio)
 */
function isPlexMediaRequest(url) {
  return url.href.includes(':32400') && (
    url.pathname.includes('/photo/') ||
    url.pathname.includes('/library/parts/') ||
    url.pathname.includes('/music/') ||
    url.searchParams.has('X-Plex-Token')
  );
}

/**
 * Check if request is for Plex API
 */
function isPlexAPIRequest(url) {
  return url.href.includes(':32400') && (
    url.pathname.includes('/library/sections') ||
    url.pathname.includes('/playlists') ||
    url.pathname.includes('/search')
  );
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(url) {
  return url.origin === self.location.origin && (
    url.pathname.startsWith('/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  );
}

/**
 * Cache-first strategy: try cache, fallback to network
 */
async function cacheFirstStrategy(request, cacheName, maxSize = null) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Not in cache, fetch from network
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      // Clone response before caching
      const responseToCache = networkResponse.clone();

      // Add to cache and enforce size limit
      cache.put(request, responseToCache).then(() => {
        if (maxSize) {
          enforceCacheLimit(cacheName, maxSize);
        }
      });
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache-first strategy failed:', error);
    throw error;
  }
}

/**
 * Cache-first with time-based revalidation
 * Serves from cache if fresh (< 3 hours old), otherwise fetches from network
 */
async function cacheFirstWithRevalidation(request, cacheName, maxSize = null) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    // Check if cached response exists and is fresh
    if (cachedResponse) {
      const cachedTime = new Date(cachedResponse.headers.get('date')).getTime();
      const now = Date.now();
      const age = now - cachedTime;

      // If cache is fresh (less than 3 hours old), return it
      if (age < CACHE_FRESHNESS_DURATION) {
        console.log(`[Service Worker] Serving fresh cache (${Math.floor(age / 1000 / 60)} min old):`, request.url);
        return cachedResponse;
      }

      // Cache is stale, fetch fresh data
      console.log(`[Service Worker] Cache stale (${Math.floor(age / 1000 / 60)} min old), fetching fresh:`, request.url);
    }

    // No cache or stale cache - fetch from network
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      // Clone response before caching
      const responseToCache = networkResponse.clone();

      // Add to cache and enforce size limit
      cache.put(request, responseToCache).then(() => {
        console.log('[Service Worker] Cached fresh response:', request.url);
        if (maxSize) {
          enforceCacheLimit(cacheName, maxSize);
        }
      });
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache-first with revalidation failed:', error);

    // If network fails, try to return stale cache as fallback
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[Service Worker] Network failed, serving stale cache:', request.url);
      return cachedResponse;
    }

    throw error;
  }
}

/**
 * Network-first strategy: try network, fallback to cache
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      cache.put(request, responseToCache).then(() => {
        enforceCacheLimit(cacheName, MAX_RUNTIME_CACHE_SIZE);
      });
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('[Service Worker] Network failed, trying cache:', error.message);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Both failed
    throw error;
  }
}

/**
 * Enforce cache size limit by removing oldest entries
 */
async function enforceCacheLimit(cacheName, maxSize) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > maxSize) {
      // Remove oldest entries (FIFO)
      const keysToDelete = keys.slice(0, keys.length - maxSize);
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
      console.log(`[Service Worker] Removed ${keysToDelete.length} old entries from ${cacheName}`);
    }
  } catch (error) {
    console.error('[Service Worker] Error enforcing cache limit:', error);
  }
}

/**
 * Message handler for cache management from the app
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('plex-player-')) {
              console.log('[Service Worker] Clearing cache:', cacheName);
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      }).then(() => {
        // Notify client that cache was cleared
        event.ports[0].postMessage({ success: true });
      })
    );
  } else if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
