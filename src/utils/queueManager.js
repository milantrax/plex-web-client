// src/utils/queueManager.js
import { storage } from './storage';

const QUEUE_STORAGE_KEY = 'plex_playback_queue';

/**
 * Queue Manager for handling playback queue persistence and operations using IndexedDB
 */
class QueueManager {
  constructor() {
    this.storageKey = QUEUE_STORAGE_KEY;
  }

  /**
   * Get the current queue from IndexedDB
   * @returns {Promise<Array>} Array of queued tracks
   */
  async getQueue() {
    try {
      const queueData = await storage.get(this.storageKey, Infinity, 'queue');
      return queueData || [];
    } catch (error) {
      console.error('Error reading queue from IndexedDB:', error);
      return [];
    }
  }

  /**
   * Save queue to IndexedDB
   * @param {Array} queue - Array of tracks to save
   * @returns {Promise<boolean>} Success status
   */
  async saveQueue(queue) {
    try {
      await storage.set(this.storageKey, queue, 'queue');
      return true;
    } catch (error) {
      console.error('Error saving queue to IndexedDB:', error);
      return false;
    }
  }

  /**
   * Add a track to the queue
   * @param {Object} track - Track object to add
   * @param {Object} albumData - Album data for context
   * @returns {Promise<boolean>} Success status
   */
  async addToQueue(track, albumData = null) {
    try {
      const queue = await this.getQueue();

      const existingIndex = queue.findIndex(queueItem =>
        queueItem.track.ratingKey === track.ratingKey
      );

      if (existingIndex !== -1) {
        console.log('Track already in queue');
        return false; // Track already exists
      }

      const queueItem = {
        id: Date.now() + Math.random(), // Unique ID for queue item
        addedAt: new Date().toISOString(),
        track: {
          ...track,
          ratingKey: track.ratingKey,
          title: track.title,
          duration: track.duration,
          index: track.index,
          key: track.key
        },
        album: albumData ? {
          title: albumData.title,
          artist: albumData.parentTitle || albumData.artist,
          thumb: albumData.thumb,
          ratingKey: albumData.ratingKey,
          year: albumData.year
        } : null
      };

      queue.push(queueItem);

      return await this.saveQueue(queue);
    } catch (error) {
      console.error('Error adding track to queue:', error);
      return false;
    }
  }

  /**
   * Add multiple tracks to the queue (e.g., entire album)
   * @param {Array} tracks - Array of track objects to add
   * @param {Object} albumData - Album data for context
   * @returns {Promise<Object>} Result with success status and count of added tracks
   */
  async addMultipleToQueue(tracks, albumData = null) {
    try {
      console.log('addMultipleToQueue called with:', { tracksCount: tracks.length, albumData });
      const queue = await this.getQueue();
      console.log('Current queue before adding:', queue);
      let addedCount = 0;

      const sortedTracks = [...tracks].sort((a, b) =>
        (a.index || 0) - (b.index || 0)
      );

      console.log('Sorted tracks:', sortedTracks);

      sortedTracks.forEach((track, idx) => {
        console.log(`Processing track ${idx}:`, track);
        const existingIndex = queue.findIndex(queueItem =>
          queueItem.track.ratingKey === track.ratingKey
        );

        if (existingIndex === -1) {
          const queueItem = {
            id: Date.now() + Math.random() + idx,
            addedAt: new Date().toISOString(),
            track: {
              ...track,
              ratingKey: track.ratingKey,
              title: track.title,
              duration: track.duration,
              index: track.index,
              key: track.key
            },
            album: albumData ? {
              title: albumData.title,
              artist: albumData.parentTitle || albumData.artist,
              thumb: albumData.thumb,
              ratingKey: albumData.ratingKey,
              year: albumData.year
            } : null
          };

          console.log('Adding queue item:', queueItem);
          queue.push(queueItem);
          addedCount++;
        } else {
          console.log(`Track ${track.title} already in queue at index ${existingIndex}`);
        }
      });

      if (addedCount > 0) {
        console.log('Saving queue with', addedCount, 'new tracks');
        const saveResult = await this.saveQueue(queue);
        console.log('Save result:', saveResult);
      }

      const result = {
        success: addedCount > 0,
        addedCount,
        skippedCount: tracks.length - addedCount
      };
      console.log('Final result:', result);

      return result;
    } catch (error) {
      console.error('Error adding multiple tracks to queue:', error);
      return {
        success: false,
        addedCount: 0,
        skippedCount: tracks.length
      };
    }
  }

  /**
   * Remove a track from the queue by queue item ID
   * @param {string|number} queueItemId - ID of the queue item to remove
   * @returns {Promise<boolean>} Success status
   */
  async removeFromQueue(queueItemId) {
    try {
      const queue = await this.getQueue();
      const updatedQueue = queue.filter(item => item.id !== queueItemId);
      
      if (updatedQueue.length === queue.length) {
        return false;
      }

      return await this.saveQueue(updatedQueue);
    } catch (error) {
      console.error('Error removing track from queue:', error);
      return false;
    }
  }

