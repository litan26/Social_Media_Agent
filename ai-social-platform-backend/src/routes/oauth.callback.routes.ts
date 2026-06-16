import { Router } from 'express';
import { OAuthService } from '../services/oauth.service.js';
import type { Platform } from '../services/platformOAuth.js';

const router = Router();

/** Guide format: GET /oauth/callback/:platform */
router.get('/:platform', async (req, res) => {
  const platform = String(req.params.platform);
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  let returnTo = '/dashboard';

  if (error) {
    console.warn(`OAuth callback error for ${platform}:`, error);
    res.redirect(`${frontendUrl}/dashboard?error=oauth_denied`);
    return;
  }

  if (!state || !code || !OAuthService.isValidPlatform(platform)) {
    console.warn(`OAuth callback invalid request for ${platform}:`, { state, code, platform });
    res.redirect(`${frontendUrl}/dashboard?error=invalid_state`);
    return;
  }

  try {
    const result = await OAuthService.handleOAuthCallback(
      platform as Platform,
      code as string,
      state as string
    );
    returnTo = result.returnTo;
    console.log(`${platform} OAuth callback succeeded, redirecting to ${frontendUrl}${returnTo}?connected=${platform}`);
    res.redirect(`${frontendUrl}${returnTo}?connected=${platform}`);
  } catch (err) {
    console.error(`${platform} OAuth callback failed:`, err);
    res.redirect(`${frontendUrl}${returnTo}?error=${platform}`);
  }
});

export default router;
