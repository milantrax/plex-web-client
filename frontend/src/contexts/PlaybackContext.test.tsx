import { renderHook, act, waitFor } from '@testing-library/react';
import { PlaybackProvider, usePlayback } from './PlaybackContext';
import queueManager from '../utils/queueManager';
import type { PlexTrack } from '../types';

jest.mock('../utils/queueManager');
const mockedQueue = queueManager as jest.Mocked<typeof queueManager>;

const TRACK: PlexTrack = {
  ratingKey: '501',
  title: 'So What',
  grandparentTitle: 'Miles Davis',
  parentTitle: 'Kind of Blue',
  parentRatingKey: '42',
  parentThumb: '/thumb/42',
  parentYear: 1959,
};

function setup() {
  return renderHook(() => usePlayback(), { wrapper: PlaybackProvider });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedQueue.clearQueue.mockResolvedValue(true);
  mockedQueue.addToQueue.mockResolvedValue(true);
});

test('playing a track starts a fresh queue holding just that track', async () => {
  const { result } = setup();

  await act(async () => {
    result.current.onPlayTrack(TRACK);
  });

  expect(mockedQueue.clearQueue).toHaveBeenCalledTimes(1);
  expect(mockedQueue.addToQueue).toHaveBeenCalledTimes(1);
  expect(mockedQueue.addToQueue.mock.calls[0][0]).toBe(TRACK);
  await waitFor(() => expect(result.current.currentTrack).toBe(TRACK));
  expect(result.current.isPlaying).toBe(true);
});

test('the queue entry carries the album details taken from the track', async () => {
  const { result } = setup();

  await act(async () => {
    result.current.onPlayTrack(TRACK);
  });

  expect(mockedQueue.addToQueue.mock.calls[0][1]).toEqual({
    title: 'Kind of Blue',
    artist: 'Miles Davis',
    thumb: '/thumb/42',
    ratingKey: '42',
    year: 1959,
  });
});

test('the queue is rebuilt before the track is set, so the player sees it', async () => {
  const order: string[] = [];
  mockedQueue.clearQueue.mockImplementation(async () => { order.push('clear'); return true; });
  mockedQueue.addToQueue.mockImplementation(async () => { order.push('add'); return true; });

  const { result } = setup();
  await act(async () => {
    result.current.onPlayTrack(TRACK);
  });

  await waitFor(() => expect(result.current.currentTrack).toBe(TRACK));
  expect(order).toEqual(['clear', 'add']);
});

test('replaceQueue:false leaves an already-built queue alone', async () => {
  const { result } = setup();

  await act(async () => {
    result.current.onPlayTrack(TRACK, { replaceQueue: false });
  });

  expect(mockedQueue.clearQueue).not.toHaveBeenCalled();
  expect(mockedQueue.addToQueue).not.toHaveBeenCalled();
  await waitFor(() => expect(result.current.currentTrack).toBe(TRACK));
});

test('advancing to the next track never touches the queue', async () => {
  const { result } = setup();
  const next: PlexTrack = { ratingKey: '502', title: 'Blue in Green' };

  await act(async () => {
    result.current.onPlayNext(next);
  });

  expect(mockedQueue.clearQueue).not.toHaveBeenCalled();
  expect(mockedQueue.addToQueue).not.toHaveBeenCalled();
  expect(result.current.currentTrack).toBe(next);
});

test('a track finishing hands over to the queue without rebuilding it', async () => {
  const next: PlexTrack = { ratingKey: '502', title: 'Blue in Green' };
  mockedQueue.getNextTrack.mockResolvedValue(next);

  const { result } = setup();
  await act(async () => {
    await result.current.onTrackEnded(TRACK);
  });

  expect(mockedQueue.getNextTrack).toHaveBeenCalledWith('501');
  expect(mockedQueue.clearQueue).not.toHaveBeenCalled();
  expect(result.current.currentTrack).toBe(next);
});
