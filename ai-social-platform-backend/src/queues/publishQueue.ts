import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { PublishService } from '../services/publish.service.js';
import { pool } from '../db/connection.js';
import { ensureRedisConnected } from '../utils/redisConnect.js';

let connection: Redis | null = null;
let publishQueue: Queue | null = null;

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

export async function isRedisAvailable(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await ensureRedisConnected(redis);
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

function getQueue(): Queue | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!publishQueue) {
    publishQueue = new Queue('publish-social-post', { connection: redis });
  }
  return publishQueue;
}

export interface PublishJobData {
  userId: number;
  postId: number;
  platform: string;
  scheduledPostId: number;
}

export async function enqueueScheduledPublish(
  scheduledPostId: number,
  userId: number,
  postId: number,
  platform: string,
  scheduledAt: Date
): Promise<string | null> {
  const queue = getQueue();
  if (!queue) return null;

  const delay = scheduledAt.getTime() - Date.now();

  try {
    await ensureRedisConnected(getRedis()!);

    const job = await queue.add(
      'publish',
      { userId, postId, platform, scheduledPostId },
      {
        delay: Math.max(0, delay),
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        jobId: `sched-${scheduledPostId}-${Date.now()}`,
      }
    );
    return job.id ?? null;
  } catch (err) {
    console.error('Queue enqueue failed:', err);
    return null;
  }
}

export async function removeScheduledJob(jobId: string): Promise<void> {
  const queue = getQueue();
  if (!queue) return;
  const job = await queue.getJob(jobId);
  if (job) await job.remove();
}

export async function rescheduleScheduledJob(
  scheduledPostId: number,
  userId: number,
  postId: number,
  platform: string,
  scheduledAt: Date
): Promise<string | null> {
  return enqueueScheduledPublish(scheduledPostId, userId, postId, platform, scheduledAt);
}

/** @deprecated Use ScheduleService.schedulePost — kept for backward compatibility */
export async function schedulePublish(
  userId: number,
  postId: number,
  platforms: string[],
  scheduledAt: Date
): Promise<{ queued: boolean; message?: string }> {
  let queued = false;
  for (const platform of platforms) {
    const jobId = await enqueueScheduledPublish(0, userId, postId, platform, scheduledAt);
    if (jobId) queued = true;
  }
  if (!queued) {
    return { queued: false, message: 'Redis unavailable — start Redis or use Publish Now' };
  }
  return { queued: true };
}

export function startPublishWorker(): Worker | null {
  const redis = getRedis();
  if (!redis) {
    console.warn('Redis not available — scheduled publish worker disabled');
    return null;
  }

  const worker = new Worker(
    'publish-social-post',
    async (job) => {
      const { userId, postId, platform, scheduledPostId } = job.data as PublishJobData;

      const platformPostId = await PublishService.publishToPlatform(userId, postId, platform);

      if (scheduledPostId) {
        await pool.query(
          `UPDATE scheduled_posts
           SET status = 'published', updated_at = NOW()
           WHERE id = $1 AND user_id = $2`,
          [scheduledPostId, userId]
        );
      } else {
        await pool.query(
          `UPDATE scheduled_posts
           SET status = 'published', updated_at = NOW()
           WHERE post_id = $1 AND user_id = $2 AND platform = $3`,
          [postId, userId, platform]
        );
      }

      await pool.query(
        `UPDATE posts
         SET status = 'published', published_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [postId, userId]
      );

      return { success: true, platform, platformPostId };
    },
    { connection: redis }
  );

  worker.on('failed', async (job, error) => {
    console.error(`Job ${job?.id} failed after retries:`, error);
    if (!job) return;

    const { userId, postId, platform, scheduledPostId } = job.data as PublishJobData;
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < attempts) return;

    if (scheduledPostId) {
      await pool.query(
        `UPDATE scheduled_posts SET status = 'failed', updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [scheduledPostId, userId]
      );
    } else {
      await pool.query(
        `UPDATE scheduled_posts SET status = 'failed', updated_at = NOW()
         WHERE post_id = $1 AND user_id = $2 AND platform = $3`,
        [postId, userId, platform]
      );
    }

    const pending = await pool.query(
      `SELECT COUNT(*) as c FROM scheduled_posts
       WHERE post_id = $1 AND user_id = $2 AND status = 'pending'`,
      [postId, userId]
    );
    if (Number((pending.rows[0] as { c: number }).c) === 0) {
      await pool.query(
        `UPDATE posts SET status = 'failed', updated_at = NOW() WHERE id = $1 AND user_id = $2`,
        [postId, userId]
      );
    }
  });

  console.log('Publish queue worker started');
  return worker;
}
