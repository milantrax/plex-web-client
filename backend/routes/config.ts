import { Router } from 'express';

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

export default router;
