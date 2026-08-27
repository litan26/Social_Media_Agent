import axios from 'axios';
import { pool, setCurrentUser } from '../db/connection.js';
import { decrypt } from '../utils/encryption.js';
import { AnalyticsService } from './analytics.service.js';

const GRAPH = 'https://graph.facebook.com/v21.0';
// Instagram Login tokens are only valid against graph.instagram.com — the same
// token returns "Cannot parse access token" on graph.facebook.com.
const IG_GRAPH = 'https://graph.instagram.com';

function normalizeMediaUrls(raw: unknown): string[] {
  const value = typeof raw === 'string' ? safeParse(raw) : raw;
  if (!Array.isArray(value)) return [];
  return value.filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u));
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Surface Graph API errors, which carry the useful message in the body. */
function graphError(platform: string, err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.error;
    if (detail?.message) {
      return new Error(`${platform}: ${detail.message}`);
    }
  }
  return err instanceof Error ? err : new Error(`${platform} publish failed`);
}

/** Facebook Page post — text, or a photo when media is attached. */
async function publishToFacebook(
  pageId: string,
  pageAccessToken: string,
  content: string,
  mediaUrls: string[]
): Promise<string> {
  if (!pageId) {
    throw new Error('facebook: missing Page id — reconnect the account');
  }

  try {
    if (mediaUrls.length > 0) {
      const res = await axios.post(`${GRAPH}/${pageId}/photos`, null, {
        params: { url: mediaUrls[0], caption: content, access_token: pageAccessToken },
      });
      return String(res.data.post_id || res.data.id);
    }

    const res = await axios.post(`${GRAPH}/${pageId}/feed`, null, {
      params: { message: content, access_token: pageAccessToken },
    });
    return String(res.data.id);
  } catch (err) {
    throw graphError('facebook', err);
  }
}

/**
 * Instagram publishing is a two-step container flow: create the media
 * container, wait for Instagram to fetch the image, then publish it.
 * Image URLs must be publicly reachable — Instagram fetches them server-side.
 */
async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  content: string,
  mediaUrls: string[]
): Promise<string> {
  if (!igUserId) {
    throw new Error('instagram: missing account id — reconnect the account');
  }
  if (mediaUrls.length === 0) {
    throw new Error('instagram: an image is required — text-only posts are not supported');
  }

  try {
    const container = await axios.post(`${IG_GRAPH}/${igUserId}/media`, null, {
      params: { image_url: mediaUrls[0], caption: content, access_token: accessToken },
    });
    const creationId = String(container.data.id);

    await waitForContainer(creationId, accessToken);

    const published = await axios.post(`${IG_GRAPH}/${igUserId}/media_publish`, null, {
      params: { creation_id: creationId, access_token: accessToken },
    });
    return String(published.data.id);
  } catch (err) {
    throw graphError('instagram', err);
  }
}

