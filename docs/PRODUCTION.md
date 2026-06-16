# Production hardening

## Rate limiting

Hot routes are limited **per `user_id` from JWT** (not IP):

| Route | Limit |
|-------|-------|
| `POST /api/generate` | 10 requests / minute |
| `POST /api/posts/publish-now` | 60 requests / hour |

**Production:** set Upstash Redis REST credentials:

```env
UPSTASH_REDIS_REST_URL=https://....upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

**Local dev:** falls back to `REDIS_URL` (Docker Redis) with the same limits.

## phpMyAdmin

Never expose phpMyAdmin in production. Local dev only:

```bash
cd ai-social-platform-backend
docker compose --profile dev up
# phpMyAdmin → http://localhost:8080
```

In production use MySQL Workbench over SSH, or your host's SQL console (PlanetScale, Railway, etc.).

## Sentry

**API** (`ai-social-platform-backend/.env`):

```env
SENTRY_DSN=https://...@sentry.io/...
```

**Frontend** (`ai-social-platform-frontend/.env`):

```env
VITE_SENTRY_DSN=https://...@sentry.io/...
```

Errors are reported from the API error middleware and uncaught frontend exceptions.

## MySQL slow query log

On the MySQL server (not in app code):

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
```

Verify indexes:

```sql
SHOW INDEX FROM posts;
SHOW INDEX FROM scheduled_posts;
SHOW INDEX FROM post_analytics;
```

Migration `009_production_indexes.sql` adds composite indexes on `user_id` + common filter columns.

## E2E tests

```bash
cd e2e
npm install
npx playwright install chromium
npm test
```

CI runs Playwright against a test MySQL database — see `.github/workflows/ci.yml`.
