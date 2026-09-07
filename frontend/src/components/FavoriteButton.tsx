import React from 'react';
import { IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useFavorites } from '../contexts/FavoritesContext';
import type { SxProps, Theme } from '@mui/material/styles';
import type { FavoriteInput, FavoriteType } from '../types';

export interface FavoriteButtonProps {
  type: FavoriteType | string;
  item?: FavoriteInput | null;
  size?: 'small' | 'medium' | 'large';
  sx?: SxProps<Theme>;
}

function FavoriteButton({ type, item, size = 'medium', sx = {} }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(type, item?.ratingKey ?? '');

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (item) toggleFavorite(type, item);
  };

  return (
    <IconButton
      size={size}
      onClick={handleClick}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      sx={{ color: favorited ? 'error.main' : 'inherit', ...(sx as object) }}
    >
      {favorited ? (
        <FavoriteIcon fontSize={size === 'small' ? 'small' : 'medium'} />
      ) : (
        <FavoriteBorderIcon fontSize={size === 'small' ? 'small' : 'medium'} />
      )}
    </IconButton>
  );
}

export default FavoriteButton;
