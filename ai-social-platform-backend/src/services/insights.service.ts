import Anthropic from '@anthropic-ai/sdk';
import { pool, setCurrentUser } from '../db/connection.js';
import { AnalyticsService } from './analytics.service.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetriesPerRequest: 3 });

export interface AiInsightsJson {
  best_times: string[];
  top_tones: string[];
  recommended_topics: string[];
}

export class InsightsService {
  static async generateInsights(userId: number) {
    await setCurrentUser(userId);
    await AnalyticsService.syncPublishedAnalytics(userId);

    const prefs = await pool.query(
      'SELECT ai_insights, average_engagement_rate FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    const aiInsights = prefs.rows[0]?.ai_insights;
    const parsed =
      typeof aiInsights === 'string'
        ? JSON.parse(aiInsights || '{}')
        : aiInsights || {};

    const summary = await pool.query(
      `SELECT COUNT(DISTINCT post_id) AS total_posts,
              AVG(engagement_rate) AS avg_engagement,
              MAX(engagement_rate) AS top_engagement
       FROM post_analytics WHERE user_id = $1`,
      [userId]
    );
    const s = summary.rows[0] as {
      total_posts: number;
      avg_engagement: number;
      top_engagement: number;
    };

    const recommendations: string[] = [];
    if (parsed.recommended_topics?.length) {
      recommendations.push(
        `Focus on: ${(parsed.recommended_topics as string[]).slice(0, 3).join(', ')}`
      );
    }
    if (parsed.best_times?.length) {
      recommendations.push(`Best times: ${(parsed.best_times as string[]).join(', ')}`);
    }
    if (parsed.top_tones?.length) {
      recommendations.push(`Top tones: ${(parsed.top_tones as string[]).join(', ')}`);
    }
    if (recommendations.length === 0) {
      if (Number(s.total_posts) > 0) {
        recommendations.push('Best times to post: 9:00 AM – 11:00 AM and 5:00 PM – 7:00 PM');
        recommendations.push('Mix professional and casual tones based on your audience');
        recommendations.push('Double down on topics from your highest-engagement posts');
      } else {
        recommendations.push('Publish more posts to unlock AI-driven recommendations');
      }
    }

    if (Number(s.total_posts) > 0 && !parsed.best_times?.length) {
      parsed.best_times = ['9:00 AM', '5:00 PM'];
      parsed.top_tones = parsed.top_tones?.length
        ? parsed.top_tones
        : ['professional', 'casual'];
    }

    return {
      topEngagementRate: Number(s.top_engagement) || 0,
      avgEngagementRate: Number(Number(s.avg_engagement || 0).toFixed(2)),
      totalPosts: Number(s.total_posts) || 0,
      aiInsights: parsed as AiInsightsJson,
      recommendations,
    };
  }

  static async runWeeklyInsightsForUser(userId: number): Promise<AiInsightsJson | null> {
    await setCurrentUser(userId);

    const dataResult = await pool.query(
      `SELECT p.platform, p.content,
              a.likes, a.shares, a.impressions AS reach, a.clicks, a.ctr, a.engagement_rate
       FROM posts p
       JOIN post_analytics a ON a.post_id = p.id AND a.user_id = p.user_id
       WHERE p.user_id = $1
         AND p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [userId]
    );

    if (dataResult.rows.length === 0) return null;

    if (!process.env.ANTHROPIC_API_KEY) {
      const fallback: AiInsightsJson = {
        best_times: ['9:00 AM', '5:00 PM'],
        top_tones: ['professional', 'casual'],
        recommended_topics: dataResult.rows
          .slice(0, 3)
          .map((r: { content: string }) => String(r.content).slice(0, 40)),
      };
      await this.upsertAiInsights(userId, fallback);
      return fallback;
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system:
        'You analyze social media performance. Return JSON only with this exact shape: {"best_times":["string"],"top_tones":["string"],"recommended_topics":["string"]}. No markdown.',
      messages: [
        {
          role: 'user',
          content: `Analyze these posts from the last 30 days and extract insights:\n${JSON.stringify(dataResult.rows)}`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== 'text') return null;

    let parsed: AiInsightsJson;
    try {
      const jsonText = block.text.replace(/```json?\s*|\s*```/g, '').trim();
      parsed = JSON.parse(jsonText) as AiInsightsJson;
    } catch {
      return null;
    }

    await this.upsertAiInsights(userId, parsed);
    return parsed;
  }

  static async upsertAiInsights(userId: number, insights: AiInsightsJson): Promise<void> {
    await pool.query(
      `INSERT INTO user_preferences (user_id, ai_insights, best_posting_times, top_topics, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON DUPLICATE KEY UPDATE
         ai_insights = VALUES(ai_insights),
         best_posting_times = VALUES(best_posting_times),
         top_topics = VALUES(top_topics),
         updated_at = NOW()`,
      [
        userId,
        JSON.stringify(insights),
        JSON.stringify({ times: insights.best_times }),
        JSON.stringify({ topics: insights.recommended_topics }),
      ]
    );
  }

  static async runWeeklyInsightsForAllUsers(): Promise<void> {
    const users = await pool.query(
      `SELECT DISTINCT p.user_id
       FROM posts p
       JOIN post_analytics a ON a.post_id = p.id
       WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    for (const row of users.rows as { user_id: number }[]) {
      try {
        await this.runWeeklyInsightsForUser(row.user_id);
        console.log(`AI insights updated for user ${row.user_id}`);
      } catch (err) {
        console.error(`Insights failed for user ${row.user_id}:`, err);
      }
    }
  }
}
