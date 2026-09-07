import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import PaletteIcon from '@mui/icons-material/Palette';
import PersonIcon from '@mui/icons-material/Person';
import LibrarySettings from '../components/LibrarySettings';
import AlbumCardSettings from '../components/AlbumCardSettings';
import AccountSettings from '../components/AccountSettings';
import { PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';

const TABS = [
  { label: 'Library', icon: <LibraryMusicIcon fontSize="small" /> },
  { label: 'Appearance', icon: <PaletteIcon fontSize="small" /> },
  { label: 'Account', icon: <PersonIcon fontSize="small" /> }
];

/**
 * Only the selected panel is mounted, so each tab's data loads when it is
 * first opened rather than all three on arrival.
 */
function TabPanel({ index, value, children }: { index: number; value: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return (
    <Box
      role="tabpanel"
      id={`settings-panel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      sx={{ pt: 3 }}
    >
      {children}
    </Box>
  );
}

const Settings = () => {
  const [tab, setTab] = useState(0);

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
      <Box sx={{ maxWidth: 720 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Settings
        </Typography>

        <Tabs
          value={tab}
          onChange={(_e, next: number) => setTab(next)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {TABS.map((t, index) => (
            <Tab
              key={t.label}
              label={t.label}
              icon={t.icon}
              iconPosition="start"
              id={`settings-tab-${index}`}
              aria-controls={`settings-panel-${index}`}
              sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }}
            />
          ))}
        </Tabs>

        <TabPanel index={0} value={tab}>
          <LibrarySettings />
        </TabPanel>

        <TabPanel index={1} value={tab}>
          <AlbumCardSettings />
        </TabPanel>

        <TabPanel index={2} value={tab}>
          <AccountSettings />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default Settings;
