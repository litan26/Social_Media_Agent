import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { pool } from '../db/connection.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { ensureRedisConnected } from '../utils/redisConnect.js';

let connection: Redis | null = null;
let analyticsQueue: Queue | null = null;

function getRedis(): Redis | null {
  if (connection) return connection;
  try {
    connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    connection.on('error', () => {});
    return connection;
  } catch {
    return null;
  }
}

function getQueue(): Queue | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!analyticsQueue) {
    analyticsQueue = new Queue('analytics-poll', { connection: redis });
  }
  return analyticsQueue;
}

const POLL_PLATFORMS = ['twitter'];

export async function startAnalyticsPolling(): Promise<void> {
  const queue = getQueue();
  if (!queue) {
    console.warn('Redis unavailable — analytics polling disabled');
    return;
  }

  try {
    await ensureRedisConnected(getRedis()!);
  } catch (err) {
    console.warn('Redis unavailable — analytics polling disabled:', err);
    return;
  }

  await queue.add(
    'poll-twitter',
    {},
    {
      repeat: { every: 15 * 60 * 1000 },
      jobId: 'analytics-poll-twitter-15m',
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );

  console.log('Analytics polling scheduled (every 15 minutes)');
}

export function startAnalyticsWorker(): Worker | null {
  const redis = getRedis();
  if (!redis) return null;

  const worker = new Worker(
    'analytics-poll',
    async () => {
      const result = await pool.query(
        `SELECT id, user_id, platform_post_ids FROM posts
         WHERE status = 'published'
           AND published_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
           AND JSON_EXTRACT(platform_post_ids, '$.twitter') IS NOT NULL`
      );

      for (const row of result.rows as {
        id: number;
        user_id: number;
        platform_post_ids: string | Record<string, string>;
      }[]) {
        const ids =
          typeof row.platform_post_ids === 'string'
            ? JSON.parse(row.platform_post_ids)
            : row.platform_post_ids || {};

        for (const platform of POLL_PLATFORMS) {
          if (!ids[platform]) continue;
          try {
            await AnalyticsService.collectAnalytics(row.user_id, row.id, platform);
          } catch (err) {
            console.error(`Analytics poll failed post ${row.id}:`, err);
          }
        }
      }
    },
    { connection: redis }
  );

  worker.on('failed', (job, err) => {
    console.error(`Analytics poll job ${job?.id} failed:`, err);
  });

  console.log('Analytics poll worker started');
  return worker;
}
