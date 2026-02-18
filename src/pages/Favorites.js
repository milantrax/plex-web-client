import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Box, List, ListItem, ListItemButton, ListItemText, Typography, Divider
} from '@mui/material';
import AlbumCard from '../components/AlbumCard';
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
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
          Favorites
        </Typography>
      </Box>
      <Divider sx={{ mb: 1 }} />
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

const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export function FavoriteTracks() {
  const { favorites } = useFavorites();
  const { onPlayTrack } = usePlayback();

  const tracks = favorites.filter(f => f.type === 'track');

  if (tracks.length === 0) {
    return <EmptyState message="No favorite tracks yet" />;
  }

  return (
    <>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Favorite Tracks</Typography>
      <Box sx={{ width: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 200px 80px',
            alignItems: 'center',
            gap: 2,
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
            Title
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
            Artist
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>
            Duration
          </Typography>
        </Box>
        {tracks.map(track => (
          <Box
            key={track.rating_key}
            onClick={() => {
              if (track.part_key) {
                onPlayTrack({
                  ratingKey: track.rating_key,
                  title: track.title,
                  thumb: track.thumb,
                  grandparentTitle: track.subtitle,
                  duration: track.duration,
                  parentRatingKey: track.parent_rating_key,
                  Media: [{ Part: [{ key: track.part_key }] }],
                });
              }
            }}
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 200px 80px',
              alignItems: 'center',
              gap: 2,
              px: 2,
              py: 1,
              borderRadius: 1,
              cursor: track.part_key ? 'pointer' : 'default',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Typography variant="body2" noWrap>{track.title}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>{track.subtitle}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {track.duration ? formatDuration(track.duration) : '—'}
            </Typography>
          </Box>
        ))}
      </Box>
    </>
  );
}

export default Favorites;
