# News Aggregator — Agent Guide

## Project Overview

Full-stack news aggregation platform with AI-assisted editing. Monorepo structure with three main applications:

- **Backend** (`backend/`): Express.js REST API with Prisma ORM
- **Frontend** (`frontend/`): Nuxt 3 SSR/SSG public website
- **Admin** (`admin/`): Vue 3 + Vite admin panel

### Core Features

- RSS feed aggregation with automated fetching (every 15 minutes via Bull queues)
- News categorization by sections (politics, society, sport, culture, economy, etc.)
- Regional news support (single fixed region per deployment)
- AI-assisted editing and fact-checking (OpenAI GPT-4o-mini or z.ai)
- Role-based access control (ADMIN, EDITOR)
- Dynamic menu management (header, footer)
- Static pages CMS
- Image uploads

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Backend | Express.js 4, Prisma 5, Zod validation |
| Frontend Framework | Vue 3.5, Nuxt 3.14 |
| Admin Panel | Vue 3.5, Vite 5, Pinia 2 |
| Styling | TailwindCSS 3.4 |
| Database | PostgreSQL 16 |
| Queue/Cache | Redis 7 (Bull queues) |
| Auth | JWT (jsonwebtoken), bcrypt |
| Rich Text | TipTap editor (@tiptap/vue-3) |
| Icons | @remixicon/vue |

## Project Structure

```
news-aggregator/
├── backend/                    # Express API
│   ├── src/
│   │   ├── server.js          # Entry point, starts scheduler
│   │   ├── app.js             # Express app configuration
│   │   ├── config/            # Configuration (env, prisma client)
│   │   ├── modules/           # Domain modules
│   │   │   ├── auth/          # JWT auth, middleware
│   │   │   ├── news/          # News CRUD (public + admin + AI)
│   │   │   ├── sections/      # Sections CRUD
│   │   │   ├── menu/          # Menu management
│   │   │   ├── pages/         # Static pages
│   │   │   ├── sources/       # RSS sources management
│   │   │   └── upload/        # File uploads
│   │   ├── services/          # AI service (OpenAI/z.ai)
│   │   └── jobs/              # RSS fetcher, Bull queue
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.js            # Default data (users, sections, menus)
│   └── uploads/               # Uploaded images
├── frontend/                   # Nuxt 3 public site
│   ├── pages/                 # File-based routing
│   │   ├── index.vue          # Homepage (top, region, sections)
│   │   ├── section/[slug].vue # Section listing
│   │   ├── news/[id].vue      # Article page
│   │   └── [slug].vue         # Static pages
│   ├── layouts/default.vue    # Header, footer, navigation
│   ├── components/            # Vue components
│   ├── composables/           # useApiBase, useRegion
│   └── nuxt.config.ts         # Nuxt configuration
└── admin/                      # Vue 3 admin panel
    ├── src/
    │   ├── views/             # Page views
    │   ├── stores/auth.ts     # Pinia auth store
    │   ├── router/index.ts    # Vue Router setup
    │   └── api.ts             # Axios API client
    └── vite.config.ts
```

## Database Schema (Prisma)

Key entities:

- **User**: `id, email, passwordHash, role (ADMIN|EDITOR)`
- **NewsItem**: News articles with `status (PENDING|PUBLISHED|REJECTED)`, linked to Source and Section
- **Source**: RSS sources with `url, type, isActive, params (JSON)`
- **Section**: Categories with `slug, title, order, isVisible`
- **Menu/MenuItem**: Hierarchical menus (header, footer)
- **Page**: Static pages with `slug, title, body (HTML)`
- **NewsItemHistory**: Version history snapshots
- **NewsItemFactCheck**: AI fact-check results

## Environment Configuration

### Backend (`backend/.env`)

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/news_aggregator?schema=public"
PORT=3000
JWT_SECRET=change-me-in-production
CORS_ORIGINS=                    # Comma-separated, empty = allow all in dev
REDIS_URL=redis://localhost:6379
AI_PROVIDER=openai               # or "zai"
OPENAI_API_KEY=sk-...
ZAI_API_KEY=

