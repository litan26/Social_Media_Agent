import { Router, Request, Response } from 'express';
import { PaymentService } from '../services/payment.service.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = req.body as Buffer;

    if (!Buffer.isBuffer(rawBody)) {
      res.status(400).json({ error: 'Invalid webhook body' });
      return;
    }

    const event = PaymentService.verifyWebhookSignature(rawBody, signature);
    await PaymentService.handleWebhook(event);

    res.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook error';
    console.error('Stripe webhook error:', message);
    res.status(400).json({ error: message });
  }
});

export default router;