/** Poll the container until Instagram finishes downloading the media. */
async function waitForContainer(
  creationId: string,
  accessToken: string,
  attempts = 10
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const res = await axios.get(`${IG_GRAPH}/${creationId}`, {
      params: { fields: 'status_code,status', access_token: accessToken },
    });
    const status = res.data.status_code;

    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new Error(`media processing ${String(status).toLowerCase()}: ${res.data.status || ''}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('media processing timed out');
}

export class PublishService {
  static async publishToPlatform(
    userId: number,
    postId: number,
    platform: string
  ): Promise<string> {
    await setCurrentUser(userId);

    const postResult = await pool.query(
      'SELECT content, media_urls FROM posts WHERE id = $1 AND user_id = $2',
      [postId, userId]
    );
    if (postResult.rows.length === 0) throw new Error('Post not found');

    const post = postResult.rows[0];
    const accountResult = await pool.query(
      `SELECT access_token, platform_user_id, metadata
         FROM social_accounts WHERE user_id = $1 AND platform = $2 LIMIT 1`,
      [userId, platform]
    );

    if (accountResult.rows.length === 0) {
      throw new Error(`No connected ${platform} account`);
    }

    const account = accountResult.rows[0];
    const accessToken = decrypt(account.access_token);

    if (accessToken.startsWith('demo_token_')) {
      throw new Error(
        `Demo account detected for ${platform}. Disconnect it in Settings, add API keys to .env, and reconnect with live OAuth.`
      );
    }

    const metadata =
      typeof account.metadata === 'string'
        ? JSON.parse(account.metadata)
        : account.metadata || {};

    const mediaUrls = normalizeMediaUrls(post.media_urls);

    let platformPostId: string;

    if (platform === 'twitter') {
      const response = await axios.post(
        'https://api.twitter.com/2/tweets',
        { text: post.content },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      platformPostId = response.data.data.id;
    } else if (platform === 'facebook') {
      platformPostId = await publishToFacebook(
        String(metadata.pageId || account.platform_user_id || ''),
        accessToken,
        post.content,
        mediaUrls
      );
    } else if (platform === 'instagram') {
      platformPostId = await publishToInstagram(
        String(metadata.igUserId || account.platform_user_id || ''),
        accessToken,
        post.content,
        mediaUrls
      );
    } else {
      platformPostId = `${platform}_${Date.now()}`;
    }

    const existing = await pool.query(
      'SELECT platform_post_ids FROM posts WHERE id = $1',
      [postId]
    );
    const ids =
      typeof existing.rows[0]?.platform_post_ids === 'string'
        ? JSON.parse(existing.rows[0].platform_post_ids)
        : existing.rows[0]?.platform_post_ids || {};
    ids[platform] = platformPostId;

    await pool.query(
      'UPDATE posts SET platform_post_ids = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
      [JSON.stringify(ids), postId, userId]
    );

    void AnalyticsService.collectAnalytics(userId, postId, platform).catch(console.error);

    return platformPostId;
  }

  static async publishPost(
    userId: number,
    postId: number,
    platforms: string[]
  ): Promise<{ platformPostIds: Record<string, string>; errors: Record<string, string> }> {
    await setCurrentUser(userId);

    const platformPostIds: Record<string, string> = {};
    const errors: Record<string, string> = {};

    for (const platform of platforms) {
      try {
        platformPostIds[platform] = await this.publishToPlatform(userId, postId, platform);
      } catch (err) {
        errors[platform] = err instanceof Error ? err.message : 'Publish failed';
      }
    }

    const status =
      Object.keys(errors).length === platforms.length
        ? 'failed'
        : Object.keys(platformPostIds).length > 0
          ? 'published'
          : 'failed';

    await pool.query(
      `UPDATE posts SET status = $1, platform_post_ids = $2, published_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND user_id = $4`,
      [status, JSON.stringify(platformPostIds), postId, userId]
    );

    if (Object.keys(errors).length > 0) {
      throw new Error(
        `Publish partial failure: ${Object.entries(errors)
          .map(([p, m]) => `${p}: ${m}`)
          .join('; ')}`
      );
    }

    return { platformPostIds, errors };
  }

  static async submitForApproval(userId: number, postId: number): Promise<void> {
    await setCurrentUser(userId);
    await pool.query(
      `UPDATE posts SET status = 'pending_approval', updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [postId, userId]
    );
  }

  static async approvePost(
    userId: number,
    postId: number,
    platforms: string[] = []
  ): Promise<{ platformPostIds: Record<string, string>; errors: Record<string, string> }> {
    await setCurrentUser(userId);

    const postResult = await pool.query(
      'SELECT platform FROM posts WHERE id = $1 AND user_id = $2',
      [postId, userId]
    );
    if (postResult.rows.length === 0) {
      throw new Error('Post not found');
    }

    const defaultPlatform = postResult.rows[0]?.platform || 'twitter';
    const targetPlatforms = platforms.length ? platforms : [defaultPlatform];

    const result = await this.publishPost(userId, postId, targetPlatforms);

    await pool.query(
      `UPDATE posts SET status = 'published', updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [postId, userId]
    );

    return result;
  }
}
