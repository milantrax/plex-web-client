// src/components/LoadingSpinner.js
import { Box } from '@mui/material';
import { NAVBAR_HEIGHT, PLAYER_HEIGHT } from '../theme/theme';

function LoadingSpinner() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: `calc(100vh - ${NAVBAR_HEIGHT}px - ${PLAYER_HEIGHT}px)`,
        mt: `${NAVBAR_HEIGHT}px`,
        mb: `${PLAYER_HEIGHT}px`
      }}
    >
      <Box
        sx={{
          width: '80px',
          height: '80px',
          border: '8px solid #f3f3f3',
          borderTop: '8px solid #f0a500',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' }
          }
        }}
      />
    </Box>
  );
}

export default LoadingSpinner;