  /**
   * Remove a track from the queue by track ratingKey
   * @param {string} trackRatingKey - Track's ratingKey to remove
   * @returns {Promise<boolean>} Success status
   */
  async removeTrackFromQueue(trackRatingKey) {
    try {
      const queue = await this.getQueue();
      const updatedQueue = queue.filter(item => 
        item.track.ratingKey !== trackRatingKey
      );
      
      if (updatedQueue.length === queue.length) {
        return false;
      }

      return await this.saveQueue(updatedQueue);
    } catch (error) {
      console.error('Error removing track from queue:', error);
      return false;
    }
  }

  /**
   * Clear the entire queue
   * @returns {Promise<boolean>} Success status
   */
  async clearQueue() {
    try {
      return await this.saveQueue([]);
    } catch (error) {
      console.error('Error clearing queue:', error);
      return false;
    }
  }

  /**
   * Move a track to a different position in the queue
   * @param {string|number} queueItemId - ID of the queue item to move
   * @param {number} newIndex - New position index
   * @returns {Promise<boolean>} Success status
   */
  async moveInQueue(queueItemId, newIndex) {
    try {
      const queue = await this.getQueue();
      const itemIndex = queue.findIndex(item => item.id === queueItemId);
      
      if (itemIndex === -1 || newIndex < 0 || newIndex >= queue.length) {
        return false;
      }

      const [movedItem] = queue.splice(itemIndex, 1);
      queue.splice(newIndex, 0, movedItem);

      return await this.saveQueue(queue);
    } catch (error) {
      console.error('Error moving track in queue:', error);
      return false;
    }
  }

  /**
   * Check if a track is in the queue
   * @param {string} trackRatingKey - Track's ratingKey to check
   * @returns {Promise<boolean>} Whether track is in queue
   */
  async isInQueue(trackRatingKey) {
    try {
      const queue = await this.getQueue();
      return queue.some(item => item.track.ratingKey === trackRatingKey);
    } catch (error) {
      console.error('Error checking if track is in queue:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStats() {
    try {
      const queue = await this.getQueue();
      const totalTracks = queue.length;
      const totalDuration = queue.reduce((total, item) => 
        total + (item.track.duration || 0), 0
      );

      return {
        totalTracks,
        totalDuration,
        totalDurationFormatted: this.formatDuration(totalDuration)
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return { totalTracks: 0, totalDuration: 0, totalDurationFormatted: '0:00' };
    }
  }

  /**
   * Format duration from milliseconds to MM:SS
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  /**
   * Get the next track in the queue after the current track
   * @param {string} currentTrackRatingKey - Current track's ratingKey
   * @returns {Object|null} Next track or null if none found
   */
  async getNextTrack(currentTrackRatingKey) {
    try {
      const queue = await this.getQueue();
      
      if (queue.length === 0) {
        return null;
      }

      const currentIndex = queue.findIndex(item => 
        item.track.ratingKey === currentTrackRatingKey
      );

      if (currentIndex === -1) {
        return queue[0].track;
      }

      if (currentIndex === queue.length - 1) {
        return null;
      }

      return queue[currentIndex + 1].track;
    } catch (error) {
      console.error('Error getting next track:', error);
      return null;
    }
  }

  /**
   * Get the previous track in the queue before the current track
   * @param {string} currentTrackRatingKey - Current track's ratingKey
   * @returns {Object|null} Previous track or null if none found
   */
  async getPreviousTrack(currentTrackRatingKey) {
    try {
      const queue = await this.getQueue();
      
      if (queue.length === 0) {
        return null;
      }

      const currentIndex = queue.findIndex(item => 
        item.track.ratingKey === currentTrackRatingKey
      );

      if (currentIndex <= 0) {
        return null;
      }

      return queue[currentIndex - 1].track;
    } catch (error) {
      console.error('Error getting previous track:', error);
      return null;
    }
  }

  /**
   * Check if there's a next track available in the queue
   * @param {string} currentTrackRatingKey - Current track's ratingKey
   * @returns {Promise<boolean>} Whether there's a next track
   */
  async hasNextTrack(currentTrackRatingKey) {
    return await this.getNextTrack(currentTrackRatingKey) !== null;
  }

  /**
   * Check if there's a previous track available in the queue
   * @param {string} currentTrackRatingKey - Current track's ratingKey
   * @returns {Promise<boolean>} Whether there's a previous track
   */
  async hasPreviousTrack(currentTrackRatingKey) {
    return await this.getPreviousTrack(currentTrackRatingKey) !== null;
  }

  /**
   * Remove the current track from queue after it's been played
   * @param {string} trackRatingKey - Track's ratingKey to remove
   * @param {boolean} autoRemove - Whether to automatically remove played tracks
   * @returns {Promise<boolean>} Success status
   */
  async handleTrackPlayed(trackRatingKey, autoRemove = false) {
    try {
      if (autoRemove) {
        return await this.removeTrackFromQueue(trackRatingKey);
      }
      return true;
    } catch (error) {
      console.error('Error handling played track:', error);
      return false;
    }
  }
}

const queueManager = new QueueManager();
export default queueManager;
