import type { NextFunction, Request, Response } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session || !req.session.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

/**
 * The authenticated user's id.
 *
 * express-session types every SessionData field as optional, but every route
 * that calls this sits behind requireAuth, which rejects the request before
 * the handler runs unless the id is set.
 */
export function sessionUserId(req: Request): number {
  return req.session.userId as number;
}
