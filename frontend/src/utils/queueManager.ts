// src/utils/queueManager.ts
import { storage } from './storage';
import type {
  AddMultipleResult,
  PlexTrack,
  QueueAlbumInput,
  QueueItem,
  QueueStats
} from '../types';

const QUEUE_STORAGE_KEY = 'plex_playback_queue';

/**
 * Queue Manager for handling playback queue persistence and operations using IndexedDB
 */
class QueueManager {
  private storageKey: string;

  constructor() {
    this.storageKey = QUEUE_STORAGE_KEY;
  }

  /**
   * Get the current queue from IndexedDB
   * @returns Array of queued tracks
   */
  async getQueue(): Promise<QueueItem[]> {
    try {
      const queueData = await storage.get<QueueItem[]>(this.storageKey, Infinity, 'queue');
      return queueData || [];
    } catch (error) {
      console.error('Error reading queue from IndexedDB:', error);
      return [];
    }
  }

  /**
   * Save queue to IndexedDB
   * @param queue - Array of tracks to save
   * @returns Success status
   */
  async saveQueue(queue: QueueItem[]): Promise<boolean> {
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
   * @param track - Track object to add
   * @param albumData - Album data for context
   * @returns Success status
   */
  async addToQueue(track: PlexTrack, albumData: QueueAlbumInput | null = null): Promise<boolean> {
    try {
      const queue = await this.getQueue();

      const existingIndex = queue.findIndex(queueItem =>
        queueItem.track.ratingKey === track.ratingKey
      );

      if (existingIndex !== -1) {
        console.log('Track already in queue');
        return false; // Track already exists
      }

      const queueItem: QueueItem = {
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
   * @param tracks - Array of track objects to add
   * @param albumData - Album data for context
   * @returns Result with success status and count of added tracks
   */
  async addMultipleToQueue(
    tracks: PlexTrack[],
    albumData: QueueAlbumInput | null = null
  ): Promise<AddMultipleResult> {
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
          const queueItem: QueueItem = {
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

      const result: AddMultipleResult = {
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
   * Replace the whole queue with the given tracks.
   *
   * What "play this album/playlist" does: the previous queue is dropped and
   * these become the queue, in track order.
   *
   * @param tracks - The tracks to queue
   * @param albumData - Album context stored with each entry
   * @returns Result with success status and count of added tracks
   */
  async replaceWith(
    tracks: PlexTrack[],
    albumData: QueueAlbumInput | null = null
  ): Promise<AddMultipleResult> {
    await this.clearQueue();
    return this.addMultipleToQueue(tracks, albumData);
  }

  /**
   * Remove a track from the queue by queue item ID
   * @param queueItemId - ID of the queue item to remove
   * @returns Success status
   */
  async removeFromQueue(queueItemId: string | number): Promise<boolean> {
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
   * @param trackRatingKey - Track's ratingKey to remove
   * @returns Success status
   */
  async removeTrackFromQueue(trackRatingKey: string): Promise<boolean> {
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
   * @returns Success status
   */
  async clearQueue(): Promise<boolean> {
    try {
      return await this.saveQueue([]);
    } catch (error) {
      console.error('Error clearing queue:', error);
      return false;
    }
  }

  /**
   * Move a track to a different position in the queue
   * @param queueItemId - ID of the queue item to move
   * @param newIndex - New position index
   * @returns Success status
   */
  async moveInQueue(queueItemId: string | number, newIndex: number): Promise<boolean> {
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
   * @param trackRatingKey - Track's ratingKey to check
   * @returns Whether track is in queue
   */
  async isInQueue(trackRatingKey: string): Promise<boolean> {
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
   * @returns Queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
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
   * @param milliseconds - Duration in milliseconds
   * @returns Formatted duration
   */
  formatDuration(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  }

  /**
   * Get the next track in the queue after the current track
   * @param currentTrackRatingKey - Current track's ratingKey
   * @returns Next track or null if none found
   */
  async getNextTrack(currentTrackRatingKey: string): Promise<PlexTrack | null> {
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
   * @param currentTrackRatingKey - Current track's ratingKey
   * @returns Previous track or null if none found
   */
  async getPreviousTrack(currentTrackRatingKey: string): Promise<PlexTrack | null> {
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
   * @param currentTrackRatingKey - Current track's ratingKey
   * @returns Whether there's a next track
   */
  async hasNextTrack(currentTrackRatingKey: string): Promise<boolean> {
    return await this.getNextTrack(currentTrackRatingKey) !== null;
  }

  /**
   * Check if there's a previous track available in the queue
   * @param currentTrackRatingKey - Current track's ratingKey
   * @returns Whether there's a previous track
   */
  async hasPreviousTrack(currentTrackRatingKey: string): Promise<boolean> {
    return await this.getPreviousTrack(currentTrackRatingKey) !== null;
  }

  /**
   * Remove the current track from queue after it's been played
   * @param trackRatingKey - Track's ratingKey to remove
   * @param autoRemove - Whether to automatically remove played tracks
   * @returns Success status
   */
  async handleTrackPlayed(trackRatingKey: string, autoRemove = false): Promise<boolean> {
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
