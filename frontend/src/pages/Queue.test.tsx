import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Queue from './Queue';
import queueManager from '../utils/queueManager';
import type { PlexTrack, QueueItem } from '../types';

jest.mock('../utils/queueManager');
const mockedQueueManager = queueManager as jest.Mocked<typeof queueManager>;

const mockTogglePlayback = jest.fn();
const mockPlayNext = jest.fn();
const mockPlayPrevious = jest.fn();
let mockCurrentTrack: PlexTrack | null = null;
let mockIsPlaying = false;

jest.mock('../contexts/PlaybackContext', () => ({
  usePlayback: () => ({
    currentTrack: mockCurrentTrack,
    isPlaying: mockIsPlaying,
    onPlayTrack: jest.fn(),
    onTogglePlayback: mockTogglePlayback,
    playerRef: { current: { togglePlayPause: jest.fn(), playNext: mockPlayNext, playPrevious: mockPlayPrevious } },
  }),
}));

jest.mock('../contexts/FavoritesContext', () => ({
  useFavorites: () => ({ favorites: [], isFavorite: () => false, toggleFavorite: jest.fn() }),
}));

const TRACK: PlexTrack = {
  ratingKey: '501',
  title: 'So What',
  grandparentTitle: 'Miles Davis',
  parentTitle: 'Kind of Blue',
  parentRatingKey: '42',
  parentThumb: '/library/metadata/42/thumb',
  duration: 545000,
};

function queueItem(track: PlexTrack): QueueItem {
  return { id: 1, addedAt: new Date().toISOString(), track, album: null };
}

function renderQueue() {
  return render(<MemoryRouter><Queue /></MemoryRouter>);
}

beforeEach(() => {
  mockCurrentTrack = null;
  mockIsPlaying = false;
  jest.clearAllMocks();
  mockedQueueManager.getQueue.mockResolvedValue([]);
  mockedQueueManager.getQueueStats.mockResolvedValue({
    totalTracks: 0, totalDuration: 0, totalDurationFormatted: '0:00',
  });
});

test('invites you to play something when nothing is playing', async () => {
  renderQueue();
  expect(await screen.findByText('Nothing playing')).toBeInTheDocument();
  expect(screen.getByText(/Play an album, track or playlist/i)).toBeInTheDocument();
});

test('shows the current track and its album art above the queue', async () => {
  mockCurrentTrack = TRACK;
  renderQueue();

  expect(await screen.findByText('Now Playing')).toBeInTheDocument();
  expect(screen.getByText('So What')).toBeInTheDocument();
  expect(screen.getByText('Miles Davis')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Kind of Blue' })).toBeInTheDocument();
  expect(screen.getByText('9:05')).toBeInTheDocument();

  const art = screen.getByAltText('Kind of Blue') as HTMLImageElement;
  expect(art.src).toContain(encodeURIComponent('/library/metadata/42/thumb'));
});

test('a track played straight from an album is shown even though it is not queued', async () => {
  mockCurrentTrack = TRACK;
  mockedQueueManager.getQueue.mockResolvedValue([queueItem({ ratingKey: '999', title: 'Other' })]);
  mockedQueueManager.getQueueStats.mockResolvedValue({
    totalTracks: 1, totalDuration: 1000, totalDurationFormatted: '0:01',
  });
  renderQueue();

  expect(await screen.findByText('So What')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('Not in queue')).toBeInTheDocument());
});

test('reports the position when the track does come from the queue', async () => {
  mockCurrentTrack = TRACK;
  mockedQueueManager.getQueue.mockResolvedValue([
    queueItem({ ratingKey: '999', title: 'Other' }),
    queueItem(TRACK),
  ]);
  renderQueue();
  expect(await screen.findByText('2 of 2 in queue')).toBeInTheDocument();
});

test('the transport controls drive the player', async () => {
  mockCurrentTrack = TRACK;
  renderQueue();

  await userEvent.click(await screen.findByTitle('Play'));
  expect(mockTogglePlayback).toHaveBeenCalled();

  await userEvent.click(screen.getByTitle('Next track'));
  expect(mockPlayNext).toHaveBeenCalled();

  await userEvent.click(screen.getByTitle('Previous track'));
  expect(mockPlayPrevious).toHaveBeenCalled();
});

test('the play control reflects that playback is running', async () => {
  mockCurrentTrack = TRACK;
  mockIsPlaying = true;
  renderQueue();
  expect(await screen.findByTitle('Pause')).toBeInTheDocument();
});
