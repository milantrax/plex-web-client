import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AlbumCard from './AlbumCard';
import { getAlbumTracks } from '../api/plexApi';
import queueManager from '../utils/queueManager';
import type { PlexAlbum, PlexTrack } from '../types';

jest.mock('../api/plexApi', () => ({
  ...jest.requireActual('../api/plexApi'),
  getAlbumTracks: jest.fn(),
}));
jest.mock('../utils/queueManager');

const mockedGetAlbumTracks = getAlbumTracks as jest.MockedFunction<typeof getAlbumTracks>;
const mockedQueue = queueManager as jest.Mocked<typeof queueManager>;

const ALBUM: PlexAlbum = {
  ratingKey: '42',
  title: 'Kind of Blue',
  parentTitle: 'Miles Davis',
  thumb: '/thumb/42',
};

/** A track with playable media attached. */
function playable(ratingKey: string, title: string, index: number): PlexTrack {
  return { ratingKey, title, index, Media: [{ Part: [{ key: `/part/${ratingKey}` }] }] };
}

const onPlayTrack = jest.fn();

function renderCard() {
  return render(
    <MemoryRouter>
      <AlbumCard album={ALBUM} onPlayTrack={onPlayTrack} />
    </MemoryRouter>
  );
}

/**
 * Hovers the card before pressing play. The overlay carries
 * pointer-events: none until the card is hovered, so a bare click would not
 * reach the button — the same as for a real pointer.
 */
async function pressPlay(container: HTMLElement) {
  await userEvent.hover(container.firstElementChild as Element);
  await userEvent.click(screen.getByRole('button'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedQueue.replaceWith.mockResolvedValue({ success: true, addedCount: 3, skippedCount: 0 });
});

test('playing an album queues every track, not just the first', async () => {
  const tracks = [playable('1', 'So What', 1), playable('2', 'Freddie Freeloader', 2), playable('3', 'Blue in Green', 3)];
  mockedGetAlbumTracks.mockResolvedValue(tracks);

  const { container } = renderCard();
  await pressPlay(container);

  await waitFor(() => expect(mockedQueue.replaceWith).toHaveBeenCalledTimes(1));
  const [queued, albumContext] = mockedQueue.replaceWith.mock.calls[0];
  expect(queued.map(t => t.ratingKey)).toEqual(['1', '2', '3']);
  expect(albumContext).toBe(ALBUM);
});

test('the album starts on its first track', async () => {
  mockedGetAlbumTracks.mockResolvedValue([playable('1', 'So What', 1), playable('2', 'Freddie Freeloader', 2)]);

  const { container } = renderCard();
  await pressPlay(container);

  await waitFor(() => expect(onPlayTrack).toHaveBeenCalledTimes(1));
  expect(onPlayTrack.mock.calls[0][0].title).toBe('So What');
  // The queue was just built; starting the track must not rebuild it.
  expect(onPlayTrack.mock.calls[0][1]).toEqual({ replaceQueue: false });
});

test('tracks are queued in album order even when returned out of order', async () => {
  mockedGetAlbumTracks.mockResolvedValue([
    playable('3', 'Blue in Green', 3),
    playable('1', 'So What', 1),
    playable('2', 'Freddie Freeloader', 2),
  ]);

  const { container } = renderCard();
  await pressPlay(container);

  await waitFor(() => expect(mockedQueue.replaceWith).toHaveBeenCalled());
  expect(mockedQueue.replaceWith.mock.calls[0][0].map(t => t.ratingKey)).toEqual(['1', '2', '3']);
  expect(onPlayTrack.mock.calls[0][0].title).toBe('So What');
});

test('skips an unplayable opening track and starts on the first that has media', async () => {
  mockedGetAlbumTracks.mockResolvedValue([
    { ratingKey: '1', title: 'Silence', index: 1 },
    playable('2', 'So What', 2),
  ]);

  const { container } = renderCard();
  await pressPlay(container);

  await waitFor(() => expect(onPlayTrack).toHaveBeenCalled());
  expect(onPlayTrack.mock.calls[0][0].title).toBe('So What');
});

test('an album with no playable tracks queues nothing and plays nothing', async () => {
  window.alert = jest.fn();
  mockedGetAlbumTracks.mockResolvedValue([{ ratingKey: '1', title: 'Silence', index: 1 }]);

  const { container } = renderCard();
  await pressPlay(container);

  await waitFor(() => expect(window.alert).toHaveBeenCalled());
  expect(mockedQueue.replaceWith).not.toHaveBeenCalled();
  expect(onPlayTrack).not.toHaveBeenCalled();
});
