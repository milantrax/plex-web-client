import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import AlbumCardSettings from '../components/AlbumCardSettings';
import AccountSettings from '../components/AccountSettings';
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
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Settings
      </Typography>

      <AccountSettings />

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5 }}>
        Display Settings
      </Typography>
      <AlbumCardSettings />
    </Box>
  );
};

export default Settings;
