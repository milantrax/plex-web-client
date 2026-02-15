import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme } from './theme';

// Create context for theme mode
const ThemeModeContext = createContext({
  mode: 'dark',
  toggleTheme: () => {},
});

// Custom hook to access theme mode
export const useThemeMode = () => {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return context;
};

// ThemeProvider component
export const ThemeProvider = ({ children }) => {
  // Initialize theme mode from localStorage or default to 'dark'
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('plexThemeMode');
    return savedMode || 'dark';
  });

  // Persist theme mode to localStorage
  useEffect(() => {
    localStorage.setItem('plexThemeMode', mode);
  }, [mode]);

  // Toggle between light and dark mode
  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      mode,
      toggleTheme,
    }),
    [mode]
  );

  // Select the appropriate theme based on mode
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
