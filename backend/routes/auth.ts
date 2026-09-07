import { Router } from 'express';
import { hashPassword, comparePassword } from '../utils/crypto';
import { getUserById, getUserByUsername, createUser, updatePlexCredentials } from '../services/userService';
import { requireAuth, sessionUserId } from '../middleware/auth';
import { clearUserCache } from '../services/cacheService';
import type { PublicUser } from '../services/userService';

const router = Router();

/** The user representation sent to the client; the Plex token is masked. */
function toProfile(user: PublicUser) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    plexUrl: user.plex_url,
    plexToken: user.plex_token ? '••••••••' : null,
    hasCustomPlex: !!(user.plex_url || user.plex_token)
  };
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await hashPassword(password);
    const userId = await createUser(username, email, passwordHash);

    req.session.userId = userId;

    const user = await getUserById(userId);
    res.status(201).json(toProfile(user!));
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.userId = user.id;

    res.json(toProfile(user));
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// GET /api/auth/profile
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(sessionUserId(req));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(toProfile(user));
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const { plexUrl, plexToken } = req.body;

    const userId = sessionUserId(req);

    await updatePlexCredentials(userId, plexUrl, plexToken);
    await clearUserCache(userId);

    const user = await getUserById(userId);
    res.json(toProfile(user!));
  } catch (error) {
    next(error);
  }
});

export default router;
