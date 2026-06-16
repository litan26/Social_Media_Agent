import crypto from 'crypto';
import { pool, setCurrentUser } from '../db/connection.js';
import { encrypt } from '../utils/encryption.js';
import { PlanService } from './plan.service.js';
import {
  buildPlatformAuthUrl,
  exchangePlatformCode,
  type Platform,
} from './platformOAuth.js';
import type { OAuthTokens } from './platformOAuth.js';
import { OAuthStateService, sanitizeOAuthReturnTo } from './oauthState.service.js';

export { sanitizeOAuthReturnTo };

export type { Platform };

export const ALL_PLATFORMS: Platform[] = [
  'twitter',
  'instagram',
  'linkedin',
  'facebook',
  'tiktok',
  'pinterest',
  'youtube',
];

const PLATFORM_ENV: Record<Platform, string[]> = {
  twitter: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'],
  instagram: ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'],
  linkedin: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
  facebook: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
  tiktok: ['TIKTOK_CLIENT_ID', 'TIKTOK_CLIENT_SECRET'],
  pinterest: ['PINTEREST_APP_ID', 'PINTEREST_APP_SECRET'],
  youtube: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
};

const PKCE_PLATFORMS: Platform[] = ['twitter'];

export type OAuthMode = 'live' | 'unconfigured';

export class OAuthService {
  static generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  static generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  static isPlatformConfigured(platform: Platform): boolean {
    return PLATFORM_ENV[platform].every((key) => !!process.env[key]);
  }

  static getPlatformStatus(platform: Platform): { configured: boolean; mode: OAuthMode } {
    const configured = this.isPlatformConfigured(platform);
    return configured ? { configured: true, mode: 'live' } : { configured: false, mode: 'unconfigured' };
  }

  static getMissingEnvKeys(platform: Platform): string[] {
    return PLATFORM_ENV[platform].filter((key) => !process.env[key]);
  }

  static isValidPlatform(platform: string): platform is Platform {
    return ALL_PLATFORMS.includes(platform as Platform);
  }

  static async checkAccountLimit(userId: number, jwtPlan?: string | null): Promise<void> {
    await PlanService.assertAccountConnectAllowed(userId, jwtPlan);
  }

  /** Guide: POST /api/oauth/start — build redirect URL + store state in DB */
  static async startOAuth(
    userId: number,
    platform: Platform,
    returnTo?: string
  ): Promise<{ redirectUrl: string; platform: Platform; mode: 'live' }> {
    const status = this.getPlatformStatus(platform);
    if (status.mode !== 'live') {
      const missing = this.getMissingEnvKeys(platform);
      throw new Error(
        `Live OAuth is not configured for ${platform}. Add ${missing.join(' and ')} to .env`
      );
    }

    const usePkce = PKCE_PLATFORMS.includes(platform);
    const codeVerifier = usePkce ? this.generateCodeVerifier() : undefined;
    const codeChallenge = codeVerifier ? this.generateCodeChallenge(codeVerifier) : undefined;
    const state = await OAuthStateService.create(userId, platform, codeVerifier, returnTo);

    return {
      redirectUrl: buildPlatformAuthUrl(platform, state, codeVerifier, codeChallenge),
      platform,
      mode: 'live',
    };
  }

  /** Legacy alias — returns authUrl for older clients */
  static async getPlatformAuth(
    userId: number,
    platform: Platform,
    returnTo?: string
  ): Promise<{ authUrl: string; state: string; configured: boolean; mode: OAuthMode }> {
    try {
      const { redirectUrl } = await this.startOAuth(userId, platform, returnTo);
      return { authUrl: redirectUrl, state: '', configured: true, mode: 'live' };
    } catch {
      return { authUrl: '', state: '', configured: false, mode: 'unconfigured' };
    }
  }

  /** Guide: GET /oauth/callback/:platform — consume state, exchange code, save tokens */
  static async handleOAuthCallback(
    platform: Platform,
    code: string,
    state: string
  ): Promise<{ returnTo: string }> {
    const record = await OAuthStateService.consume(state);
    if (!record) {
      throw new Error('invalid_state');
    }
    if (record.platform !== platform) {
      throw new Error('platform_mismatch');
    }

    await this.checkAccountLimit(record.userId);
    const tokens = await exchangePlatformCode(platform, code, record.codeVerifier);
    await this.saveAccount(record.userId, platform, tokens);

    return { returnTo: record.returnTo };
  }

  static async saveAccount(userId: number, platform: Platform, tokens: OAuthTokens): Promise<void> {
    await setCurrentUser(userId);
    await pool.query('DELETE FROM social_accounts WHERE user_id = $1 AND platform = $2', [
      userId,
      platform,
    ]);
    await pool.query(
      `INSERT INTO social_accounts
         (user_id, platform, account_handle, platform_user_id, avatar_url, scopes,
          access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        platform,
        tokens.handle,
        tokens.platformUserId || null,
        tokens.avatarUrl || null,
        tokens.scopes || null,
        encrypt(tokens.accessToken),
        encrypt(tokens.refreshToken || ''),
        tokens.expiresAt,
      ]
    );
  }

  /** Guide: DELETE /api/oauth/disconnect — by platform, scoped to JWT user */
  static async disconnectByPlatform(userId: number, platform: Platform): Promise<void> {
    await setCurrentUser(userId);
    await pool.query('DELETE FROM social_accounts WHERE user_id = $1 AND platform = $2', [
      userId,
      platform,
    ]);
  }

  static async disconnectAccount(userId: number, accountId: number): Promise<void> {
    await setCurrentUser(userId);
    await pool.query('DELETE FROM social_accounts WHERE id = $1 AND user_id = $2', [
      accountId,
      userId,
    ]);
  }

  /** Guide: GET /api/accounts — metadata only, never tokens */
  static async listAccounts(userId: number) {
    await setCurrentUser(userId);
    const result = await pool.query(
      `SELECT id, platform,
              account_handle AS username,
              account_handle,
              platform_user_id, avatar_url, scopes,
              followers_count,
              created_at AS connected_at,
              expires_at,
              CASE
                WHEN expires_at IS NULL THEN 'active'
                WHEN expires_at > DATE_ADD(NOW(), INTERVAL 48 HOUR) THEN 'active'
                WHEN expires_at > NOW() THEN 'expiring'
                ELSE 'expired'
              END AS token_status
       FROM social_accounts
       WHERE user_id = $1
       ORDER BY platform ASC`,
      [userId]
    );
    return result.rows;
  }
}