# Optional: S3-compatible storage (MinIO in Docker or AWS S3). If unset, uploads use backend/uploads.
# MinIO (Docker): S3_ENDPOINT=http://minio:9000, S3_BUCKET=news-aggregator, AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY = MINIO_ROOT_USER/MINIO_ROOT_PASSWORD. Set S3_PUBLIC_BASE_URL for browser-accessible image URLs (e.g. http://localhost:9000/news-aggregator).
# AWS S3: set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION; omit S3_ENDPOINT.
# S3_BUCKET=
# S3_REGION=us-east-1
# S3_ENDPOINT=
# S3_PUBLIC_BASE_URL=
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
```

### Frontend (`frontend/.env`)

```bash
NUXT_PUBLIC_API_BASE=http://localhost:3000
NUXT_API_BASE_SERVER=http://backend:3000   # For SSR in Docker
NUXT_PUBLIC_REGION=Иваново                 # Fixed region name
```

### Admin (`admin/.env`)

```bash
VITE_API_BASE_URL=http://localhost:3000
```

## Build and Development Commands

### Local Development

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
npx prisma migrate dev
npx prisma db seed
npm run dev                    # Runs on :3000 with --watch

# Frontend
cd frontend
npm install
npm run dev                    # Runs on :3001

# Admin
cd admin
npm install
npm run dev                    # Runs on :5174
```

### Docker (Recommended)

```bash
# Production
docker compose up -d --build

# Development (with hot-reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# First run migrations and seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed

# Get admin panel port
docker compose port admin 80       # prod
docker compose -f docker-compose.yml -f docker-compose.dev.yml port admin 5174  # dev
```

### Production Build

```bash
# Backend
npm start                      # node src/server.js

# Frontend (SSG)
npm run build                  # Generates .output/public
npm run preview                # Test production build

# Admin
npm run build                  # Generates dist/
```

## API Endpoints

### Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/news` | List news (query: region, section, page, limit) |
| GET | `/api/news/:id` | Get single news item |
| GET | `/api/sections` | List all sections |
| GET | `/api/menus/:key` | Get menu by key (header/footer) |
| GET | `/api/pages/:slug` | Get static page |
| GET | `/uploads/*` | Static files |

### Admin Endpoints (JWT Required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Get JWT token |
| GET/POST | `/api/admin/news/*` | EDITOR+ | News CRUD |
| POST | `/api/admin/news/:id/fact-check` | EDITOR+ | AI fact-check |
| POST | `/api/admin/news/:id/ai-edit` | EDITOR+ | AI edit/rewrite |
| GET/POST/PATCH/DELETE | `/api/admin/sections/*` | ADMIN | Sections CRUD |
| GET/POST/PATCH/DELETE | `/api/admin/menus/*` | ADMIN | Menus CRUD |
| GET/POST/PATCH/DELETE | `/api/admin/pages/*` | ADMIN | Pages CRUD |
| GET/POST/PATCH/DELETE | `/api/admin/sources/*` | ADMIN | RSS sources |
| POST | `/api/admin/upload` | ADMIN | Image upload |

### Default Credentials (from seed)

- **Admin**: `admin@example.com` / `admin123` (full access)
- **Editor**: `editor@example.com` / `editor123` (news only)

## Code Style Guidelines

### JavaScript/TypeScript

- **ES Modules**: All files use `type: "module"` with `.js` or `.ts` extensions
- **Import syntax**: Use `import/export`, no `require/module.exports`
- **Async/await**: Preferred over raw promises
- **Error handling**: Try/catch in async functions; centralized error handler in Express

### Vue 3 / Nuxt 3

- **Composition API**: Use `<script setup lang="ts">` exclusively
- **TypeScript**: All new code should be typed
- **Composables**: Place reusable logic in `composables/` directory
- **Lazy fetching**: Use `lazy: true` for non-blocking layout data

### Backend

- **Route organization**: Split into `*.public.routes.js` and `*.admin.routes.js`
- **Middleware**: `requireAuth`, `requireAdmin`, `requireEditorOrAdmin` for protection
- **Validation**: Use Zod for input validation (to be added)
- **Database**: Use Prisma client from `config/prisma.js`

### Naming Conventions

- Files: `kebab-case.js` for utilities, `PascalCase.vue` for components
- Database columns: `snake_case` (mapped via Prisma `@map`)
- API endpoints: `kebab-case`
- Environment variables: `UPPER_SNAKE_CASE`

## Testing Strategy

**Current state**: No automated tests are configured. Testing is manual:

