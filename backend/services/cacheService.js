const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 10800, checkperiod: 600 });

const TTL = {
  sections: 3600,
  sectionItems: 10800,
  albumTracks: 14400,
  playlists: 1800,
  playlistItems: 1800,
  genres: 14400,
  albumsByGenre: 7200,
  years: 14400,
  albumsByYear: 7200,
  labels: 14400,
  albumsByLabel: 7200,
  search: 1800,
  artists: 7200,
  artistAlbums: 7200,
  metadata: 10800
};

function getCacheKey(userId, type, params = {}) {
  return `user_${userId}:${type}:${JSON.stringify(params)}`;
}

function get(userId, type, params) {
  return cache.get(getCacheKey(userId, type, params));
}

function set(userId, type, params, data, ttlOverride) {
  const ttl = ttlOverride || TTL[type] || 10800;
  return cache.set(getCacheKey(userId, type, params), data, ttl);
}

function clearUserCache(userId) {
  const keys = cache.keys().filter(k => k.startsWith(`user_${userId}:`));
  if (keys.length > 0) cache.del(keys);
}

function getStats() {
  return cache.getStats();
}

module.exports = { get, set, clearUserCache, getStats, TTL };
