import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { ClaudeService } from '../services/claude.service.js';
import { pool, setCurrentUser } from '../db/connection.js';
import { respondIfPlanLimit } from '../utils/planErrors.js';
import { PlanService } from '../services/plan.service.js';
import { userRateLimit } from '../middleware/rateLimit.middleware.js';
import { RATE_LIMITS } from '../services/rateLimit.service.js';

const router = Router();

function sendSse(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post('/', authMiddleware, userRateLimit(RATE_LIMITS.generate), async (req: AuthRequest, res) => {
  const { topic, platforms, platform, tone, keywords } = req.body as {
    topic?: string;
    platforms?: string[];
    platform?: string;
    tone?: string;
    keywords?: string[] | string;
  };
  const userId = req.userId!;

  const targetPlatforms: string[] =
    Array.isArray(platforms) && platforms.length > 0
      ? platforms
      : platform
        ? [platform]
        : ['twitter'];

  if (!topic?.trim()) {
    res.status(400).json({ error: 'Topic is required' });
    return;
  }

  const keywordList = Array.isArray(keywords)
    ? keywords
    : typeof keywords === 'string'
      ? keywords.split(/,\s*/).filter(Boolean)
      : [];

  try {
    await PlanService.assertAiGenerationAllowed(userId, req.plan);
  } catch (err) {
    if (respondIfPlanLimit(res, err)) return;
    throw err;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    sendSse(res, 'start', { platforms: targetPlatforms, topic });

    const postsByPlatform: Record<string, { postId: number; variants: object }> = {};

    for (const plat of targetPlatforms) {
      let finalVariants = { variantA: '', variantB: '', variantC: '' };

      for await (const chunk of ClaudeService.streamPostVariants(userId, topic, plat, {
        tone,
        keywords: keywordList,
        jwtPlan: req.plan,
      })) {
        if (chunk.type === 'hashtags') {
          sendSse(res, 'hashtags', { platform: plat, tags: chunk.tags });
        } else if (chunk.type === 'delta') {
          sendSse(res, 'delta', { platform: plat, text: chunk.text });
        } else if (chunk.type === 'variant') {
          sendSse(res, 'variant', {
            platform: plat,
            key: chunk.key,
            content: chunk.content,
          });
        } else if (chunk.type === 'done') {
          finalVariants = chunk.variants;
        }
      }

      await setCurrentUser(userId);
      const postResult = await pool.query(
        `INSERT INTO posts (user_id, platform, content, variants, status)
         VALUES ($1, $2, $3, $4, 'draft')`,
        [
          userId,
          plat,
          finalVariants.variantA,
          JSON.stringify(finalVariants),
        ]
      );

      const postId = postResult.insertId as number;
      postsByPlatform[plat] = { postId, variants: finalVariants };

      sendSse(res, 'draft', {
        platform: plat,
        postId,
        variants: finalVariants,
      });
    }

    sendSse(res, 'done', { posts: postsByPlatform });
    res.end();
  } catch (error: unknown) {
    if (respondIfPlanLimit(res, error)) return;
    const message = error instanceof Error ? error.message : 'Generation failed';
    if (!res.headersSent) {
      res.status(500).json({ error: message });
      return;
    }
    sendSse(res, 'error', { error: message });
    res.end();
  }
});

export default router;
