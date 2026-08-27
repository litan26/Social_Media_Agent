# AI Social Platform

Full-stack AI-powered social media management platform.

## Features

- Connect social accounts (Twitter/X, Instagram, LinkedIn, Facebook, TikTok, Pinterest, YouTube)
- Generate post variants with **Anthropic Claude**
- Publish immediately or schedule via **BullMQ + Redis**
- Real-time analytics and AI-driven insights
- **MySQL 8** (`AI_Socialmedia`) with application-level user isolation

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18+, TypeScript, Tailwind CSS, Zustand, React Router |
| Backend | Node.js, Express, TypeScript, MySQL, Redis, BullMQ |
| AI | Anthropic Claude (claude-sonnet-4) |
| Auth | JWT + OAuth 2.0 |

## Project Folders

| Folder | Purpose |
|--------|---------|
| `ai-social-platform-frontend/` | Website (React UI) — see [WEBSITE-STRUCTURE.md](ai-social-platform-frontend/WEBSITE-STRUCTURE.md) |
| `ai-social-platform-backend/` | API server (Express + MySQL + Redis) |
| `docs/` | Setup guides and documentation |

## Quick Start

See [docs/SETUP.md](docs/SETUP.md) for full setup instructions.

```bash
# Terminal 1 — Database
cd ai-social-platform-backend && docker compose up -d

# Terminal 2 — API + UI
npm run dev
```

## License

MIT
