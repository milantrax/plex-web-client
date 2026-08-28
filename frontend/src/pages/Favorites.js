import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Box, List, ListItem, ListItemButton, ListItemText, Typography
} from '@mui/material';
import AlbumCard from '../components/AlbumCard';
import TrackList from '../components/TrackList';
import { SIDEBAR_WIDTH, PLAYER_HEIGHT, NAVBAR_HEIGHT } from '../theme/theme';
import { useFavorites } from '../contexts/FavoritesContext';
import { usePlayback } from '../contexts/PlaybackContext';

const sidebarItems = [
  { label: 'Albums', path: '/favorites/albums' },
  { label: 'Artists', path: '/favorites/artists' },
  { label: 'Playlists', path: '/favorites/playlists' },
  { label: 'Tracks', path: '/favorites/tracks' },
];

function FavoritesSidebar() {
  return (
    <List
      sx={{
        height: '100%',
        overflowY: 'auto',
        px: 0,
        pt: `${NAVBAR_HEIGHT + 20}px`,
        pb: `${PLAYER_HEIGHT + 20}px`,
      }}
      className="custom-scrollbar"
    >

      {sidebarItems.map(item => (
        <ListItem key={item.path} disablePadding>
          <NavLink to={item.path} style={{ textDecoration: 'none', width: '100%' }}>
            {({ isActive }) => (
              <ListItemButton
                selected={isActive}
                sx={{
                  py: 1.5,
                  px: 2.5,
                  borderLeft: isActive ? 3 : 0,
                  borderLeftColor: 'primary.main',
                }}
              >
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
  );
}

function Favorites() {
  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar – desktop only */}
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          height: '100%',
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: { xs: 'none', md: 'block' },
          flexShrink: 0,
        }}
      >
        <FavoritesSidebar />
      </Box>

      {/* Main area */}
      <Box
        sx={{
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          px: 2.5,
          pt: `${NAVBAR_HEIGHT + 20}px`,
          pb: `${PLAYER_HEIGHT + 20}px`,
        }}
        className="custom-scrollbar"
      >
        <Outlet />
      </Box>
    </Box>
  );
}

function EmptyState({ message }) {
  return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography variant="h6" color="text.secondary">{message}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Click the heart icon on any item to add it to your favorites.
      </Typography>
    </Box>
  );
}

export function FavoriteAlbums() {
  const { favorites } = useFavorites();
  const { currentTrack, isPlaying, onPlayTrack, onTogglePlayback } = usePlayback();

  const albums = favorites
    .filter(f => f.type === 'album')
    .map(f => ({
      ratingKey: f.rating_key,
      title: f.title,
      parentTitle: f.subtitle,
      thumb: f.thumb,
      year: f.year,
    }));

  if (albums.length === 0) {
    return <EmptyState message="No favorite albums yet" />;
  }

  return (
    <>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Favorite Albums</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        {albums.map(album => (
          <AlbumCard
            key={album.ratingKey}
            album={album}
            onPlayTrack={onPlayTrack}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlayback={onTogglePlayback}
          />
        ))}
      </Box>
    </>
  );
}

export function FavoriteArtists() {
  const { favorites } = useFavorites();
  const { currentTrack, isPlaying, onPlayTrack, onTogglePlayback } = usePlayback();

  const artists = favorites
    .filter(f => f.type === 'artist')
    .map(f => ({
      ratingKey: f.rating_key,
      title: f.title,
      thumb: f.thumb,
    }));

  if (artists.length === 0) {
    return <EmptyState message="No favorite artists yet" />;
  }

  return (
    <>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Favorite Artists</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        {artists.map(artist => (
          <AlbumCard
            key={artist.ratingKey}
            album={artist}
            isArtist
            onPlayTrack={onPlayTrack}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlayback={onTogglePlayback}
          />
        ))}
      </Box>
    </>
  );
}

export function FavoritePlaylists() {
  const { favorites } = useFavorites();
  const navigate = useNavigate();

  const playlists = favorites.filter(f => f.type === 'playlist');

  const getPlaylistRoute = (pl) =>
    pl.subtitle === 'custom'
      ? `/playlist/custom/${pl.rating_key}`
      : `/playlist/plex/${pl.rating_key}`;

  if (playlists.length === 0) {
    return <EmptyState message="No favorite playlists yet" />;
  }

  return (
    <>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Favorite Playlists</Typography>
      <List disablePadding>
        {playlists.map(pl => (
          <ListItem key={pl.rating_key} disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              onClick={() => navigate(getPlaylistRoute(pl))}
              sx={{ borderRadius: 1, border: 1, borderColor: 'divider' }}
            >
              <ListItemText
                primary={pl.title}
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );
}

export function FavoriteTracks() {
  const { favorites } = useFavorites();
  const { onPlayTrack, currentTrack, isPlaying, onTogglePlayback } = usePlayback();

  const tracks = favorites
    .filter(f => f.type === 'track')
    .map(f => ({
      ratingKey: f.rating_key,
      title: f.title,
      grandparentTitle: f.subtitle,
      thumb: f.thumb,
      parentThumb: f.thumb,
      duration: f.duration,
      parentRatingKey: f.parent_rating_key || null,
      Media: f.part_key ? [{ Part: [{ key: f.part_key }] }] : [],
    }));

  if (tracks.length === 0) {
    return <EmptyState message="No favorite tracks yet" />;
  }

  return (
    <>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Favorite Tracks</Typography>
      <TrackList
        tracks={tracks}
        onPlayTrack={onPlayTrack}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlayback={onTogglePlayback}
      />
    </>
  );
}

export default Favorites;
