import { Request, Response, NextFunction } from 'express';
import { Sentry } from '../instrument.js';
import { isPlanLimitError } from '../errors/planLimit.error.js';
import { RateLimitExceededError } from '../services/rateLimit.service.js';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  console.error(err);

  if (err instanceof RateLimitExceededError) {
    res.status(429).json({ error: err.message, retryAfter: err.reset });
    return;
  }
  if (isPlanLimitError(err)) {
    res.status(402).json({ error: err.message, code: err.code, upgrade: true });
    return;
  }

  res.status(500).json({ error: err.message || 'Internal server error' });
}
