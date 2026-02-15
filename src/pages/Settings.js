import React, { useState } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, Typography, Chip } from '@mui/material';
import CacheManager from '../components/CacheManager';
import AlbumCardSettings from '../components/AlbumCardSettings';
import { SIDEBAR_WIDTH } from '../theme/theme';

const Settings = () => {
  const [activeSection, setActiveSection] = useState('display');

  const settingSections = [
    { id: 'display', title: 'Display Settings' },
    { id: 'cache', title: 'Cache Management' }
  ];

  const renderSettingsContent = () => {
    switch (activeSection) {
      case 'display':
        return (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2.5 }}>
              Display Settings
            </Typography>
            <AlbumCardSettings />
          </Box>
        );
      case 'cache':
        return (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2.5 }}>
              Cache Management
            </Typography>
            <CacheManager />
          </Box>
        );
      default:
        return (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2.5 }}>
              Display Settings
            </Typography>
            <AlbumCardSettings />
          </Box>
        );
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Sidebar */}
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          height: '100%',
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: { xs: 'none', md: 'block' }
        }}
      >
        <List sx={{ height: '100%', overflowY: 'auto', p: 0 }} className="custom-scrollbar">
          {settingSections.map(section => (
            <ListItem key={section.id} disablePadding>
              <ListItemButton
                selected={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
              >
                <ListItemText primary={section.title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Mobile Settings Selector */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, width: '100%', p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Settings:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {settingSections.map(section => (
            <Chip
              key={section.id}
              label={section.title}
              onClick={() => setActiveSection(section.id)}
              color={activeSection === section.id ? 'primary' : 'default'}
              variant={activeSection === section.id ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          p: 2.5
        }}
        className="custom-scrollbar"
      >
        {renderSettingsContent()}
      </Box>
    </Box>
  );
};

export default Settings;
