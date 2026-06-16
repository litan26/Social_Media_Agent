import { Router } from 'express';
import { AuthService } from '../services/auth.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { PLAN_LIMITS, PLANS, type Plan } from '../config/plans.js';
import { PlanService } from '../services/plan.service.js';
import { MediaService } from '../services/media.service.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, phone, plan } = req.body as {
    email?: string;
    password?: string;
    phone?: string;
    plan?: Plan;
  };

  if (!email || !password || !phone) {
    res.status(400).json({ error: 'Email, phone number, and password are required' });
    return;
  }

  if (plan && !PLANS.includes(plan)) {
    res.status(400).json({ error: 'Invalid plan' });
    return;
  }

  try {
    const result = await AuthService.register(email, password, phone, plan ?? 'free');
    res.status(201).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

router.post('/register-paid', async (req, res) => {
  const { email, password, sessionId } = req.body as {
    email?: string;
    password?: string;
    sessionId?: string;
  };

  if (!email || !password || !sessionId) {
    res.status(400).json({ error: 'Email, password, and sessionId required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  try {
    const result = await AuthService.registerWithPayment(email, password, sessionId);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await AuthService.getUserById(req.userId!);
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  const { industry, business_type, voice_tone_preference, logo_url } = req.body;
  try {
    const user = await AuthService.updateProfile(req.userId!, {
      industry,
      business_type,
      voice_tone_preference,
      logo_url,
    });
    res.json(user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Update failed';
    res.status(400).json({ error: message });
  }
});

router.post('/logo/presign', authMiddleware, async (req: AuthRequest, res) => {
  const { filename, contentType } = req.body as { filename?: string; contentType?: string };
  const userId = req.userId!;

  if (!filename || !contentType) {
    res.status(400).json({ error: 'filename and contentType are required' });
    return;
  }
  if (!MediaService.isConfigured()) {
    res.status(503).json({ error: 'Media storage is not configured on the server' });
    return;
  }

  try {
    const result = await MediaService.createPresignedLogoUpload(userId, filename, contentType);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create upload URL';
    res.status(500).json({ error: message });
  }
});

router.get('/plans', (_req, res) => {
  res.json(
    PLANS.map((id) => ({
      id,
      ...PLAN_LIMITS[id],
      label: id.charAt(0).toUpperCase() + id.slice(1),
    }))
  );
});

router.get('/usage', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const usage = await PlanService.getUsage(req.userId!, req.plan);
    res.json(usage);
  } catch {
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

router.put('/plan', authMiddleware, async (req: AuthRequest, res) => {
  const { plan } = req.body as { plan: Plan };
  try {
    const result = await AuthService.updatePlan(req.userId!, plan);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid plan';
    res.status(400).json({ error: message });
  }
});

export default router;
