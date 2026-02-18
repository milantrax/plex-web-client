import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box, Typography, IconButton, CircularProgress, Rating
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import DownloadIcon from '@mui/icons-material/Download';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import StarIcon from '@mui/icons-material/Star';
import { reorderCustomPlaylistTracks } from '../api/customPlaylistsApi';
import { downloadTrack } from '../api/plexApi';
import queueManager from '../utils/queueManager';
import AddToPlaylistModal from './AddToPlaylistModal';
import CreatePlaylistModal from './CreatePlaylistModal';

function SortableTrackRow({
  track,
  index,
  isCurrent,
  isPlaying,
  inQueue,
  onTrackClick,
  onRemove,
  onDownload,
  onAddToQueue,
  onOpenAddToPlaylist,
  isDragOverlay
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: track._customTrackId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 1 : 'auto'
  };

  const gridColumns = {
    xs: '36px 40px 1fr 100px 60px 60px 60px 36px',
    md: '36px 50px 1fr 140px 100px 60px 60px 60px 36px'
  };

  return (
    <Box
      ref={setNodeRef}
      style={isDragOverlay ? undefined : style}
      onClick={() => !isDragOverlay && onTrackClick(track)}
      sx={{
        display: 'grid',
        gridTemplateColumns: gridColumns,
        alignItems: 'center',
        gap: { xs: 1, md: 2 },
        px: 2,
        py: 0.5,
        borderRadius: 1,
        cursor: isDragOverlay ? 'grabbing' : 'pointer',
        bgcolor: isDragOverlay
          ? 'action.selected'
          : isCurrent
          ? 'primary.light'
          : 'transparent',
        borderLeft: isCurrent && !isDragOverlay ? 4 : 0,
        borderLeftColor: 'primary.main',
        opacity: isCurrent && !isPlaying ? 0.7 : 1,
        boxShadow: isDragOverlay ? 4 : 0,
        transition: 'all 0.2s',
        '&:hover': {
          bgcolor: isCurrent ? 'primary.light' : 'action.hover',
          '& .drag-handle': { opacity: 1 }
        }
      }}
    >
      {/* Drag handle */}
      <Box
        className="drag-handle"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragOverlay ? 'grabbing' : 'grab',
          opacity: isDragOverlay ? 1 : 0,
          color: 'text.disabled',
          transition: 'opacity 0.15s',
          touchAction: 'none'
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>

      {/* Track number */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant="body2"
          sx={{ fontVariantNumeric: 'tabular-nums', color: isCurrent ? '#000000' : 'text.secondary' }}
        >
          {index + 1}
        </Typography>
      </Box>

      {/* Title + artist */}
      <Box sx={{ overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isCurrent && (
            <Box sx={{ color: '#000000', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {isPlaying
                ? <PauseIcon sx={{ fontSize: '1rem' }} />
                : <PlayArrowIcon sx={{ fontSize: '1rem' }} />}
            </Box>
          )}
          <Typography
            variant="body2"
            noWrap
            sx={{ color: isCurrent ? '#000000' : 'inherit' }}
          >
            {track.title}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" noWrap>
          {track.grandparentTitle}{track.parentTitle ? ` · ${track.parentTitle}` : ''}
        </Typography>
      </Box>

      {/* Rating - desktop only */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
        {(track.userRating || track.rating) ? (
          <Rating
            value={(track.userRating || track.rating) / 2}
            precision={0.5}
            size="small"
            readOnly
            emptyIcon={<StarIcon style={{ opacity: 0.2 }} fontSize="inherit" />}
          />
        ) : (
          <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
            Not rated
          </Typography>
        )}
      </Box>

      {/* Duration */}
      <Typography
        variant="body2"
        sx={{
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          color: isCurrent ? '#000000' : 'text.secondary',
          whiteSpace: 'nowrap'
        }}
      >
        {formatDuration(track.duration || 0)}
      </Typography>

      {/* Download */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <IconButton
          size="small"
          color="inherit"
          title="Download track"
          onClick={(e) => { e.stopPropagation(); onDownload(e, track); }}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Add to queue */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <IconButton
          size="small"
          title={inQueue ? 'Already in queue' : 'Add to queue'}
          color={inQueue ? 'primary' : 'inherit'}
          onClick={(e) => { e.stopPropagation(); onAddToQueue(e, track); }}
        >
          <PlaylistAddIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Add to playlist */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <IconButton
          size="small"
          color="inherit"
          title="Add to playlist"
          onClick={(e) => { e.stopPropagation(); onOpenAddToPlaylist(e, track); }}
        >
          <LibraryAddIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Remove button */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <IconButton
          size="small"
          color="inherit"
          title="Remove from playlist"
          onClick={(e) => { e.stopPropagation(); onRemove(track); }}
          sx={{ opacity: 0, '.MuiBox-root:hover &': { opacity: 1 }, transition: 'opacity 0.15s' }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CustomPlaylistTrackList({
  playlistId,
  tracks,
  onTracksChange,
  onPlayTrack,
  currentTrack,
  isPlaying,
  onTogglePlayback,
  onRemoveTrack,
  onTrackAddedToPlaylist
}) {
  const [activeId, setActiveId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [queuedTracks, setQueuedTracks] = useState(new Set());
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState(null);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const isCurrent = (track) =>
    currentTrack && String(currentTrack.ratingKey) === String(track.ratingKey);

  const isInQueue = (track) => queuedTracks.has(track.ratingKey);

  const handleTrackClick = (track) => {
    if (isCurrent(track)) {
      if (onTogglePlayback) onTogglePlayback();
    } else {
      if (onPlayTrack) onPlayTrack(track);
    }
  };

  const handleDownload = async (e, track) => {
    try {
      await downloadTrack(track, track.parentTitle);
    } catch {
      alert('Download failed. Please try again.');
    }
  };

  const handleAddToQueue = async (e, track) => {
    try {
      const success = await queueManager.addToQueue(track);
      if (success) {
        setQueuedTracks(prev => new Set([...prev, track.ratingKey]));
      } else {
        alert('This track is already in your queue.');
      }
    } catch {
      alert('Failed to add track to queue. Please try again.');
    }
  };

  const handleOpenAddToPlaylist = (e, track) => {
    setAddToPlaylistTrack(track);
  };

  const handleCloseAddToPlaylist = () => {
    setAddToPlaylistTrack(null);
  };

  const handleOpenCreateFromModal = () => {
    setAddToPlaylistTrack(null);
    setCreatePlaylistOpen(true);
  };

  const handlePlaylistCreated = () => {
    setCreatePlaylistOpen(false);
  };

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = tracks.findIndex(t => t._customTrackId === active.id);
    const newIndex = tracks.findIndex(t => t._customTrackId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(tracks, oldIndex, newIndex);

    // Optimistic update
    onTracksChange(reordered);

    // Persist new positions
    setSaving(true);
    try {
      const order = reordered.map((t, i) => ({ id: t._customTrackId, position: i }));
      await reorderCustomPlaylistTracks(playlistId, order);
    } catch {
      // Revert on failure
      onTracksChange(tracks);
    } finally {
      setSaving(false);
    }
  };

  if (!tracks || tracks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No tracks yet. Add tracks by clicking the playlist icon on any track.
        </Typography>
      </Box>
    );
  }

  const activeTrack = activeId ? tracks.find(t => t._customTrackId === activeId) : null;
  const activeIndex = activeId ? tracks.findIndex(t => t._customTrackId === activeId) : -1;

  const gridColumns = {
    xs: '36px 40px 1fr 100px 60px 60px 60px 36px',
    md: '36px 50px 1fr 140px 100px 60px 60px 60px 36px'
  };

  return (
    <>
      <Box sx={{ position: 'relative' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: gridColumns,
            gap: { xs: 1, md: 2 },
            px: 2,
            py: 1,
            pb: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            alignItems: 'center'
          }}
        >
          <Box />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>#</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Title</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' }, fontWeight: 600, textTransform: 'uppercase' }}>Rating</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', fontWeight: 600, textTransform: 'uppercase' }}>Duration</Typography>
          <Box />
          <Box />
          <Box />
          <Box />
        </Box>

        {saving && (
          <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CircularProgress size={12} />
            <Typography variant="caption" color="text.secondary">Saving…</Typography>
          </Box>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tracks.map(t => t._customTrackId)}
            strategy={verticalListSortingStrategy}
          >
            {tracks.map((track, index) => (
              <SortableTrackRow
                key={track._customTrackId}
                track={track}
                index={index}
                isCurrent={isCurrent(track)}
                isPlaying={isPlaying}
                inQueue={isInQueue(track)}
                onTrackClick={handleTrackClick}
                onRemove={onRemoveTrack}
                onDownload={handleDownload}
                onAddToQueue={handleAddToQueue}
                onOpenAddToPlaylist={handleOpenAddToPlaylist}
              />
            ))}
          </SortableContext>

          {/* Overlay while dragging */}
          <DragOverlay>
            {activeTrack && (
              <SortableTrackRow
                track={activeTrack}
                index={activeIndex}
                isCurrent={isCurrent(activeTrack)}
                isPlaying={isPlaying}
                inQueue={isInQueue(activeTrack)}
                onTrackClick={() => {}}
                onRemove={() => {}}
                onDownload={() => {}}
                onAddToQueue={() => {}}
                onOpenAddToPlaylist={() => {}}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      </Box>

      <AddToPlaylistModal
        open={!!addToPlaylistTrack}
        track={addToPlaylistTrack}
        onClose={handleCloseAddToPlaylist}
        onOpenCreate={handleOpenCreateFromModal}
        onTrackAdded={onTrackAddedToPlaylist}
      />

      <CreatePlaylistModal
        open={createPlaylistOpen}
        onClose={() => setCreatePlaylistOpen(false)}
        onCreated={handlePlaylistCreated}
      />
    </>
  );
}

const formatDuration = (ms) => {
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(0);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};
