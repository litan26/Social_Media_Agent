# AI Social Platform — Setup Guide

## Prerequisites

- Node.js 20+
- Docker Desktop (for MySQL + Redis)
- Anthropic API key
- OAuth credentials for platforms you want to connect

## Project Structure

```
d:\agent\
├── ai-social-platform-backend/   # Express API
├── ai-social-platform-frontend/  # React SPA
└── docs/
```

## 1. Start Database & Redis

```bash
cd ai-social-platform-backend
docker compose up -d
```

Migrations run automatically from `src/db/migrations/` on first MySQL start (database: **AI_Socialmedia**).

## 2. Configure Backend

```bash
cd ai-social-platform-backend
cp .env.example .env
# Edit .env — set JWT_SECRET, ENCRYPTION_KEY, ANTHROPIC_API_KEY, OAuth keys
npm run dev
```

API: http://localhost:3000

## 3. Configure Frontend

```bash
cd ai-social-platform-frontend
cp .env.example .env
npm run dev
```

App: http://localhost:5173

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| POST | `/api/posts/generate-variants` | Claude AI variants |
| PUT | `/api/posts/:id` | Update post content |
| POST | `/api/posts/:id/publish` | Publish now |
| POST | `/api/posts/:id/schedule` | Schedule via BullMQ |
| GET | `/api/posts` | List posts |
| GET | `/api/oauth/twitter/auth` | Twitter OAuth URL |
| GET | `/api/analytics` | Analytics data |
| GET | `/api/analytics/insights` | AI insights |

## Deployment

- **Frontend**: Vercel — set `VITE_API_URL`
- **Backend**: Railway/Render — set all `.env` variables
- **Database**: Managed MySQL (`AI_Socialmedia`)
- **Redis**: Managed Redis for BullMQ workers
