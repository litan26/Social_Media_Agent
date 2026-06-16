import { Router, Request, Response } from 'express';
import { WebhookService } from '../services/webhook.service.js';

const router = Router();

router.get('/:platform', (req: Request, res: Response) => {
  const platform = req.params.platform;
  if (platform === 'facebook' || platform === 'meta' || platform === 'instagram') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    }
  }
  res.status(403).json({ error: 'Verification failed' });
});

router.post('/:platform', async (req: Request, res: Response) => {
  const platform = req.params.platform;
  const rawBody = req.body as Buffer;

  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }

  try {
    if (platform === 'facebook' || platform === 'meta' || platform === 'instagram') {
      const sig = req.headers['x-hub-signature-256'] as string | undefined;
      if (!WebhookService.verifyMetaSignature(rawBody, sig)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
      const payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
      await WebhookService.processMetaPayload(payload);
    } else if (platform === 'linkedin') {
      const sig = req.headers['x-li-signature'] as string | undefined;
      if (!WebhookService.verifyLinkedInSignature(rawBody, sig)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
      const payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
      await WebhookService.processLinkedInPayload(payload);
    } else {
      res.status(404).json({ error: 'Unsupported platform' });
      return;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Webhook ${platform} error:`, error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
