import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { InsightsService } from '../services/insights.service.js';

const router = Router();

router.get('/dashboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = await AnalyticsService.getDashboard(req.userId!);
    res.json(data);
  } catch (error: unknown) {
    console.error('Analytics dashboard failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard';
    res.status(500).json({ error: message });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const postId = req.query.postId ? parseInt(req.query.postId as string, 10) : undefined;
    const data = await AnalyticsService.getAnalytics(req.userId!, postId);
    res.json(data);
  } catch (error: unknown) {
    console.error('Analytics fetch failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics';
    res.status(500).json({ error: message });
  }
});

router.post('/collect/:postId', authMiddleware, async (req: AuthRequest, res) => {
  const postId = String(req.params.postId);
  const { platform } = req.body;

  try {
    await AnalyticsService.collectAnalytics(req.userId!, parseInt(postId, 10), platform);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to collect analytics' });
  }
});

router.get('/insights', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const insights = await InsightsService.generateInsights(req.userId!);
    res.json(insights);
  } catch (error: unknown) {
    console.error('Insights fetch failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate insights';
    res.status(500).json({ error: message });
  }
});

export default router;
