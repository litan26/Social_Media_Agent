import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { CreativeImageService } from '../services/creativeImage.service.js';
import { CreativeHistoryService } from '../services/creativeHistory.service.js';
import { getImageStorage } from '../services/imageStorage.service.js';
import { pool } from '../db/connection.js';

const router = Router();

router.post('/generate', authMiddleware, async (req: AuthRequest, res) => {
  const { text, prompt, tone } = req.body as { text?: string; prompt?: string; tone?: string };
  const userId = req.userId!;

  const inputPrompt = (prompt || text)?.trim();
  if (!inputPrompt) {
    res.status(400).json({ error: 'Please provide a valid image prompt.' });
    return;
  }

  try {
    const userResult = await pool.query('SELECT logo_url FROM users WHERE id = $1', [userId]);
    const logoUrl = userResult.rows[0]?.logo_url || undefined;

    const result = await CreativeImageService.generateQuoteImage(inputPrompt, { tone, logoUrl });

    const stored = await getImageStorage().save(userId, result.png, 'png');
    const record = await CreativeHistoryService.record(userId, {
      quote: result.quote,
      prompt: inputPrompt,
      tone: result.tone,
      driver: stored.driver,
      key: stored.key,
      url: stored.url,
      width: result.width,
      height: result.height,
      bytes: stored.bytes,
    });

    res.json({
      id: record.id,
      url: record.url,
      quote: record.quote,
      prompt: record.prompt || record.quote,
      tone: record.tone,
      createdAt: record.created_at,
      dataUrl: `data:image/png;base64,${result.png.toString('base64')}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate image';
    res.status(500).json({ error: message });
  }
});

router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  try {
    const [images, total] = await Promise.all([
      CreativeHistoryService.list(userId, limit, offset),
      CreativeHistoryService.count(userId),
    ]);

    res.json({
      total,
      limit,
      offset,
      images: images.map((image) => ({
        id: image.id,
        url: image.url,
        quote: image.quote,
        prompt: image.prompt || image.quote,
        tone: image.tone,
        width: image.width,
        height: image.height,
        bytes: image.bytes,
        createdAt: image.created_at,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load history';
    res.status(500).json({ error: message });
  }
});

router.delete('/history/:id', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const imageId = Number(req.params.id);

  if (!Number.isInteger(imageId) || imageId <= 0) {
    res.status(400).json({ error: 'Invalid image id' });
    return;
  }

  try {
    const removed = await CreativeHistoryService.remove(userId, imageId);
    if (!removed) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete image';
    res.status(500).json({ error: message });
  }
});

export default router;
