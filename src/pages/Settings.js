import React from 'react';
import { Box, Typography } from '@mui/material';
import AlbumCardSettings from '../components/AlbumCardSettings';
import { PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';

const Settings = () => {
  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        px: 2.5,
        pt: `${NAVBAR_HEIGHT + 20}px`,
        pb: `${PLAYER_HEIGHT + 20}px`
      }}
      className="custom-scrollbar"
    >
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2.5 }}>
        Display Settings
      </Typography>
      <AlbumCardSettings />
    </Box>
  );
};

export default Settings;