1. Start all services with Docker
2. Verify API health: `GET /api/health`
3. Test authentication with seeded credentials
4. Verify RSS fetching by creating a source and triggering fetch
5. Test AI features (requires valid API key)

**Recommended additions**:
- Jest or Vitest for unit tests
- Playwright for E2E testing
- Prisma test fixtures for database tests

## Security Considerations

### Critical Requirements for Production

1. **JWT_SECRET**: Must be set to a cryptographically secure random string
2. **CORS_ORIGINS**: Restrict to actual frontend domains
3. **AI API Keys**: Keep secret, never commit to repository
4. **File Uploads**: Currently no size/type restrictions — add validation
5. **Database**: Use strong passwords, restrict network access

### Implemented Security Measures

- Password hashing with bcrypt (10 rounds)
- JWT authentication with role-based access
- CORS configured per environment
- Centralized error handler (no stack traces in production)
- Non-root Docker user

### Known Limitations

- No rate limiting on API endpoints
- No input sanitization on HTML content (TipTap output trusted)
- File upload extension validation not implemented
- No CSRF protection (not needed for JWT bearer auth)

## AI Integration

### Configuration

Set in backend `.env`:
```bash
AI_PROVIDER=openai  # or "zai"
OPENAI_API_KEY=sk-...
```

### Available Actions

1. **Fact Check**: Analyzes news content for factual accuracy
2. **Improve**: Rewrites text for better style and clarity
3. **Shorten**: Condenses text while preserving meaning
4. **Expand**: Adds details to text
5. **Generate Title**: Creates headline from content
6. **Generate Summary**: Creates lead paragraph

### Usage

In admin panel, open news edit page → "Редактирование с помощью ИИ" panel.

## RSS Aggregation

### How It Works

1. Sources configured in admin panel with RSS URL
2. Bull queue runs every 15 minutes via cron
3. Fetches active sources, creates NewsItem with status=PENDING
4. Editors review and publish/reject items

### Queue Configuration

- Queue name: `rss-fetch`
- Repeat: `*/15 * * * *` (every 15 minutes)
- Failed jobs are logged but not retried automatically

## Deployment Checklist

1. Set all environment variables (especially `JWT_SECRET`)
2. Run `prisma migrate deploy` (not `dev`)
3. Run `prisma db seed` for initial data
4. Configure reverse proxy (nginx) for frontend and admin
5. Set up SSL certificates
6. Configure backup for PostgreSQL and uploads
7. Monitor Redis memory usage for queues
8. Set up log aggregation

## Common Issues

### Database Connection Errors

- Verify `DATABASE_URL` format
- Check PostgreSQL is running and accessible
- For Docker: use `postgres` hostname, not `localhost`

### Prisma Binary Issues

- Schema includes `binaryTargets = ["native", "debian-openssl-3.0.x"]` for Docker
- Run `prisma generate` after schema changes

### File Uploads Not Visible

- If S3 is **not** configured: check `backend/uploads/` directory permissions and that the `/uploads` static route is working.
- If S3 **is** configured (MinIO or AWS): images are served from object storage. Set `S3_PUBLIC_BASE_URL` so the frontend can load them (e.g. `http://localhost:9000/news-aggregator` with MinIO port 9000 exposed). Backend does not proxy S3; URLs in responses point to that base.

### S3 / MinIO Not Working

- **Docker**: Ensure the `minio` service is healthy and backend has `S3_ENDPOINT=http://minio:9000`, `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` matching `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`. Bucket is created on first upload.
- **MinIO**: Use `forcePathStyle` (set automatically when `S3_ENDPOINT` is set). For browser access to images, set `S3_PUBLIC_BASE_URL` to the MinIO URL (e.g. `http://localhost:9000/news-aggregator`).

### AI Features Not Working

- Verify `AI_PROVIDER` and corresponding API key
- Check backend logs for API errors
- OpenAI requires valid billing

## Architecture Decisions

1. **Monorepo with npm workspaces**: Shared dependencies at root, but each app has its own `package.json`
2. **Prisma for ORM**: Type-safe database access, migration system
3. **Bull + Redis for queues**: Reliable scheduled RSS fetching
4. **Nuxt 3 SSR**: SEO-friendly, fast initial load
5. **Separate admin app**: Better security, independent deployment
6. **Fixed region**: Simplifies UX, no geolocation needed
