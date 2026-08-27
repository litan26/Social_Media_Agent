# AI Social Platform — User Flow (Implementation Map)

This document maps each step in the user flow diagram to the implemented feature.

## 01 — Onboarding

| Flow step | Status | Where |
|-----------|--------|--------|
| Visit platform | Done | `/` LandingPage |
| New user? Sign up | Done | `/register` → JWT |
| Returning? Log in | Done | `/login` → JWT |
| JWT issued | Done | `AuthService`, `Authorization: Bearer` |

## 02 — Account setup

| Flow step | Status | Where |
|-----------|--------|--------|
| Choose plan (Free/Pro/Team) | Done | `/onboarding/plan`, `PUT /api/auth/plan` |
| Connect social accounts | Done | `/onboarding/connect`, `GET /api/oauth/:platform/auth` |
| All 7 platforms | Done | Twitter live OAuth; others demo mode without API keys |

## 03 — Identity & multi-tenancy

| Flow step | Status | Where |
|-----------|--------|--------|
| Per-user isolation | Done | MySQL `user_id` on all tables + app queries |
| User A / B / C | Done | JWT `userId` scopes every request |

## 04 — AI content creation

| Flow step | Status | Where |
|-----------|--------|--------|
| Main dashboard | Done | `/dashboard` |
| New post + platforms | Done | `/posts/new` |
| Topic & tone | Done | PostForm + Claude prompt |
| Backend context assembly | Done | `ClaudeService` |
| Claude API → 3 variants | Done | `POST /api/posts/generate-variants` |
| Daily plan limits | Done | Enforced in `ClaudeService` |

## 05 — Review, schedule & publish

| Flow step | Status | Where |
|-----------|--------|--------|
| Select & edit variant | Done | VariantSelector + textarea |
| Publish now | Done | `POST /api/posts/:id/publish` |
| Schedule | Calendar only | `POST /api/posts/:id/schedule` records the slot; publishing is manual |
| Queue worker | Removed | No job queue — use Publish Now at the scheduled time |

## 06 — Analytics & loop

| Flow step | Status | Where |
|-----------|--------|--------|
| Analytics collected | Done | `AnalyticsService` + cron every 12h |
| Token refresh | Done | `tokenRefreshWorker` every 6h |
| AI insights | Done | `GET /api/analytics/insights` |
| Update preferences | Done | `user_preferences` table |
| Feedback loop | Done | Insights → next Claude prompt |
| Back to dashboard | Done | Navigation + loop in flow diagram |

## View the diagram

- In app: http://localhost:5173/flow
- Static file: `ai-social-platform-frontend/public/user-flow.html`

## Run checklist

```bash
cd ai-social-platform-backend && npm run db:migrate
cd ai-social-platform-backend && npm run dev
cd ai-social-platform-frontend && npm run dev
```

Set `ANTHROPIC_API_KEY` in backend `.env` for live AI generation.
