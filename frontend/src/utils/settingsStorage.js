// src/utils/settingsStorage.js
const SETTINGS_KEYS = {
  ALBUM_CARD_WIDTH: 'albumCardWidth'
};

const DEFAULT_VALUES = {
  ALBUM_CARD_WIDTH: 180
};

export const getAlbumCardWidth = () => {
  const stored = localStorage.getItem(SETTINGS_KEYS.ALBUM_CARD_WIDTH);
  return stored ? parseInt(stored, 10) : DEFAULT_VALUES.ALBUM_CARD_WIDTH;
};

export const setAlbumCardWidth = (width) => {
  localStorage.setItem(SETTINGS_KEYS.ALBUM_CARD_WIDTH, width.toString());
};

export const resetAlbumCardWidth = () => {
  localStorage.removeItem(SETTINGS_KEYS.ALBUM_CARD_WIDTH);
};
