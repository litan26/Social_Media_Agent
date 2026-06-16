# Website Folder Structure

The website lives in `ai-social-platform-frontend/`. Use this layout when adding pages or components.

```
ai-social-platform-frontend/
├── public/                 # Static assets (favicon, etc.)
├── src/
│   ├── routes/             # Route definitions
│   │   └── AppRoutes.tsx   # All URL → page mappings
│   ├── pages/
│   │   ├── marketing/      # Public site (landing, flow)
│   │   ├── auth/           # Sign in, sign up, plan selection
│   │   ├── app/            # Logged-in workspace (dashboard, posts, settings)
│   │   ├── admin/          # Superadmin pages
│   │   └── onboarding/     # Optional onboarding steps
│   ├── components/
│   │   ├── Layout/         # App shell, sidebar, header, nav
│   │   ├── Auth/           # Login/register forms, guards
│   │   ├── OAuth/          # Social account connection UI
│   │   ├── Post/           # Post creation & cards
│   │   ├── Analytics/      # Charts & metrics
│   │   ├── Social/         # Platform selectors
│   │   └── ui/             # Shared UI (buttons, icons, shells)
│   ├── hooks/              # Data-fetching hooks
│   ├── store/              # Zustand state
│   ├── services/           # API client
│   ├── types/              # TypeScript types
│   ├── constants/          # Shared constants (navigation, platforms, plans)
│   ├── lib/                # Small utilities (registration draft, etc.)
│   └── assets/             # Images bundled with the app
├── index.html
├── vite.config.ts
└── package.json
```

## Where to add new pages

| Page type | Folder | Example route |
|-----------|--------|---------------|
| Marketing / public | `pages/marketing/` | `/`, `/about` |
| Login / register | `pages/auth/` | `/login`, `/register` |
| User workspace | `pages/app/` | `/dashboard`, `/posts/new` |
| Admin | `pages/admin/` | `/admin/users` |

After adding a page, register the route in `src/routes/AppRoutes.tsx`.

## Related projects

| Folder | Purpose |
|--------|---------|
| `ai-social-platform-backend/` | API, database, OAuth callbacks |
| `docs/` | Setup and project documentation |
