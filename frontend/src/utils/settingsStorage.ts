// src/utils/settingsStorage.ts
const SETTINGS_KEYS = {
  ALBUM_CARD_WIDTH: 'albumCardWidth'
} as const;

const DEFAULT_VALUES = {
  ALBUM_CARD_WIDTH: 180
} as const;

export const getAlbumCardWidth = (): number => {
  const stored = localStorage.getItem(SETTINGS_KEYS.ALBUM_CARD_WIDTH);
  return stored ? parseInt(stored, 10) : DEFAULT_VALUES.ALBUM_CARD_WIDTH;
};

export const setAlbumCardWidth = (width: number): void => {
  localStorage.setItem(SETTINGS_KEYS.ALBUM_CARD_WIDTH, width.toString());
};

export const resetAlbumCardWidth = (): void => {
  localStorage.removeItem(SETTINGS_KEYS.ALBUM_CARD_WIDTH);
};
