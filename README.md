# Render2Real Pro

Render2Real Pro is a local-first architectural image workflow for **M Merneki Iroda Kft.** It helps architects, engineers, and visualization specialists upload architectural renders and run a realism-enhancement workflow that preserves the original composition exactly.

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

## What phase 1 includes

- Next.js 16 + TypeScript application shell
- Prisma + SQLite local metadata storage
- Local filesystem asset storage with API-backed file serving
- Project creation and dashboard
- Multi-file render upload with validation
- Main workspace with:
  - left asset/version rail
  - center preview/crop/compare canvas
  - right preset/prompt/settings panel
  - bottom queue/progress strip
- 10 default realism presets
- Modular prompt engine with immutable preservation rules
- Mock provider pipeline that duplicates the source image as the processed output
- Before/after comparison modes
- PNG/JPG/WEBP export endpoint
- Provider management, settings, and history pages

## Tech stack

- Next.js 16
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- React Query
- Framer Motion
- Prisma ORM
- SQLite
- Zod
- React Hook Form
- react-dropzone
- react-easy-crop

## Local setup

1. Install dependencies

```bash
npm install
```

2. Confirm local environment values

The repository includes `.env.example` and a local development `.env` with:

```env
DATABASE_URL="file:./dev.db"
RENDER2REAL_STORAGE_ROOT="./storage"
RENDER2REAL_ACTIVE_PROVIDER="mock-local"
RENDER2REAL_PROVIDER_API_KEY=""
```

3. Generate Prisma client

```bash
npm run db:generate
```

4. Push the SQLite schema

```bash
npm run db:push
```

5. Seed the default presets

```bash
npm run db:seed
```

6. Start development

```bash
npm run dev
```

This project defaults to the webpack dev server for a more stable local development experience on this Windows setup. If you explicitly want the Turbopack dev server, run:

```bash
npm run dev:turbo
```

7. Open the app

Visit [http://localhost:3000](http://localhost:3000)

## Key routes

- `/` dashboard and project creation
- `/projects/[projectId]` main workspace
- `/providers` provider management
- `/history` generation log history
- `/settings` local environment guidance

## Storage model

- SQLite stores metadata for projects, assets, versions, presets, and logs.
- Binary files are stored on the local filesystem under `RENDER2REAL_STORAGE_ROOT`.
- Files are served through `/api/files/...` so the UI is not coupled directly to disk paths.

## Mock provider behavior

Phase 1 uses a mock provider instead of a real AI image-editing backend. The mock service:

- simulates processing delay
- records provider metadata
- creates generation logs
- duplicates the uploaded source image into a new generated version

This keeps the workflow and architecture production-ready without requiring a live external provider.

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

## Known phase-1 limitations

- Authentication is a placeholder only.
- Local masking tools and semantic quick-selection tools are deferred.
- The mock provider does not visually modify the image yet.
- Export currently triggers a generated download from the selected version rather than writing an export manifest back into the project database.

## Future-ready seams

The codebase is already split so later work can extend it cleanly:

- `src/services/providers` for real AI integrations
- `src/services/storage` for cloud or desktop-backed storage
- `src/services/export` for richer export presets
- `src/store` and workspace editor state for mask/local-edit tools
- Tauri packaging in a later phase without rewriting the app domain logic
