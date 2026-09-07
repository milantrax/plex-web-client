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

export type StoreName = 'api' | 'queue' | 'settings';

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
}

export interface StorageEstimateInfo {
  usage?: number;
  quota?: number;
  usageInMB: string;
  quotaInMB: string;
  percentUsed: string;
}

/**
 * Storage abstraction layer for IndexedDB
 * Provides caching with expiration times and easy migration path for Node.js proxy
 */
class StorageManager {
  private stores: Record<StoreName, LocalForage>;

  constructor() {
    this.stores = {
      api: apiCache,
      queue: queueStore,
      settings: settingsStore
    };
  }

  /**
   * Get cached data with expiration check
   * @param key - Cache key
   * @param expirationMinutes - Cache expiration in minutes
   * @param store - Store type ('api', 'queue', 'settings')
   * @returns Cached data or null if expired/missing
   */
  async get<T = unknown>(key: string, expirationMinutes = 60, store: StoreName = 'api'): Promise<T | null> {
    try {
      const cached = await this.stores[store].getItem<CacheEntry<T>>(key);

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
   * @param key - Cache key
   * @param data - Data to cache
   * @param store - Store type ('api', 'queue', 'settings')
   */
  async set<T = unknown>(key: string, data: T, store: StoreName = 'api'): Promise<void> {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now()
      };
      await this.stores[store].setItem(key, cacheEntry);
    } catch (error) {
      console.error(`Storage set error for key ${key}:`, error);
      // IndexedDB can throw QuotaExceededError - handle gracefully
      if ((error as Error)?.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, clearing old cache...');
        await this.clearOldCache(store);
        // Retry once after clearing
        try {
          const cacheEntry: CacheEntry<T> = { data, timestamp: Date.now() };
          await this.stores[store].setItem(key, cacheEntry);
        } catch (retryError) {
          console.error('Storage set retry failed:', retryError);
        }
      }
    }
  }

  /**
   * Remove specific cache entry
   * @param key - Cache key
   * @param store - Store type
   */
  async remove(key: string, store: StoreName = 'api'): Promise<void> {
    try {
      await this.stores[store].removeItem(key);
    } catch (error) {
      console.error(`Storage remove error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache for a specific store
   * @param store - Store type ('api', 'queue', 'settings')
   */
  async clear(store: StoreName = 'api'): Promise<void> {
    try {
      await this.stores[store].clear();
      console.log(`Cleared ${store} store`);
    } catch (error) {
      console.error(`Storage clear error for ${store}:`, error);
    }
  }

  /**
   * Clear all stores
   */
  async clearAll(): Promise<void> {
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
   * @param store - Store type
   */
  async clearOldCache(store: StoreName = 'api'): Promise<void> {
    try {
      const keys = await this.stores[store].keys();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      for (const key of keys) {
        const cached = await this.stores[store].getItem<CacheEntry>(key);
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
   * @returns Storage quota and usage info
   */
  async getStorageEstimate(): Promise<StorageEstimateInfo | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage ?? 0;
        const quota = estimate.quota ?? 0;
        return {
          usage: estimate.usage,
          quota: estimate.quota,
          usageInMB: (usage / (1024 * 1024)).toFixed(2),
          quotaInMB: (quota / (1024 * 1024)).toFixed(2),
          percentUsed: ((usage / quota) * 100).toFixed(2)
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
