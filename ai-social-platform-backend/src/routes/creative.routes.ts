import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { CreativeImageService } from '../services/creativeImage.service.js';
import { pool } from '../db/connection.js';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetriesPerRequest: 3 });

async function craftHeadline(topic: string, tone?: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 60,
    messages: [
      {
        role: 'user',
        content: `Write one short, punchy headline (4-9 words) for a social media graphic about: "${topic}". Tone: ${tone || 'professional'}. It must read like real marketing copy, not just repeat the topic word-for-word. No quotes, no hashtags, no explanation — output only the headline text.`,
      },
    ],
  });
  const textBlock = message.content.find((b) => b.type === 'text');
  const headline = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : '';
  return headline.replace(/^["']|["']$/g, '') || topic;
}

router.post('/generate', authMiddleware, async (req: AuthRequest, res) => {
  const { text, tone } = req.body as { text?: string; tone?: string };
  const userId = req.userId!;

  if (!text?.trim()) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  try {
    const userResult = await pool.query('SELECT logo_url FROM users WHERE id = $1', [userId]);
    const logoUrl = userResult.rows[0]?.logo_url || undefined;

    const headline = await craftHeadline(text, tone);
    const png = await CreativeImageService.generateCard(headline, { tone, logoUrl });
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
    res.json({ dataUrl, headline });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate creative image';
    res.status(500).json({ error: message });
  }
});

export default router;
