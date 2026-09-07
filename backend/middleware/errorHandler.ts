import type { NextFunction, Request, Response } from 'express';

/** The extra fields an error may carry by the time it reaches this handler. */
interface HandledError extends Error {
  status?: number;
  code?: string;
  isAxiosError?: boolean;
  response?: { status?: number };
}

function errorHandler(err: HandledError, req: Request, res: Response, _next: NextFunction): void {
  console.error('Server error:', err.message);

  // A failed request to Plex is an upstream failure, not a client auth failure.
  // Passing Plex's 401 through unchanged makes the browser treat a bad Plex
  // token as an expired session, and the axios interceptor then bounces to
  // /login on every page load. requireAuth answers real session failures
  // directly, so nothing that reaches here is a genuine 401.
  const isUpstream = err.isAxiosError === true || !!err.response;

  if (isUpstream) {
    const upstream = err.response?.status;
    res.status(502).json({
      error: `Plex request failed${upstream ? ` (HTTP ${upstream})` : `: ${err.code || err.message}`}`
    });
    return;
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
}

export default errorHandler;
