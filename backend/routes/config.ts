import { Router } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();

/** A theme the client can apply directly, or 'system' to follow the device. */
export type DefaultTheme = 'light' | 'dark' | 'system';

const VALID_THEMES: DefaultTheme[] = ['light', 'dark', 'system'];

/**
 * Reads the deployment's preferred starting theme from the environment.
 *
 * Unset — or set to something unrecognised — means 'system', so a typo leaves
 * the client following the device rather than silently pinned to one theme.
 */
function resolveDefaultTheme(): DefaultTheme {
  const configured = process.env.DEFAULT_THEME?.trim().toLowerCase();

  if (!configured) return 'system';

  if (!VALID_THEMES.includes(configured as DefaultTheme)) {
    console.warn(
      `[Config] Ignoring DEFAULT_THEME='${process.env.DEFAULT_THEME}' — expected one of ${VALID_THEMES.join(', ')}`
    );
    return 'system';
  }

  return configured as DefaultTheme;
}

// GET /api/config — settings the client needs before anyone has signed in, so
// this sits outside requireAuth. It exposes nothing account-specific.
router.get('/', (req, res) => {
  res.json({ defaultTheme: resolveDefaultTheme() });
});

// GET /api/config/plex — the fallback Plex server used by accounts that have
// not set one of their own, so the settings form can show it as a placeholder.
//
// Behind requireAuth: the URL points at the operator's own network, which is
// not something to hand out to anonymous callers. The token is never sent
// either way — only whether one is configured.
router.get('/plex', requireAuth, (req, res) => {
  res.json({
    defaultPlexUrl: process.env.DEFAULT_PLEX_URL || null,
    hasDefaultToken: !!process.env.DEFAULT_PLEX_TOKEN
  });
});

export default router;
