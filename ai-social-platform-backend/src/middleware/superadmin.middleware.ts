import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';

export const superadminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.role !== 'superadmin') {
    res.status(403).json({ error: 'Superadmin access required' });
    return;
  }
  next();
};
