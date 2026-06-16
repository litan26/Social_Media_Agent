import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { ClaudeService } from '../services/claude.service.js';
import { PublishService } from '../services/publish.service.js';
import { ScheduleService } from '../services/schedule.service.js';
import { pool, setCurrentUser } from '../db/connection.js';
import { assertPostOwnedByUser, getPostsByUser } from '../db/tenant.js';
import { MediaService } from '../services/media.service.js';
import { respondIfPlanLimit } from '../utils/planErrors.js';
import { userRateLimit } from '../middleware/rateLimit.middleware.js';
import { RATE_LIMITS } from '../services/rateLimit.service.js';

const router = Router();

// Create a draft post directly (no AI generation)
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { content, platforms } = req.body as { content?: string; platforms?: string[] };
  const userId = req.userId!;

  if (!content?.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  try {
    await setCurrentUser(userId);
    const platform = (Array.isArray(platforms) && platforms[0]) || 'twitter';
    const result = await pool.query(
      'INSERT INTO posts (user_id, platform, content, variants, status) VALUES ($1, $2, $3, $4, $5)',
      [userId, platform, content, JSON.stringify({ directPost: true }), 'draft']
    );
    res.json({ postId: result.insertId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create draft';
    res.status(500).json({ error: message });
  }
});

router.post('/generate-variants', authMiddleware, async (req: AuthRequest, res) => {
  const { topic, platforms, tone, keywords } = req.body;
  const userId = req.userId!;

  try {
    const variants = await ClaudeService.generatePostVariants(userId, topic, platforms || [], {
      tone,
      keywords: Array.isArray(keywords) ? keywords : keywords?.split?.(/,\s*/) || [],
      jwtPlan: req.plan,
    });

    const primaryPlatform = (platforms && platforms[0]) || 'twitter';
    const postResult = await pool.query(
      `INSERT INTO posts (user_id, platform, content, variants, status)
       VALUES ($1, $2, $3, $4, 'draft')`,
      [userId, primaryPlatform, variants.variantA, JSON.stringify(variants)]
    );

    res.json({ postId: postResult.insertId, variants });
  } catch (error: unknown) {
    if (respondIfPlanLimit(res, error)) return;
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to generate variants';
    res.status(500).json({ error: message });
  }
});

router.get('/calendar', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  try {
    const rows = await ScheduleService.getCalendarPosts(userId);
    res.json(rows);
  } catch (error: unknown) {
    console.error('Calendar fetch failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch calendar posts';
    res.status(500).json({ error: message });
  }
});

router.get('/scheduled', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  try {
    await setCurrentUser(userId);
    const result = await pool.query(
      `SELECT sp.*, p.content
       FROM scheduled_posts sp
       JOIN posts p ON p.id = sp.post_id AND p.user_id = sp.user_id
       WHERE sp.user_id = $1
       ORDER BY sp.scheduled_at ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Scheduled posts fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled posts' });
  }
});

router.patch('/:postId', authMiddleware, async (req: AuthRequest, res) => {
  const postId = parseInt(String(req.params.postId), 10);
  const { mediaUrl } = req.body as { mediaUrl?: string };
  const userId = req.userId!;

  if (!mediaUrl) {
    res.status(400).json({ error: 'mediaUrl is required' });
    return;
  }

  try {
    const mediaUrls = await MediaService.appendMediaUrl(userId, postId, mediaUrl);
    res.json({ success: true, mediaUrls });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update media';
    res.status(500).json({ error: message });
  }
});

router.post('/:postId/media/presign', authMiddleware, async (req: AuthRequest, res) => {
  const postId = parseInt(String(req.params.postId), 10);
  const { filename, contentType } = req.body as { filename?: string; contentType?: string };
  const userId = req.userId!;

  if (!filename || !contentType) {
    res.status(400).json({ error: 'filename and contentType are required' });
    return;
  }

  if (!MediaService.isConfigured()) {
    res.status(503).json({ error: 'R2 storage is not configured on the server' });
    return;
  }

  try {
    const result = await MediaService.createPresignedUpload(
      userId,
      postId,
      filename,
      contentType
    );
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create upload URL';
    res.status(500).json({ error: message });
  }
});

router.put('/:postId', authMiddleware, async (req: AuthRequest, res) => {
  const postId = String(req.params.postId);
  const { content, selectedVariant, selectedKey } = req.body;
  const userId = req.userId!;

  try {
    await setCurrentUser(userId);
    await assertPostOwnedByUser(userId, parseInt(postId, 10));
    if (selectedKey && selectedVariant) {
      const existing = await pool.query('SELECT variants FROM posts WHERE id = $1 AND user_id = $2', [
        postId,
        userId,
      ]);
      const variants =
        typeof existing.rows[0]?.variants === 'string'
          ? JSON.parse(existing.rows[0].variants)
          : existing.rows[0]?.variants || {};
      variants.selectedKey = selectedKey;
      await pool.query(
        'UPDATE posts SET content = $1, variants = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4',
        [content || selectedVariant, JSON.stringify(variants), postId, userId]
      );
    } else {
      await pool.query(
        'UPDATE posts SET content = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [content || selectedVariant, postId, userId]
      );
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to update post' });
  }
});

router.post(
  '/publish-now',
  authMiddleware,
  userRateLimit(RATE_LIMITS.publishNow),
  async (req: AuthRequest, res) => {
  const { postId, platforms } = req.body as { postId?: number; platforms?: string[] };
  const userId = req.userId!;

  if (!postId || !platforms?.length) {
    res.status(400).json({ error: 'postId and platforms are required' });
    return;
  }

  try {
    const result = await PublishService.publishPost(userId, postId, platforms);
    res.json({
      success: true,
      message: 'Post published',
      platformPostIds: result.platformPostIds,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to publish post';
    res.status(500).json({ error: message, notify: true });
  }
});

router.post('/schedule', authMiddleware, async (req: AuthRequest, res) => {
  const { postId, platforms, scheduledAt } = req.body as {
    postId?: number;
    platforms?: string[];
    scheduledAt?: string;
  };
  const userId = req.userId!;

  if (!postId || !platforms?.length || !scheduledAt) {
    res.status(400).json({ error: 'postId, platforms, and scheduledAt are required' });
    return;
  }

  try {
    const result = await ScheduleService.schedulePost(
      userId,
      postId,
      platforms,
      new Date(scheduledAt)
    );
    res.json({
      success: true,
      message: result.queued ? 'Post scheduled' : 'Saved but Redis unavailable — job not queued',
      queued: result.queued,
      scheduled: result.scheduled,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to schedule post';
    res.status(400).json({ error: message });
  }
});

router.patch('/schedule/:scheduledPostId', authMiddleware, async (req: AuthRequest, res) => {
  const scheduledPostId = parseInt(String(req.params.scheduledPostId), 10);
  const { scheduledAt } = req.body as { scheduledAt?: string };
  const userId = req.userId!;

  if (!scheduledAt) {
    res.status(400).json({ error: 'scheduledAt is required' });
    return;
  }

  try {
    const result = await ScheduleService.reschedule(userId, scheduledPostId, new Date(scheduledAt));
    res.json({ success: true, jobId: result.jobId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reschedule';
    res.status(400).json({ error: message });
  }
});

router.post('/:postId/publish', authMiddleware, async (req: AuthRequest, res) => {
  const postId = String(req.params.postId);
  const { platforms } = req.body;
  const userId = req.userId!;

  try {
    const result = await PublishService.publishPost(userId, parseInt(postId, 10), platforms);
    res.json({ success: true, message: 'Post published', ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to publish post';
    res.status(500).json({ error: message, notify: true });
  }
});

router.post('/:postId/submit-approval', authMiddleware, async (req: AuthRequest, res) => {
  const postId = parseInt(String(req.params.postId), 10);
  const userId = req.userId!;

  try {
    await PublishService.submitForApproval(userId, postId);
    res.json({ success: true, message: 'Post submitted for approval' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit post for approval';
    res.status(400).json({ error: message });
  }
});

router.post('/:postId/approve', authMiddleware, async (req: AuthRequest, res) => {
  const postId = parseInt(String(req.params.postId), 10);
  const { platforms } = req.body as { platforms?: string[] };
  const userId = req.userId!;

  try {
    const result = await PublishService.approvePost(userId, postId, platforms || []);
    res.json({ success: true, message: 'Post approved and published', ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to approve post';
    res.status(500).json({ error: message, notify: true });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  try {
    await setCurrentUser(userId);
    const result = await getPostsByUser(userId, 50);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

export default router;
