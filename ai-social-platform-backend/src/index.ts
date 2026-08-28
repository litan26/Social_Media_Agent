import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import postsRoutes from './routes/posts.routes.js';
import generateRoutes from './routes/generate.routes.js';
import oauthRoutes from './routes/oauth.routes.js';
import oauthCallbackRoutes from './routes/oauth.callback.routes.js';
import accountsRoutes from './routes/accounts.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import webhookRoutes from './routes/webhooks.routes.js';
import trendsRoutes from './routes/trends.routes.js';
import suggestionsRoutes from './routes/suggestions.routes.js';
import creativeRoutes from './routes/creative.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import paymentWebhookRoutes from './routes/payment.webhook.routes.js';
import pptRoutes from './routes/ppt.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import {
  LOCAL_PUBLIC_PREFIX,
  LOCAL_STORAGE_ROOT,
} from './services/imageStorage.service.js';
import { initSentry } from './instrument.js';
import './workers/tokenRefreshWorker.js';
import './workers/insightsWorker.js';

dotenv.config();
initSentry();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /\.vercel\.app$/.test(origin) ||
        (process.env.FRONTEND_URL && origin.startsWith(process.env.FRONTEND_URL.replace(/\/$/, '')))
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }), paymentWebhookRoutes);
app.use(express.json());

// Generated creative images on local disk. helmet() defaults CORP to
// same-origin, which would block the frontend on another port from loading
// these, so relax it for static assets only.
app.use(
  LOCAL_PUBLIC_PREFIX,
  express.static(LOCAL_STORAGE_ROOT, {
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-social-platform-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/generate', generateRoutes);
app.use('/oauth/callback', oauthCallbackRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/creative', creativeRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/ppt', pptRoutes);

app.use(errorMiddleware);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`AI Social Platform API running on http://localhost:${PORT}`);
  });
}

export default app;
