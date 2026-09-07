import queueManager from './queueManager';
import { storage } from './storage';
import type { PlexTrack, QueueItem } from '../types';

jest.mock('./storage');
const mockedStorage = storage as jest.Mocked<typeof storage>;

/** An in-memory stand-in for the IndexedDB-backed queue store. */
let saved: QueueItem[] = [];

const track = (ratingKey: string, title: string): PlexTrack => ({ ratingKey, title });

beforeEach(() => {
  jest.clearAllMocks();
  saved = [];
  mockedStorage.get.mockImplementation(async () => saved as never);
  mockedStorage.set.mockImplementation(async (_key, data) => {
    saved = data as QueueItem[];
  });
});

test('a track added after the current one plays next', async () => {
  await queueManager.addToQueue(track('1', 'Current'));
  await queueManager.addToQueue(track('2', 'Added later'));

  const next = await queueManager.getNextTrack('1');
  expect(next?.ratingKey).toBe('2');
});

test('further additions keep queuing behind the ones before them', async () => {
  await queueManager.addToQueue(track('1', 'Current'));
  await queueManager.addToQueue(track('2', 'Second'));
  await queueManager.addToQueue(track('3', 'Third'));

  expect((await queueManager.getNextTrack('1'))?.ratingKey).toBe('2');
  expect((await queueManager.getNextTrack('2'))?.ratingKey).toBe('3');
  expect(await queueManager.getNextTrack('3')).toBeNull();
});

test('playback stops at the end rather than looping', async () => {
  await queueManager.addToQueue(track('1', 'Only'));
  expect(await queueManager.getNextTrack('1')).toBeNull();
  expect(await queueManager.hasNextTrack('1')).toBe(false);
});

test('previous walks back the way next walked forward', async () => {
  await queueManager.addToQueue(track('1', 'First'));
  await queueManager.addToQueue(track('2', 'Second'));

  expect((await queueManager.getPreviousTrack('2'))?.ratingKey).toBe('1');
  expect(await queueManager.getPreviousTrack('1')).toBeNull();
});

test('clearing then adding one track leaves a queue of exactly that track', async () => {
  await queueManager.addToQueue(track('1', 'Old'));
  await queueManager.addToQueue(track('2', 'Older'));

  await queueManager.clearQueue();
  await queueManager.addToQueue(track('9', 'Just clicked'));

  const queue = await queueManager.getQueue();
  expect(queue).toHaveLength(1);
  expect(queue[0].track.ratingKey).toBe('9');
});
