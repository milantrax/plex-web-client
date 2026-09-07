import axios from 'axios';

const api = axios.create({ withCredentials: true });

/** A theme the server prefers, or 'system' to follow the device. */
export type DefaultTheme = 'light' | 'dark' | 'system';

export interface AppConfig {
  defaultTheme: DefaultTheme;
}

/**
 * Deployment settings needed before sign-in.
 *
 * Falls back to 'system' rather than throwing: the theme must resolve to
 * something even when the API is unreachable.
 */
export const getAppConfig = async (): Promise<AppConfig> => {
  try {
    const res = await api.get<AppConfig>('/api/config');
    return res.data;
  } catch (error) {
    console.error('Error fetching app config:', error);
    return { defaultTheme: 'system' };
  }
};

/** The fallback Plex server, for showing as a placeholder in the settings form. */
export interface PlexDefaults {
  defaultPlexUrl: string | null;
  /** Whether a fallback token is configured. The token itself is never sent. */
  hasDefaultToken: boolean;
}

export const getPlexDefaults = async (): Promise<PlexDefaults> => {
  try {
    const res = await api.get<PlexDefaults>('/api/config/plex');
    return res.data;
  } catch (error) {
    console.error('Error fetching Plex defaults:', error);
    return { defaultPlexUrl: null, hasDefaultToken: false };
  }
};
