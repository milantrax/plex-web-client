require('dotenv').config();
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { initializeDatabase, runSchema, getPool } = require('./db/database');
const authRoutes = require('./routes/auth');
const plexRoutes = require('./routes/plex');
const mediaRoutes = require('./routes/media');
const customPlaylistsRoutes = require('./routes/customPlaylists');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
const pool = initializeDatabase();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json());

// Session configuration
app.use(session({
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/plex', plexRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/custom-playlists', customPlaylistsRoutes);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

// Start server after schema is ready
runSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database schema:', err);
  process.exit(1);
});
