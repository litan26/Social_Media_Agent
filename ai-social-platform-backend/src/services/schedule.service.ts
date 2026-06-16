import { pool, setCurrentUser } from '../db/connection.js';
import { assertPostOwnedByUser } from '../db/tenant.js';
import {
  enqueueScheduledPublish,
  removeScheduledJob,
  rescheduleScheduledJob,
} from '../queues/publishQueue.js';

export interface ScheduledRow {
  id: number;
  user_id: number;
  post_id: number;
  platform: string;
  scheduled_at: Date;
  status: string;
  job_id: string | null;
}

export class ScheduleService {
  static async schedulePost(
    userId: number,
    postId: number,
    platforms: string[],
    scheduledAt: Date
  ): Promise<{ scheduled: { id: number; platform: string; jobId: string | null }[]; queued: boolean }> {
    await setCurrentUser(userId);
    await assertPostOwnedByUser(userId, postId);

    if (scheduledAt.getTime() <= Date.now()) {
      throw new Error('Scheduled time must be in the future');
    }

    await pool.query(
      `UPDATE posts SET status = 'scheduled', updated_at = NOW() WHERE id = $1 AND user_id = $2`,
      [postId, userId]
    );

    const scheduled: { id: number; platform: string; jobId: string | null }[] = [];
    let queued = false;

    for (const platform of platforms) {
      const insert = await pool.query(
        `INSERT INTO scheduled_posts (user_id, post_id, platform, scheduled_at, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [userId, postId, platform, scheduledAt]
      );
      const scheduledPostId = insert.insertId as number;

      const jobId = await enqueueScheduledPublish(
        scheduledPostId,
        userId,
        postId,
        platform,
        scheduledAt
      );

      if (jobId) {
        queued = true;
        await pool.query(
          `UPDATE scheduled_posts SET job_id = $1 WHERE id = $2 AND user_id = $3`,
          [jobId, scheduledPostId, userId]
        );
      }

      scheduled.push({ id: scheduledPostId, platform, jobId });
    }

    return { scheduled, queued };
  }

  static async reschedule(
    userId: number,
    scheduledPostId: number,
    newScheduledAt: Date
  ): Promise<{ jobId: string | null }> {
    await setCurrentUser(userId);

    const rowResult = await pool.query(
      `SELECT id, post_id, platform, job_id, status
       FROM scheduled_posts
       WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
      [scheduledPostId, userId]
    );

    if (rowResult.rows.length === 0) {
      throw new Error('Scheduled post not found or not pending');
    }

    const row = rowResult.rows[0] as ScheduledRow;

    if (newScheduledAt.getTime() <= Date.now()) {
      throw new Error('Scheduled time must be in the future');
    }

    if (row.job_id) {
      await removeScheduledJob(row.job_id);
    }

    const jobId = await rescheduleScheduledJob(
      scheduledPostId,
      userId,
      row.post_id,
      row.platform,
      newScheduledAt
    );

    await pool.query(
      `UPDATE scheduled_posts
       SET scheduled_at = $1, job_id = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4`,
      [newScheduledAt, jobId, scheduledPostId, userId]
    );

    return { jobId };
  }

  static async getCalendarPosts(userId: number) {
    await setCurrentUser(userId);
    const result = await pool.query(
      `SELECT p.id, p.platform, p.content, p.status, p.published_at,
              sp.id AS scheduled_post_id, sp.platform AS schedule_platform,
              sp.scheduled_at, sp.job_id, sp.status AS schedule_status
       FROM posts p
       LEFT JOIN scheduled_posts sp
         ON sp.post_id = p.id AND sp.user_id = p.user_id
       WHERE p.user_id = $1
         AND (
           p.status IN ('scheduled', 'published')
           OR (sp.id IS NOT NULL AND sp.status IN ('pending', 'published', 'failed'))
         )
       ORDER BY COALESCE(sp.scheduled_at, p.published_at, p.created_at) ASC`,
      [userId]
    );
    return result.rows;
  }
}
