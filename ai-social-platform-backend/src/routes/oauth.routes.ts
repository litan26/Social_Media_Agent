import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import {
  OAuthService,
  ALL_PLATFORMS,
  sanitizeOAuthReturnTo,
} from '../services/oauth.service.js';
import { respondIfPlanLimit } from '../utils/planErrors.js';

const router = Router();

// Public status: allow the frontend to display which platforms need server-side API keys
router.get('/platforms', (_req, res) => {
  res.json(
    ALL_PLATFORMS.map((p) => ({
      platform: p,
      ...OAuthService.getPlatformStatus(p),
    }))
  );
});

/** Guide: POST /api/oauth/start */
router.post('/start', authMiddleware, async (req: AuthRequest, res) => {
  const { platform, returnTo } = req.body as { platform?: string; returnTo?: string };

  if (!platform || !OAuthService.isValidPlatform(platform)) {
    res.status(400).json({ error: 'Invalid platform' });
    return;
  }

  try {
    const result = await OAuthService.startOAuth(
      req.userId!,
      platform,
      sanitizeOAuthReturnTo(returnTo)
    );
    res.json({
      redirectUrl: result.redirectUrl,
      platform: result.platform,
      mode: result.mode,
    });
  } catch (error: unknown) {
    if (respondIfPlanLimit(res, error)) return;
    const message = error instanceof Error ? error.message : 'Connection failed';
    const status = message.includes('not configured') ? 503 : 400;
    res.status(status).json({ error: message });
  }
});

/** Guide: DELETE /api/oauth/disconnect */
router.delete('/disconnect', authMiddleware, async (req: AuthRequest, res) => {
  const { platform } = req.body as { platform?: string };

  if (!platform || !OAuthService.isValidPlatform(platform)) {
    res.status(400).json({ error: 'Invalid platform' });
    return;
  }

  try {
    await OAuthService.disconnectByPlatform(req.userId!, platform);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

ALL_PLATFORMS.forEach((platform) => {
  router.get(`/${platform}/auth`, authMiddleware, async (req: AuthRequest, res) => {
    const returnTo = sanitizeOAuthReturnTo(req.query.returnTo as string | undefined);
    try {
      const result = await OAuthService.startOAuth(req.userId!, platform, returnTo);
      res.json({
        authUrl: result.redirectUrl,
        redirectUrl: result.redirectUrl,
        platform,
        configured: true,
        mode: 'live',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Not configured';
      res.status(503).json({
        authUrl: '',
        redirectUrl: '',
        platform,
        configured: false,
        mode: 'unconfigured',
        error: message,
      });
    }
  });

  router.post(`/${platform}/connect`, authMiddleware, async (req: AuthRequest, res) => {
    const returnTo = sanitizeOAuthReturnTo(
      (req.body as { returnTo?: string })?.returnTo
    );

    try {
      const result = await OAuthService.startOAuth(req.userId!, platform, returnTo);
      res.json({
        mode: 'live',
        authUrl: result.redirectUrl,
        redirectUrl: result.redirectUrl,
        platform,
      });
    } catch (error: unknown) {
      if (respondIfPlanLimit(res, error)) return;
      const message = error instanceof Error ? error.message : 'Connection failed';
      const missing = OAuthService.getMissingEnvKeys(platform);
      res.status(503).json({
        error:
          message ||
          `Add ${missing.join(' and ')} to ai-social-platform-backend/.env, then restart the backend.`,
        mode: 'unconfigured',
        platform,
      });
    }
  });

  /** Legacy callback path — redirects to guide path handler logic */
  router.get(`/${platform}/callback`, async (req, res) => {
    const { code, state, error } = req.query;
    const q = new URLSearchParams();
    if (error) q.set('error', String(error));
    if (code) q.set('code', String(code));
    if (state) q.set('state', String(state));
    res.redirect(302, `/oauth/callback/${platform}?${q.toString()}`);
  });
});

router.delete('/accounts/:accountId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await OAuthService.disconnectAccount(req.userId!, parseInt(String(req.params.accountId), 10));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

router.get('/accounts', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const accounts = await OAuthService.listAccounts(req.userId!);
    res.json(accounts);
  } catch {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

export default router;
