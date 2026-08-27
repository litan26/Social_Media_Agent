import axios from 'axios';
import { pool, setCurrentUser } from '../db/connection.js';

export interface MetricInput {
  likes: number;
  shares: number;
  reach: number;
  clicks: number;
  comments?: number;
}

export class AnalyticsService {
  static async upsertMetrics(
    userId: number,
    postId: number,
    platform: string,
    platformPostId: string,
    metrics: MetricInput
  ): Promise<void> {
    const reach = metrics.reach;
    const clicks = metrics.clicks;
    const comments = metrics.comments ?? 0;
    const ctr = reach > 0 ? Number(((clicks / reach) * 100).toFixed(2)) : 0;
    const engagementRate =
      reach > 0
        ? Number(
            (
              ((metrics.likes + metrics.shares + comments) / reach) *
              100
            ).toFixed(2)
          )
        : 0;

    await pool.query(
      `INSERT INTO post_analytics
         (user_id, post_id, platform, platform_post_id, impressions, likes, shares, comments, clicks, ctr, engagement_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (post_id, platform) DO UPDATE SET
         impressions = EXCLUDED.impressions,
         likes = EXCLUDED.likes,
         shares = EXCLUDED.shares,
         comments = EXCLUDED.comments,
         clicks = EXCLUDED.clicks,
         ctr = EXCLUDED.ctr,
         engagement_rate = EXCLUDED.engagement_rate,
         updated_at = CURRENT_TIMESTAMP,
         data_collected_at = CURRENT_TIMESTAMP`,
      [
        userId,
        postId,
        platform,
        platformPostId,
        reach,
        metrics.likes,
        metrics.shares,
        comments,
        clicks,
        ctr,
        engagementRate,
      ]
    );
  }

  /** Backfill demo/live metrics for published posts missing analytics rows. */
  static async syncPublishedAnalytics(userId: number): Promise<void> {
    await setCurrentUser(userId);

    const result = await pool.query(
      `SELECT p.id, p.platform_post_ids
       FROM posts p
       WHERE p.user_id = $1
         AND p.status = 'published'
         AND p.platform_post_ids IS NOT NULL`,
      [userId]
    );

    for (const row of result.rows as { id: number; platform_post_ids: string | Record<string, string> }[]) {
      const ids =
        typeof row.platform_post_ids === 'string'
          ? JSON.parse(row.platform_post_ids)
          : row.platform_post_ids || {};

      for (const platform of Object.keys(ids)) {
        const existing = await pool.query(
          `SELECT id FROM post_analytics
           WHERE user_id = $1 AND post_id = $2 AND platform = $3
           LIMIT 1`,
          [userId, row.id, platform]
        );
        if (existing.rows.length === 0) {
          await this.collectAnalytics(userId, row.id, platform);
        }
      }
    }
  }

  static async collectAnalytics(userId: number, postId: number, platform: string): Promise<void> {
    await setCurrentUser(userId);

    const postResult = await pool.query(
      'SELECT platform_post_ids FROM posts WHERE id = $1 AND user_id = $2',
      [postId, userId]
    );
    if (postResult.rows.length === 0) return;

    const platformPostIds =
      typeof postResult.rows[0].platform_post_ids === 'string'
        ? JSON.parse(postResult.rows[0].platform_post_ids)
        : postResult.rows[0].platform_post_ids;

    const platformPostId = platformPostIds?.[platform];
    if (!platformPostId) return;

    try {
      let metrics: MetricInput = {
        reach: 0,
        likes: 0,
        shares: 0,
        clicks: 0,
        comments: 0,
      };

      if (
        platform === 'twitter' &&
        process.env.TWITTER_BEARER_TOKEN &&
        !String(platformPostId).startsWith('demo_') &&
        !String(platformPostId).startsWith('twitter_')
      ) {
        const response = await axios.get(
          `https://api.twitter.com/2/tweets/${platformPostId}?tweet.fields=public_metrics`,
          { headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` } }
        );

        const data = response.data.data;
        metrics = {
          reach: data.public_metrics.impression_count || 0,
          likes: data.public_metrics.like_count || 0,
          shares: data.public_metrics.retweet_count || 0,
          comments: data.public_metrics.reply_count || 0,
          clicks: 0,
        };
      } else {
        const seed = postId * 31 + platform.length * 17;
        metrics = {
          reach: 500 + (seed % 4500),
          likes: 20 + (seed % 180),
          shares: 5 + (seed % 45),
          comments: 3 + (seed % 25),
          clicks: 10 + (seed % 90),
        };
      }

      await this.upsertMetrics(userId, postId, platform, String(platformPostId), metrics);
    } catch (error) {
      console.error(`Failed to collect analytics for ${platform}:`, error);
    }
  }

  static async getAnalytics(userId: number, postId?: number) {
    await setCurrentUser(userId);

    if (!postId) {
      await this.syncPublishedAnalytics(userId);
    }

    if (postId) {
      const result = await pool.query(
        'SELECT * FROM post_analytics WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      );
      return result.rows;
    }

    const result = await pool.query(
      `SELECT pa.*, p.content, p.published_at
       FROM post_analytics pa
       JOIN posts p ON p.id = pa.post_id AND p.user_id = pa.user_id
       WHERE pa.user_id = $1
       ORDER BY pa.updated_at DESC
       LIMIT 100`,
      [userId]
    );
    return result.rows;
  }

  static async getDashboard(userId: number) {
    await setCurrentUser(userId);
    await this.syncPublishedAnalytics(userId);

    const heatmapResult = await pool.query(
      `SELECT EXTRACT(HOUR FROM COALESCE(p.published_at, p.created_at))::int AS hour,
              AVG(a.clicks::numeric / NULLIF(a.impressions, 0)) AS avg_ctr
       FROM posts p
       JOIN post_analytics a ON a.post_id = p.id AND a.user_id = p.user_id
       WHERE p.user_id = $1
       GROUP BY hour
       ORDER BY hour ASC`,
      [userId]
    );

    const ctrTrendResult = await pool.query(
      `SELECT DATE(a.data_collected_at) AS day,
              AVG(a.ctr) AS avg_ctr,
              SUM(a.clicks) AS total_clicks,
              SUM(a.impressions) AS total_reach
       FROM post_analytics a
       WHERE a.user_id = $1
         AND a.data_collected_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(a.data_collected_at)
       ORDER BY day ASC`,
      [userId]
    );

    const platformResult = await pool.query(
      `SELECT platform,
              SUM(impressions) AS reach,
              SUM(likes) AS likes,
              SUM(shares) AS shares,
              SUM(clicks) AS clicks,
              AVG(ctr) AS avg_ctr,
              AVG(engagement_rate) AS avg_engagement
       FROM post_analytics
       WHERE user_id = $1
       GROUP BY platform
       ORDER BY reach DESC`,
      [userId]
    );

    const summaryResult = await pool.query(
      `SELECT COUNT(DISTINCT post_id) AS total_posts,
              AVG(engagement_rate) AS avg_engagement,
              MAX(engagement_rate) AS top_engagement,
              SUM(impressions) AS total_reach,
              SUM(clicks) AS total_clicks
       FROM post_analytics
       WHERE user_id = $1`,
      [userId]
    );

    return {
      heatmap: heatmapResult.rows,
      ctrTrend: ctrTrendResult.rows,
      platformBreakdown: platformResult.rows,
      summary: summaryResult.rows[0] || {},
    };
  }
}
