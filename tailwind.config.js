/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Primary dark theme
        'plex-bg': '#282c34',
        'plex-player': '#202020',
        'plex-card': '#444',
        'plex-card-hover': '#555',
        'plex-accent': '#f0a500',
        'plex-accent-hover': '#e67e22',
        'plex-nav': '#333',
        'plex-surface': '#1a1a1a',
        'plex-border': '#333',
        'plex-error': '#e74c3c',
        'plex-danger': '#ff4757',

        // Text colors
        'plex-text': '#ffffff',
        'plex-text-primary': '#eee',
        'plex-text-secondary': '#bbb',
        'plex-text-muted': '#888',
        'plex-button-text': '#282c34',

        // UI elements
        'plex-toggle': '#444',
        'plex-toggle-hover': '#555',
        'plex-disabled': '#555',
      },
      gridTemplateColumns: {
        // TrackList custom grid: 50px 1fr 100px 60px 60px
        'track-list': '50px 1fr 100px 60px 60px',
        // Settings page: 250px 1fr
        'settings': '250px 1fr',
      },
      spacing: {
        '69': '69px', // Navbar height for content calculation
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        slideDown: {
          '0%': {
            opacity: '0',
            maxHeight: '0',
            paddingTop: '0',
            paddingBottom: '0',
          },
          '100%': {
            opacity: '1',
            maxHeight: '100px',
            paddingTop: '8px',
            paddingBottom: '8px',
          },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-icon': 'pulse 1.5s ease-in-out infinite',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      transitionDuration: {
        '300': '300ms',
      },
    },
  },
  plugins: [],
}

