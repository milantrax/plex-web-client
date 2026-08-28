import { createTheme } from '@mui/material/styles';

// ============================================
// COLOR CONSTANTS - Easy Customization Point
// ============================================
// Change these values to update the entire app's color scheme
const COLORS = {
  primary: '#f0a500',       // Plex orange - main accent color
  primaryDark: '#e67e22',   // Darker orange for hover states
  secondary: '#e67e22',     // Secondary accent
  error: '#e74c3c',         // Error states
  warning: '#fbbd23',       // Warning states
  info: '#3abff8',          // Info states
  success: '#36d399',       // Success states
};

// ============================================
// THEME CONSTANTS - Exported for layout calculations
// ============================================
export const NAVBAR_HEIGHT = 64;
export const PLAYER_HEIGHT = 100;
export const SIDEBAR_WIDTH = 250;

// ============================================
// LIGHT THEME
// ============================================
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: COLORS.primary,
      dark: COLORS.primaryDark,
    },
    secondary: {
      main: COLORS.secondary,
    },
    error: {
      main: COLORS.error,
    },
    warning: {
      main: COLORS.warning,
    },
    info: {
      main: COLORS.info,
    },
    success: {
      main: COLORS.success,
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
  spacing: 8,
  shape: {
    borderRadius: 4,
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
  },
  constants: {
    navbarHeight: NAVBAR_HEIGHT,
    playerHeight: PLAYER_HEIGHT,
  },
});

// ============================================
// DARK THEME
// ============================================
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: COLORS.primary,
      dark: COLORS.primaryDark,
    },
    secondary: {
      main: COLORS.secondary,
    },
    error: {
      main: COLORS.error,
    },
    warning: {
      main: COLORS.warning,
    },
    info: {
      main: COLORS.info,
    },
    success: {
      main: COLORS.success,
    },
    background: {
      default: '#282c34',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#bbbbbb',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
  spacing: 8,
  shape: {
    borderRadius: 8,
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
  },
  constants: {
    navbarHeight: NAVBAR_HEIGHT,
    playerHeight: PLAYER_HEIGHT,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1a1a',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#202020',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
