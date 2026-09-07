import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import { AuthProvider } from '../contexts/AuthContext';
import { getPlexDefaults } from '../api/configApi';

jest.mock('../api/configApi');
const mockedGetPlexDefaults = getPlexDefaults as jest.MockedFunction<typeof getPlexDefaults>;

jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: {
      id: 1,
      username: 'milantrax',
      email: 'milantrax@example.com',
      plexUrl: null,
      plexToken: null,
      hasCustomPlex: false,
      createdAt: '2026-02-18T01:17:51.000Z',
    },
    loading: false,
    isAuthenticated: true,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateProfile: jest.fn(),
  }),
}));

function renderSettings() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Settings />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetPlexDefaults.mockResolvedValue({
    defaultPlexUrl: 'http://100.65.64.7:32400',
    hasDefaultToken: true,
  });
});

test('shows the three tabs with Library selected first', () => {
  renderSettings();
  const tabs = screen.getAllByRole('tab');
  expect(tabs.map(t => t.textContent)).toEqual(['Library', 'Appearance', 'Account']);
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
});

test('Library tab uses the env default as the URL placeholder', async () => {
  renderSettings();
  const urlField = screen.getByLabelText(/Plex Server URL/i);
  await waitFor(() => {
    expect(urlField).toHaveAttribute('placeholder', 'http://100.65.64.7:32400');
  });
  expect(screen.getByText(/Leave empty to use the default server \(http:\/\/100\.65\.64\.7:32400\)/i)).toBeInTheDocument();
});

test('Library tab explains how to obtain a Plex token', async () => {
  renderSettings();

  // The steps live in a collapsed accordion, so they are hidden from the
  // accessibility tree until it is opened — same as for a real reader.
  await userEvent.click(screen.getByText(/How do I find my Plex token\?/i));

  expect(await screen.findByText(/choose "Get Info"/i)).toBeInTheDocument();
  expect(screen.getByText(/copy the value after X-Plex-Token=/i)).toBeInTheDocument();
  expect(screen.getByText(/treat it like a\s+password/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Plex's own guide/i }))
    .toHaveAttribute('href', expect.stringContaining('support.plex.tv'));
});

test('falls back to a generic placeholder when no default is configured', async () => {
  mockedGetPlexDefaults.mockResolvedValue({ defaultPlexUrl: null, hasDefaultToken: false });
  renderSettings();
  await waitFor(() => {
    expect(screen.getByLabelText(/Plex Server URL/i))
      .toHaveAttribute('placeholder', 'http://192.168.1.100:32400');
  });
});

test('Appearance tab holds the album card settings and preview', async () => {
  renderSettings();
  await userEvent.click(screen.getByRole('tab', { name: 'Appearance' }));
  expect(screen.getByText('Album Cards')).toBeInTheDocument();
  expect(screen.getByText(/Album Card Width/i)).toBeInTheDocument();
  expect(screen.getByText('Preview:')).toBeInTheDocument();
  expect(screen.queryByText('Plex Server')).not.toBeInTheDocument();
});

test('Account tab holds the account details, not the Plex settings', async () => {
  renderSettings();
  await userEvent.click(screen.getByRole('tab', { name: 'Account' }));
  expect(screen.getByText('milantrax@example.com')).toBeInTheDocument();
  expect(screen.getByText('milantrax')).toBeInTheDocument();
  expect(screen.getByText('Member since')).toBeInTheDocument();
  expect(screen.queryByLabelText(/Plex Server URL/i)).not.toBeInTheDocument();
});
