import crypto from 'crypto';
import { pool } from '../db/connection.js';
import type { Platform } from './platformOAuth.js';

const ALLOWED_RETURN_PATHS = ['/dashboard', '/settings', '/accounts', '/onboarding/connect'];

export function sanitizeOAuthReturnTo(returnTo?: string): string {
  if (!returnTo) return '/dashboard';
  const path = returnTo.split('?')[0];
  return ALLOWED_RETURN_PATHS.includes(path) ? path : '/dashboard';
}

export interface ConsumedOAuthState {
  userId: number;
  platform: Platform;
  codeVerifier?: string;
  returnTo: string;
}

export class OAuthStateService {
  static async purgeExpired(): Promise<void> {
    await pool.query('DELETE FROM oauth_states WHERE expires_at <= NOW()');
  }

  static async create(
    userId: number,
    platform: Platform,
    codeVerifier?: string,
    returnTo?: string
  ): Promise<string> {
    await this.purgeExpired();
    const state = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO oauth_states (state, user_id, platform, code_verifier, return_to, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '10 minutes')`,
      [state, userId, platform, codeVerifier || null, sanitizeOAuthReturnTo(returnTo)]
    );
    return state;
  }

  static async consume(state: string): Promise<ConsumedOAuthState | null> {
    const result = await pool.query(
      `SELECT user_id, platform, code_verifier, return_to
       FROM oauth_states
       WHERE state = $1 AND expires_at > NOW()`,
      [state]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0] as {
      user_id: number;
      platform: Platform;
      code_verifier: string | null;
      return_to: string;
    };

    await pool.query('DELETE FROM oauth_states WHERE state = $1', [state]);

    return {
      userId: row.user_id,
      platform: row.platform,
      codeVerifier: row.code_verifier || undefined,
      returnTo: sanitizeOAuthReturnTo(row.return_to),
    };
  }
}
