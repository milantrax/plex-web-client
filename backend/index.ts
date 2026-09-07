import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { initializeDatabase, runSchema } from './db/database';
import authRoutes from './routes/auth';
import plexRoutes from './routes/plex';
import mediaRoutes from './routes/media';
import customPlaylistsRoutes from './routes/customPlaylists';
import favoritesRoutes from './routes/favorites';
import librarySyncRoutes from './routes/librarySync';
import configRoutes from './routes/config';
import { startSyncScheduler } from './services/librarySyncService';
import { connectRedis, redis } from './services/redisClient';
import { ResilientSessionStore } from './services/sessionStore';
import errorHandler from './middleware/errorHandler';

const PgSession = connectPgSimple(session);

const app = express();
const PORT = process.env.PORT || 3001;

// Behind a reverse proxy (nginx in the Docker stack) so secure cookies and
// req.ip resolve against the forwarded headers.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY));
}

// Initialize database
const pool = initializeDatabase();

// Redis is optional, so this does not block startup.
connectRedis();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json());

// Session configuration. Redis serves the sessions; Postgres mirrors them so a
// Redis outage cannot log everyone out. See services/sessionStore.ts.
app.use(session({
  store: new ResilientSessionStore(
    new RedisStore({ client: redis, prefix: 'plex:sess:' }),
    new PgSession({ pool, tableName: 'session', createTableIfMissing: true })
  ),
  secret: process.env.SESSION_SECRET as string,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// Health check (used by the container healthcheck / compose depends_on)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// API Routes
// Unauthenticated: the client reads this before the login screen renders.
app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/plex', plexRoutes);
app.use('/api/plex/library', librarySyncRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/custom-playlists', customPlaylistsRoutes);
app.use('/api/favorites', favoritesRoutes);

// Serve React build in production, when one is present next to the server.
// In the Docker stack nginx serves the frontend, so there is no build here and
// unmatched routes must fall through to the 404/error handler instead of
// failing on a missing index.html.
//
// __dirname is backend/ when this file is run from source and backend/dist
// once compiled, so both candidates are tried.
const buildDir = [
  path.join(__dirname, '..', 'frontend', 'build'),
  path.join(__dirname, '..', '..', 'frontend', 'build'),
].find(dir => fs.existsSync(dir));

if (process.env.NODE_ENV === 'production' && buildDir) {
  app.use(express.static(buildDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

// Start the server once the schema is ready. Redis is not waited on: the API
// is fully functional without it, just without the cache in front of Plex.
runSchema().then(() => {
  startSyncScheduler();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database schema:', err);
  process.exit(1);
});
