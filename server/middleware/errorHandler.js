function errorHandler(err, req, res, _next) {
  console.error('Server error:', err.message);

  // A failed request to Plex is an upstream failure, not a client auth failure.
  // Passing Plex's 401 through unchanged makes the browser treat a bad Plex
  // token as an expired session, and the axios interceptor then bounces to
  // /login on every page load. requireAuth answers real session failures
  // directly, so nothing that reaches here is a genuine 401.
  const isUpstream = err.isAxiosError === true || !!err.response;

  if (isUpstream) {
    const upstream = err.response?.status;
    return res.status(502).json({
      error: `Plex request failed${upstream ? ` (HTTP ${upstream})` : `: ${err.code || err.message}`}`
    });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
}

module.exports = errorHandler;
