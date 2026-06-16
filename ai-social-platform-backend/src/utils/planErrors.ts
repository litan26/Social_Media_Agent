import { Response } from 'express';
import { isPlanLimitError } from '../errors/planLimit.error.js';

export function respondIfPlanLimit(res: Response, err: unknown): boolean {
  if (isPlanLimitError(err)) {
    res.status(402).json({
      error: err.message,
      code: err.code,
      upgrade: true,
    });
    return true;
  }
  return false;
}
