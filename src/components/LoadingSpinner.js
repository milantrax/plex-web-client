// src/components/LoadingSpinner.js
import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { NAVBAR_HEIGHT } from '../theme/theme';

function LoadingSpinner() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pt: `${NAVBAR_HEIGHT + 20}px`,
        pb: 5
      }}
    >
      <CircularProgress color="primary" size={60} />
    </Box>
  );
}

export default LoadingSpinner;
