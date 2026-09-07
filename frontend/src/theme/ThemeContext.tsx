import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme } from './theme';
import { getAppConfig } from '../api/configApi';
import type { DefaultTheme } from '../api/configApi';

export type ThemeMode = 'light' | 'dark';

export interface ThemeModeContextValue {
  /** The theme actually in effect. */
  mode: ThemeMode;
  toggleTheme: () => void;
  /** True while the mode is following the device rather than an explicit choice. */
  followsSystem: boolean;
  /** Discards the saved choice and goes back to following the device. */
  useSystemTheme: () => void;
}

const STORAGE_KEY = 'plexThemeMode';

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export const useThemeMode = (): ThemeModeContextValue => {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return context;
};

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

function getSystemMode(): ThemeMode {
  // matchMedia is missing in some test environments, so treat its absence as
  // "no preference expressed" rather than letting the provider throw.
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light';
}

/** The user's own choice, or null when they have never picked one. */
function readStoredMode(): ThemeMode | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    // Private-mode browsers can throw on access; fall back to no preference.
    return null;
  }
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // An explicit choice made in this browser. Null means "not chosen", which is
  // what lets the device preference show through.
  const [storedMode, setStoredMode] = useState<ThemeMode | null>(readStoredMode);
  const [systemMode, setSystemMode] = useState<ThemeMode>(getSystemMode);
  const [serverDefault, setServerDefault] = useState<DefaultTheme>('system');

  // Track the device preference so the app follows it as it changes, rather
  // than only reading it once at startup.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const query = window.matchMedia(SYSTEM_DARK_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemMode(event.matches ? 'dark' : 'light');
    };

    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  // The deployment's preferred starting theme. Only consulted when this
  // browser has no choice of its own, so it never overrides the user.
  useEffect(() => {
    let active = true;
    getAppConfig().then(config => {
      if (active) setServerDefault(config.defaultTheme);
    });
    return () => {
      active = false;
    };
  }, []);

  // Precedence: what the user picked here, then what the deployment asks for,
  // then the device.
  const mode: ThemeMode =
    storedMode ?? (serverDefault === 'system' ? systemMode : serverDefault);

  const followsSystem = storedMode === null && serverDefault === 'system';

  const contextValue = useMemo<ThemeModeContextValue>(() => {
    // Only an explicit action writes to storage. Persisting the resolved mode
    // on mount would freeze the first-seen theme in place and stop the device
    // preference from ever showing through again.
    const persist = (next: ThemeMode | null) => {
      try {
        if (next === null) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage being unavailable only costs persistence, not correctness.
      }
      setStoredMode(next);
    };

    return {
      mode,
      followsSystem,
      toggleTheme: () => persist(mode === 'light' ? 'dark' : 'light'),
      useSystemTheme: () => persist(null),
    };
  }, [mode, followsSystem]);

  const theme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
};
