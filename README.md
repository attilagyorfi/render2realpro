# FormaVeris

FormaVeris is an architectural image workflow for **M Mérnöki Iroda Kft.** It helps architects, engineers, and visualization specialists upload architectural renders and run a realism-enhancement workflow that preserves the original composition exactly. (The GitHub repo still lives at `render2realpro` — that's the project's working repo name; the shipping product is FormaVeris.)

## Core rule

**No redesign. Only realism enhancement.**

The app is structured so prompt generation, presets, provider boundaries, and UI messaging all preserve:

- exact camera angle
- exact perspective
- exact building geometry
- exact proportions
- exact object placement
- exact roads, rails, vegetation, loading docks, and vehicles
- exact scene layout

## What's in the box

- Next.js 16 + TypeScript application shell with React 19 and Turbopack
- Prisma + PostgreSQL metadata storage (SQLite no longer supported)
- Local filesystem asset storage with API-backed file serving
- Project creation and dashboard
- Multi-file render upload with validation
- Main workspace with:
  - left asset/version rail (drag-to-reorder)
  - center preview/crop/compare canvas
  - right preset/prompt/settings panel
  - bottom queue/progress strip
- 10 default realism presets
- Modular prompt engine with immutable preservation rules
- Three AI provider adapters behind a single interface:
  - **mock-local** — sharp-based deterministic pipeline (contrast, saturation, sharpen, vignette) for local UI demos without an AI key
  - **fal-controlnet** — direct Fal.ai Flux ControlNet Canny integration (recommended)
  - **openai-image-editing** — legacy OpenAI gpt-image-1 (not recommended for architectural fidelity)
- Per-user accounts with bcrypt-hashed passwords and HMAC-signed session cookies
- Public share links with optional expiry and view counter
- Before/after comparison modes
- PNG/JPG/WEBP export endpoint
- Provider management, settings, and history pages

## Tech stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS, shadcn/ui, Radix, Framer Motion
- Zustand, React Query, React Hook Form, Zod
- Prisma ORM + PostgreSQL
- sharp for local image processing
- @fal-ai/client for the primary AI provider
- bcryptjs for password hashing
- Vitest for unit tests
- GitHub Actions for CI (lint + typecheck + test on every push)

## Local setup

### Prerequisites

