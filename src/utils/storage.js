import localforage from 'localforage';

// IndexedDB instances for different data types
const apiCache = localforage.createInstance({
  name: 'plexMusicPlayer',
  storeName: 'apiCache',
  description: 'Cached API responses from Plex server'
});

const queueStore = localforage.createInstance({
  name: 'plexMusicPlayer',
  storeName: 'queue',
  description: 'Playback queue'
});

const settingsStore = localforage.createInstance({
  name: 'plexMusicPlayer',
  storeName: 'settings',
  description: 'User settings and preferences'
});

/**
 * Storage abstraction layer for IndexedDB
 * Provides caching with expiration times and easy migration path for Node.js proxy
 */
class StorageManager {
  constructor() {
    this.stores = {
      api: apiCache,
      queue: queueStore,
      settings: settingsStore
    };
  }

  /**
   * Get cached data with expiration check
   * @param {string} key - Cache key
   * @param {number} expirationMinutes - Cache expiration in minutes
   * @param {string} store - Store type ('api', 'queue', 'settings')
   * @returns {Promise<any|null>} - Cached data or null if expired/missing
   */
  async get(key, expirationMinutes = 60, store = 'api') {
    try {
      const cached = await this.stores[store].getItem(key);

      if (!cached) {
        return null;
      }

      // Check expiration (skip for queue and settings)
      if (store === 'api' && cached.timestamp) {
        const isExpired = Date.now() - cached.timestamp > expirationMinutes * 60000;
        if (isExpired) {
          await this.stores[store].removeItem(key);
          return null;
        }
      }

      return cached.data;
    } catch (error) {
      console.error(`Storage get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with timestamp
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {string} store - Store type ('api', 'queue', 'settings')
   * @returns {Promise<void>}
   */
  async set(key, data, store = 'api') {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now()
      };
      await this.stores[store].setItem(key, cacheEntry);
    } catch (error) {
      console.error(`Storage set error for key ${key}:`, error);
      // IndexedDB can throw QuotaExceededError - handle gracefully
      if (error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, clearing old cache...');
        await this.clearOldCache(store);
        // Retry once after clearing
        try {
          const cacheEntry = { data, timestamp: Date.now() };
          await this.stores[store].setItem(key, cacheEntry);
        } catch (retryError) {
          console.error('Storage set retry failed:', retryError);
        }
      }
    }
  }

  /**
   * Remove specific cache entry
   * @param {string} key - Cache key
   * @param {string} store - Store type
   * @returns {Promise<void>}
   */
  async remove(key, store = 'api') {
    try {
      await this.stores[store].removeItem(key);
    } catch (error) {
      console.error(`Storage remove error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache for a specific store
   * @param {string} store - Store type ('api', 'queue', 'settings')
   * @returns {Promise<void>}
   */
  async clear(store = 'api') {
    try {
      await this.stores[store].clear();
      console.log(`Cleared ${store} store`);
    } catch (error) {
      console.error(`Storage clear error for ${store}:`, error);
    }
  }

  /**
   * Clear all stores
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await Promise.all([
        this.clear('api'),
        this.clear('queue'),
        this.clear('settings')
      ]);
      console.log('Cleared all stores');
    } catch (error) {
      console.error('Storage clearAll error:', error);
    }
  }

  /**
   * Clear old cache entries (older than 7 days)
   * @param {string} store - Store type
   * @returns {Promise<void>}
   */
  async clearOldCache(store = 'api') {
    try {
      const keys = await this.stores[store].keys();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      for (const key of keys) {
        const cached = await this.stores[store].getItem(key);
        if (cached && cached.timestamp && cached.timestamp < sevenDaysAgo) {
          await this.stores[store].removeItem(key);
        }
      }
      console.log(`Cleared old cache entries from ${store} store`);
    } catch (error) {
      console.error(`Storage clearOldCache error for ${store}:`, error);
    }
  }

  /**
   * Get storage usage estimate
   * @returns {Promise<object>} - Storage quota and usage info
   */
  async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage,
          quota: estimate.quota,
          usageInMB: (estimate.usage / (1024 * 1024)).toFixed(2),
          quotaInMB: (estimate.quota / (1024 * 1024)).toFixed(2),
          percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2)
        };
      } catch (error) {
        console.error('Storage estimate error:', error);
      }
    }
    return null;
  }

}

export const storage = new StorageManager();
export { apiCache, queueStore, settingsStore };
