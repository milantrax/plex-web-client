import { act, render, screen } from '@testing-library/react';
import { ThemeProvider, useThemeMode } from './ThemeContext';
import { getAppConfig } from '../api/configApi';
import type { DefaultTheme } from '../api/configApi';

jest.mock('../api/configApi');
const mockedGetAppConfig = getAppConfig as jest.MockedFunction<typeof getAppConfig>;

function setSystemPrefersDark(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark') ? prefersDark : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

let controls: { toggleTheme: () => void; useSystemTheme: () => void };

function Probe() {
  const { mode, followsSystem, toggleTheme, useSystemTheme } = useThemeMode();
  controls = { toggleTheme, useSystemTheme };
  return <span data-testid="mode">{`${mode}:${followsSystem}`}</span>;
}

async function renderWithConfig(defaultTheme: DefaultTheme) {
  mockedGetAppConfig.mockResolvedValue({ defaultTheme });
  render(<ThemeProvider><Probe /></ThemeProvider>);
  // let the config fetch settle
  await screen.findByTestId('mode');
  await new Promise(r => setTimeout(r, 0));
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test('follows the system when nothing is configured or saved', async () => {
  setSystemPrefersDark(true);
  await renderWithConfig('system');
  expect(screen.getByTestId('mode')).toHaveTextContent('dark:true');
});

test('follows the system the other way too', async () => {
  setSystemPrefersDark(false);
  await renderWithConfig('system');
  expect(screen.getByTestId('mode')).toHaveTextContent('light:true');
});

test('does NOT write to localStorage on mount', async () => {
  setSystemPrefersDark(true);
  await renderWithConfig('system');
  // The regression this guards: persisting the resolved mode on mount would
  // pin the first-seen theme and stop the device preference showing through.
  expect(localStorage.getItem('plexThemeMode')).toBeNull();
});

test('DEFAULT_THEME from the server overrides the system preference', async () => {
  setSystemPrefersDark(true);
  await renderWithConfig('light');
  expect(screen.getByTestId('mode')).toHaveTextContent('light:false');
});

test("a saved choice beats both the server default and the system", async () => {
  localStorage.setItem('plexThemeMode', 'dark');
  setSystemPrefersDark(false);
  await renderWithConfig('light');
  expect(screen.getByTestId('mode')).toHaveTextContent('dark:false');
});

test('ignores a junk value in localStorage and falls back', async () => {
  localStorage.setItem('plexThemeMode', 'chartreuse');
  setSystemPrefersDark(true);
  await renderWithConfig('system');
  expect(screen.getByTestId('mode')).toHaveTextContent('dark:true');
});

test('toggling saves an explicit choice and stops following the system', async () => {
  setSystemPrefersDark(true);
  await renderWithConfig('system');
  expect(screen.getByTestId('mode')).toHaveTextContent('dark:true');

  act(() => controls.toggleTheme());

  expect(screen.getByTestId('mode')).toHaveTextContent('light:false');
  expect(localStorage.getItem('plexThemeMode')).toBe('light');
});

test('"Match system" discards the saved choice and follows the device again', async () => {
  localStorage.setItem('plexThemeMode', 'light');
  setSystemPrefersDark(true);
  await renderWithConfig('system');
  expect(screen.getByTestId('mode')).toHaveTextContent('light:false');

  act(() => controls.useSystemTheme());

  expect(screen.getByTestId('mode')).toHaveTextContent('dark:true');
  expect(localStorage.getItem('plexThemeMode')).toBeNull();
});
