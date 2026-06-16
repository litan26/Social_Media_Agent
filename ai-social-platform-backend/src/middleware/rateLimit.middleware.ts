import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import {
  RateLimitConfig,
  RateLimitExceededError,
  RateLimitService,
} from '../services/rateLimit.service.js';

export function userRateLimit(config: RateLimitConfig) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      await RateLimitService.checkUserLimit(req.userId, config);
      next();
    } catch (err) {
      if (err instanceof RateLimitExceededError) {
        res.setHeader('Retry-After', String(Math.ceil((err.reset - Date.now()) / 1000)));
        res.status(429).json({
          error: err.message,
          retryAfter: err.reset,
        });
        return;
      }
      next(err);
    }
  };
}
