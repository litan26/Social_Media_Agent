import { Router } from 'express';
import { AuthService } from '../services/auth.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { superadminMiddleware } from '../middleware/superadmin.middleware.js';
import { PLANS, type Plan } from '../config/plans.js';

const router = Router();

router.use(authMiddleware, superadminMiddleware);

router.get('/users', async (_req, res) => {
  try {
    const users = await AuthService.listUsers();
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to list users' });
  }
});

router.post('/users', async (req: AuthRequest, res) => {
  const { email, password, plan } = req.body as {
    email?: string;
    password?: string;
    plan?: Plan;
  };

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  if (plan && !PLANS.includes(plan)) {
    res.status(400).json({ error: 'Invalid plan' });
    return;
  }

  try {
    const user = await AuthService.createUser(email, password, plan ?? 'free', 'user');
    res.status(201).json(user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    res.status(400).json({ error: message });
  }
});

export default router;
