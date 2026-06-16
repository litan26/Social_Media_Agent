import axios from 'axios';
import { pool, setCurrentUser } from '../db/connection.js';
import { decrypt } from '../utils/encryption.js';
import { AnalyticsService } from './analytics.service.js';

export class PublishService {
  static async publishToPlatform(
    userId: number,
    postId: number,
    platform: string
  ): Promise<string> {
    await setCurrentUser(userId);

    const postResult = await pool.query('SELECT content FROM posts WHERE id = $1 AND user_id = $2', [
      postId,
      userId,
    ]);
    if (postResult.rows.length === 0) throw new Error('Post not found');

    const post = postResult.rows[0];
    const accountResult = await pool.query(
      'SELECT access_token FROM social_accounts WHERE user_id = $1 AND platform = $2 LIMIT 1',
      [userId, platform]
    );

    if (accountResult.rows.length === 0) {
      throw new Error(`No connected ${platform} account`);
    }

    const accessToken = decrypt(accountResult.rows[0].access_token);

    if (accessToken.startsWith('demo_token_')) {
      throw new Error(
        `Demo account detected for ${platform}. Disconnect it in Settings, add API keys to .env, and reconnect with live OAuth.`
      );
    }

    let platformPostId: string;

    if (platform === 'twitter') {
      const response = await axios.post(
        'https://api.twitter.com/2/tweets',
        { text: post.content },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      platformPostId = response.data.data.id;
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