- [Node.js 22+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the local Postgres)
- [Git](https://git-scm.com)

### Steps

1. **Clone and install dependencies**

   ```bash
   git clone https://github.com/attilagyorfi/render2realpro
   cd render2realpro
   npm install
   ```

2. **Start Postgres locally via Docker**

   ```bash
   docker compose up -d
   ```

   This boots `postgres:16-alpine` on `localhost:5433` (mapped from the
   container's 5432, so it doesn't clash with a native Postgres install)
   with the credentials that `.env.example` expects. The data lives in
   the `render2real_pgdata` named volume and survives
   `docker compose down`. To wipe everything: `docker compose down -v`.

   > **If `prisma db push` says `authentication failed`**: the volume
   > was created with a different password. The `POSTGRES_PASSWORD` env
   > var is only applied to an empty volume — once data exists, it's
   > ignored. Reset:
   > ```bash
   > docker compose down -v && docker compose up -d
   > npm run db:push && npm run db:seed
   > ```

3. **Create your local `.env`**

   ```bash
   # Windows CMD
   copy .env.example .env

   # macOS / Linux
   cp .env.example .env
   ```

   Edit `.env` and set at minimum:
   - `RENDER2REAL_SESSION_SECRET` — generate one with
     `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
   - `FAL_KEY` and `RENDER2REAL_ACTIVE_PROVIDER="fal-controlnet"` if you
     want real AI generation. Otherwise leave the active provider on
     `mock-local`.

4. **Generate the Prisma client and push the schema**

   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Seed the default presets**

   ```bash
   npm run db:seed
   ```

6. **Start the dev server**

   ```bash
   npm run dev
   ```

   `npm run dev` uses Turbopack (the Next.js 16 default). If you hit a
   stale dev cache after editing a `useState` (e.g. a `ReferenceError`
   for a freshly added variable), clear `.next` and restart:

   ```bash
   npm run dev:clean
   ```

   A webpack-based fallback is still available if Turbopack misbehaves
   on your environment:

   ```bash
   npm run dev:webpack
   ```

7. **Open the app**

   Visit [http://localhost:3000](http://localhost:3000), register a
   profile, then start a new project from `/app`.

### Migrating from an old SQLite dev.db

If you previously ran an older revision of this project on SQLite, the
data does not port over to Postgres automatically — you'll need to
register a fresh profile and recreate projects. The legacy
`prisma/dev.db` file is no longer used and can be deleted.

If you happened to register profiles in the legacy JSON profile store
(`storage/system/profiles.json`), the
`npm run db:migrate-profiles` script will lift those into the new User
table after the schema is in place.

## Production deployment

See [`DEPLOY.md`](./DEPLOY.md) for a step-by-step Railway deploy guide
(Postgres add-on, persistent volume for storage, env-var checklist,
custom-domain hookup, rollback procedure).

## Key routes

- `/` landing page
- `/login`, `/register` profile auth
- `/app` dashboard and project list
- `/app/projects/[projectId]` main workspace
- `/app/providers` provider management
- `/app/history` generation log history
- `/app/settings` local environment guidance
- `/share/[token]` public share view (read-only, no auth)
- `/api/health` liveness probe (200 OK + version)

## Storage model

- PostgreSQL stores metadata for users, projects, assets, versions, presets, and logs.
- Binary files (uploads, previews, generated versions) are stored under `RENDER2REAL_STORAGE_ROOT` on the local filesystem (or a mounted persistent volume in production).
- Files are served through `/api/files/...` so the UI is not coupled directly to disk paths, and the route enforces a path-traversal check against the storage root.

## Provider behaviour

- **mock-local** runs a deterministic sharp pipeline (mild contrast + saturation + sharpen + radial vignette) on the source image so the workspace can be demoed end-to-end without an AI key. Output is visibly different from the input but composition-preserving.
- **fal-controlnet** uploads the source to Fal storage, runs Flux ControlNet Canny server-side (with a tunable conditioning scale, defaults to architectural-fidelity settings), and stores the returned image locally. All tunables (`FAL_MODEL`, `FAL_CONTROL_WEIGHT`, `FAL_INFERENCE_STEPS`, `FAL_GUIDANCE_SCALE`) are overridable in `.env`.
- **openai-image-editing** is a legacy path kept for fallback; not recommended for architectural fidelity because OpenAI's image-edit endpoint has no ControlNet equivalent.

## Available presets

1. Industrial Exterior Realism
2. Commercial Architecture Realism
3. Residential Exterior Realism
4. Warm Daylight Realism
5. Neutral Editorial Realism
6. Strict Geometry Preservation
7. High-End Architectural Photography
8. Competition Presentation Quality
9. Industrial Weathered Materials
10. Minimal Clean Marketing Style

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Turbopack dev server on http://localhost:3000 |
| `npm run dev:clean` | Clear `.next` cache then start dev |
| `npm run dev:webpack` | Fallback webpack dev server |
| `npm run clean` | Remove `.next` only |
| `npm run build` | Production Next.js build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest with coverage |
| `npm run test:watch` | Vitest watch mode |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:push` | Sync the schema to the DB without a migration file |
| `npm run db:seed` | Insert the 10 default presets |
| `npm run db:migrate-profiles` | One-shot import of legacy JSON profiles into the User table |

## Known limitations

- Texture-targeting / inpainting feature still uses the legacy `RENDER2REAL_API_URL` Python service path; the main realism pass no longer does. Porting texture-targeting to direct Fal is a future sprint.
- No job queue yet — concurrent generation requests against the same asset can race.
- No orphan-cleanup for generation logs whose generation failed mid-flight.
- Export does not yet write a manifest back into the project database.

## Future-ready seams

- `src/services/providers` for additional AI integrations
- `src/services/storage` for cloud-backed storage (S3 / R2 / Vercel Blob)
- `src/services/export` for richer export presets
- `src/store` and workspace editor state for mask/local-edit tools
- Tauri packaging for a desktop distribution later, without rewriting the app domain logic
