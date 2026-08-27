# AI Social Platform — User Flow

This document maps the implemented app to the full user flow diagram.

## Flow phases (implemented)

| Phase | Steps | Routes / APIs |
|-------|--------|----------------|
| **01 Onboarding** | Visit → Sign up / Login → JWT | `/`, `/register`, `/login`, `POST /api/auth/*` |
| **02 Account setup** | Choose plan → Connect 7 platforms | `/onboarding/plan`, `/onboarding/connect`, `PUT /api/auth/plan`, `/api/oauth/*` |
| **03 Multi-tenancy** | JWT `user_id` on every request | `authMiddleware`, all queries filter by `user_id` (MySQL `AI_Socialmedia`) |
| **04 AI creation** | Dashboard → New post → Topic/tone → Claude → 3 variants | `/dashboard`, `/posts/new`, `POST /api/posts/generate-variants` |
| **05 Publish** | Edit → Publish now OR Schedule (BullMQ) | `POST publish`, `POST schedule`, Redis worker |
| **06 Analytics loop** | Collect metrics → Insights → Update preferences → Dashboard | `/analytics`, cron workers, `GET /api/analytics/insights` |

## Onboarding path (new users)

1. Register → `/onboarding/plan`
2. Profile (industry, business, tone) → `/onboarding/profile`
3. Connect social accounts → `/onboarding/connect`
4. Dashboard → `/dashboard`

## Background jobs

- **Token refresh** — every 6 hours (`tokenRefreshWorker.ts`)
- **Analytics collection** — every 12 hours (`analyticsWorker.ts`)
- **Scheduled publish** — removed; scheduled posts are saved to the calendar and published manually via Publish Now

## Notes

- **MySQL** replaces PostgreSQL RLS; isolation is enforced in application queries with `user_id`.
- Platforms without API keys in `.env` use **demo connect** for development.
- **Twitter** uses live OAuth when `TWITTER_CLIENT_ID` is set.
- Start Redis for scheduled posts: `docker compose up -d` or local Redis on port 6379.

## Commands

```bash
cd ai-social-platform-backend
npm run db:migrate
npm run dev

cd ai-social-platform-frontend
npm run dev
```
