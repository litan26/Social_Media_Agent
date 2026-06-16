import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { OAuthService } from '../services/oauth.service.js';

const router = Router();

/** Guide: GET /api/accounts — returns { accounts } without tokens */
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const accounts = await OAuthService.listAccounts(req.userId!);
    res.json({ accounts });
  } catch {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.delete('/:accountId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await OAuthService.disconnectAccount(req.userId!, parseInt(String(req.params.accountId), 10));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

export default router;
