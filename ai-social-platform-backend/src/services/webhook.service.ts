import crypto from 'crypto';
import { pool } from '../db/connection.js';
import { AnalyticsService } from './analytics.service.js';

type WebhookPlatform = 'facebook' | 'instagram' | 'linkedin' | 'meta';

export class WebhookService {
  static verifyMetaSignature(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = process.env.META_WEBHOOK_SECRET || process.env.FACEBOOK_APP_SECRET;
    if (!secret || !signature?.startsWith('sha256=')) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = signature.slice(7);
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
    } catch {
      return false;
    }
  }

  static verifyLinkedInSignature(
    rawBody: Buffer,
    signature: string | undefined
  ): boolean {
    const secret = process.env.LINKEDIN_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  static async resolvePostByPlatformId(
    platform: string,
    platformPostId: string
  ): Promise<{ userId: number; postId: number } | null> {
    const result = await pool.query(
      `SELECT id AS post_id, user_id
       FROM posts
       WHERE platform_post_ids ->> $1 = $2
       LIMIT 1`,
      [platform, platformPostId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0] as { post_id: number; user_id: number };
    return { userId: row.user_id, postId: row.post_id };
  }

  static async processMetaPayload(body: Record<string, unknown>): Promise<void> {
    const entries = (body.entry as Record<string, unknown>[]) || [];
    for (const entry of entries) {
      const changes = (entry.changes as Record<string, unknown>[]) || [];
      for (const change of changes) {
        const value = (change.value as Record<string, unknown>) || {};
        const platformPostId = String(value.post_id || value.id || '');
        if (!platformPostId) continue;

        const platform =
          change.field === 'instagram' || String(value.media_id || '').length > 0
            ? 'instagram'
            : 'facebook';

        const resolved = await this.resolvePostByPlatformId(platform, platformPostId);
        if (!resolved) continue;

        const likes = Number(value.like_count || value.reactions || 0);
        const shares = Number(value.share_count || 0);
        const reach = Number(value.reach || value.impressions || 0);
        const clicks = Number(value.clicks || 0);

        await AnalyticsService.upsertMetrics(
          resolved.userId,
          resolved.postId,
          platform,
          platformPostId,
          { likes, shares, reach, clicks, comments: Number(value.comments || 0) }
        );
      }
    }
  }

  static async processLinkedInPayload(body: Record<string, unknown>): Promise<void> {
    const events = (body.events as Record<string, unknown>[]) || [body];
    for (const event of events) {
      const platformPostId = String(event.postId || event.post_id || event.urn || '');
      if (!platformPostId) continue;

      const resolved = await this.resolvePostByPlatformId('linkedin', platformPostId);
      if (!resolved) continue;

      const metrics = (event.metrics as Record<string, number>) || event;
      await AnalyticsService.upsertMetrics(
        resolved.userId,
        resolved.postId,
        'linkedin',
        platformPostId,
        {
          likes: Number(metrics.likes || metrics.likeCount || 0),
          shares: Number(metrics.shares || metrics.shareCount || 0),
          reach: Number(metrics.impressions || metrics.reach || 0),
          clicks: Number(metrics.clicks || metrics.clickCount || 0),
          comments: Number(metrics.comments || 0),
        }
      );
    }
  }
}
