import { Router, Request, Response } from 'express';
import { PaymentService } from '../services/payment.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { AuthService } from '../services/auth.service.js';
import { PLANS, type Plan } from '../config/plans.js';

const router = Router();

// Create checkout session for registration
router.post('/create-checkout', async (req: Request, res: Response) => {
  try {
    const { email, plan } = req.body;

    if (!email || !plan) {
      res.status(400).json({ error: 'Email and plan required' });
      return;
    }

    if (!PLANS.includes(plan as Plan)) {
      res.status(400).json({ error: 'Invalid plan' });
      return;
    }

    const result = await PaymentService.createCheckoutSession(email, plan as Plan);

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    res.status(500).json({ error: message });
  }
});

// Create checkout session for existing user upgrading plan
router.post('/upgrade-plan', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { plan } = req.body;
    const userId = req.userId!;

    if (!plan || !PLANS.includes(plan as Plan)) {
      res.status(400).json({ error: 'Invalid plan' });
      return;
    }

    const user = await AuthService.getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const result = await PaymentService.createCheckoutSession(user.email, plan as Plan, userId);

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    res.status(500).json({ error: message });
  }
});

// Verify checkout completion
router.post('/verify-checkout', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID required' });
      return;
    }

    const result = await PaymentService.handleCheckoutComplete(sessionId);
    const token = await PaymentService.issueRefreshedToken(result.userId);
    res.json({ ...result, token });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify checkout';
    res.status(400).json({ error: message });
  }
});

// Get subscription details
router.get('/subscription', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const subscription = await PaymentService.getSubscription(userId);

    res.json(subscription || { plan: 'free' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
    res.status(500).json({ error: message });
  }
});

export default router;
