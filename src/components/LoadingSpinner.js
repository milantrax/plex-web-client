// src/components/LoadingSpinner.js
import React from 'react';
import { Box, CircularProgress } from '@mui/material';

function LoadingSpinner() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        my: 5
      }}
    >
      <CircularProgress color="primary" size={60} />
    </Box>
  );
}

export default LoadingSpinner;
