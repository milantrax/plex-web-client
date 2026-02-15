// src/components/NavBar.js
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  useTheme,
  Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SearchBar from './SearchBar';
import { useThemeMode } from '../theme/ThemeContext';

function NavBar({ onPlayTrack }) {
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const navItems = [
    { label: 'Playback', path: '/queue' },
    { label: 'Library', path: '/', end: true },
    { label: 'Playlists', path: '/playlists' },
    { label: 'Genres', path: '/genres' },
    { label: 'Settings', path: '/settings' },
  ];

  const NavButton = ({ item }) => (
    <NavLink to={item.path} end={item.end} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <Button
          variant="text"
          sx={{
            color: 'text.primary',
            borderBottom: isActive ? 2 : 0,
            borderColor: 'primary.main',
            borderRadius: 0,
            pb: 0.5,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          {item.label}
        </Button>
      )}
    </NavLink>
  );

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        borderBottom: 2,
        borderColor: 'primary.main',
        zIndex: 1000,
      }}
    >
      <Toolbar sx={{ gap: 2, justifyContent: 'space-between' }}>
        {/* Left Section: Logo + Navigation (Desktop) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Mobile Hamburger Menu */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="menu"
              onClick={toggleMobileMenu}
              edge="start"
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Plex Logo */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              letterSpacing: 1,
              flexShrink: 0,
            }}
          >
            Plex
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
              {navItems.map((item) => (
                <NavButton key={item.path} item={item} />
              ))}
            </Box>
          )}
        </Box>

        {/* Right Section: Search Bar + Theme Toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'flex-end' }}>
          {/* Search Bar */}
          <Box sx={{ maxWidth: 400, width: '100%', display: { xs: 'none', sm: 'block' } }}>
            <SearchBar onPlayTrack={onPlayTrack} />
          </Box>

          {/* Theme Toggle */}
          <IconButton
            onClick={toggleTheme}
            color="inherit"
            aria-label="Toggle theme"
            edge="end"
          >
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Box>
      </Toolbar>

      {/* Mobile Search Bar (Below Toolbar) */}
      {isMobile && (
        <Box sx={{ px: 2, pb: 2 }}>
          <SearchBar onPlayTrack={onPlayTrack} />
        </Box>
      )}

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        sx={{
          '& .MuiDrawer-paper': {
            width: 250,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>
            Menu
          </Typography>
          <IconButton onClick={closeMobileMenu}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <NavLink
                to={item.path}
                end={item.end}
                style={{ textDecoration: 'none', width: '100%' }}
                onClick={closeMobileMenu}
              >
                {({ isActive }) => (
                  <ListItemButton selected={isActive}>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        color: isActive ? 'primary.main' : 'text.primary',
                        fontWeight: isActive ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                )}
              </NavLink>
            </ListItem>
          ))}
        </List>
      </Drawer>
    </AppBar>
  );
}

export default NavBar;
