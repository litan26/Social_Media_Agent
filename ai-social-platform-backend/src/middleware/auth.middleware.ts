import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { setCurrentUser } from '../db/connection.js';
import { stripUntrustedUserId } from '../db/tenant.js';

export interface AuthRequest extends Request {
  userId?: number;
  email?: string;
  plan?: string;
  role?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = AuthService.verifyToken(token);

    // Identity from JWT only — never trust userId from the request body
    stripUntrustedUserId(req.body);

    await setCurrentUser(payload.userId);

    req.userId = payload.userId;
    req.email = payload.email;
    req.plan = payload.plan;
    req.role = payload.role || 'user';

    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
