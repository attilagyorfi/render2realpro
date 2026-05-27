# Deploying Render2Real Pro to Railway

This guide walks through a from-scratch Railway deploy: web service +
Postgres + persistent volume + custom domain + first-run migrations.
Estimated time the first time you do it: **20-30 minutes**.

Railway is the recommended target because it lets you keep the local
filesystem storage model (no rewrite to S3/R2 needed) and includes a
managed Postgres on the same dashboard. Costs roughly **$5-10/month**
for a small-team pilot.

---

## 0. Prerequisites

- A [Railway](https://railway.app) account (free tier is enough to
  start; pay-as-you-go pricing kicks in once your usage exceeds the
  trial credit).
- This repo connected to your GitHub account.
- A working local checkout — verify with `npm install && npm run build`
  before you deploy, so you know the production build itself is green.

---

## 1. Create the Railway project

1. Sign in to Railway and click **New Project** → **Deploy from GitHub repo**.
2. Pick `attilagyorfi/render2realpro` (you may need to grant the
   Railway GitHub app access).
3. Railway will detect Next.js automatically via Nixpacks and start a
   first build. **Cancel** that build — we need to add Postgres and
   set environment variables before it can succeed.

---

## 2. Add the Postgres add-on

1. Inside the Railway project, click **+ New** → **Database** →
   **Add PostgreSQL**.
2. Wait for the Postgres service to provision (~30 seconds).
3. The service exposes a `DATABASE_URL` reference variable. Open the
   web service settings → **Variables** → click **+ New Variable** →
   **Add Reference**, pick the Postgres service, pick the
   `DATABASE_URL` variable. This wires the connection string into the
   web service without you ever copy-pasting it.

---

## 3. Add a persistent volume for storage

The app stores uploads, previews, and generated versions on disk under
`RENDER2REAL_STORAGE_ROOT`. Railway containers are ephemeral by
default, so you need a Volume.

1. Open the **web service** settings → **Volumes** → **+ Create Volume**.
2. Mount path: `/data`
3. Size: 5 GB to start (you can grow it later without downtime).
4. Click **Create**.

---

## 4. Set the required environment variables

Open the web service settings → **Variables**, then add the following.
Values you already have from local development are fine to reuse —
**except** the session secret, which should be a fresh production-only
value.

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | (reference, from step 2) | Already wired |
| `RENDER2REAL_STORAGE_ROOT` | `/data/storage` | Points at the volume mount |
| `RENDER2REAL_SESSION_SECRET` | A fresh 32+ char hex string | Run locally: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` |
| `RENDER2REAL_ACTIVE_PROVIDER` | `fal-controlnet` | Or `mock-local` if you want to demo first |
| `FAL_KEY` | Your Fal.ai dashboard key | Required if active provider is fal-controlnet |
| `NODE_ENV` | `production` | Railway sets this automatically, but be explicit |

Optional tunables you may want to set after a few runs:
`FAL_MODEL`, `FAL_CONTROL_WEIGHT`, `FAL_INFERENCE_STEPS`,
`FAL_GUIDANCE_SCALE` (see `.env.example` for the tuning guide).

**Do NOT set** `PORT` — Railway injects it automatically and
`next start` picks it up.

---

## 5. Set the build & start commands

Railway → web service settings → **Settings**:

- **Build command:** `npm ci && npx prisma generate && npx prisma db push && npm run db:seed && npm run build`
- **Start command:** `npm run start`
- **Healthcheck path:** `/api/health`
- **Healthcheck timeout:** 30 seconds

The `db push` step is safe to leave in the build command for the pilot:
it brings the schema up to whatever the latest `schema.prisma` says,
without producing migration files. Once you have real production data
you care about, switch to `npx prisma migrate deploy` and commit
migration files alongside schema changes.

`db:seed` is idempotent (uses `upsert`) so it's safe to run on every
deploy.

---

## 6. Trigger the deploy

Click **Deploy** on the web service. Watch the logs:

1. `npm ci` installs dependencies (~30-60s).
2. `prisma generate` produces the typed client.
3. `prisma db push` creates the schema in the Postgres instance.
4. `db:seed` inserts the 10 default presets.
5. `next build` produces the production bundle (~60-90s).
6. `next start` boots the server on the Railway-provided `PORT`.
7. Healthcheck at `/api/health` returns 200 — Railway marks the
   service healthy and routes traffic to it.

If anything fails, the **Deploy Logs** tab gives you the stack trace.
Most first-time failures fall into one of three buckets:

- **`RENDER2REAL_SESSION_SECRET must be set...`** — you forgot step 4.
- **Prisma connect timeout** — the Postgres service is still spinning
  up; redeploy in 30 seconds.
- **`fal-controlnet` configured but FAL_KEY missing** — check that the
  key was actually saved on the web service (not on the Postgres
  service).

---

## 7. First-run smoke test

Once Railway shows the service as healthy:

1. Click the auto-generated `*.up.railway.app` URL.
2. `GET /api/health` should return JSON with `ok: true` and the current
   `version` from `package.json`.
3. `GET /api/providers` should return the active provider as
   configured (likely `fal-controlnet`).
4. Register a profile at `/register`, then upload a test render and
   run a generation. Verify the result appears in the comparison view.

---

## 8. Custom domain

1. Web service settings → **Domains** → **+ Generate Domain** for a
   `*.up.railway.app` URL, OR **+ Add Custom Domain** for your own.
2. For a custom domain, Railway will give you a CNAME target — add it
   in your DNS provider. SSL is automatic via Let's Encrypt.
3. After the DNS propagates, that domain serves the same app.

---

## 9. Backups and rollback

**Database backups:**

- Railway Postgres takes automated backups on the Pro tier ($20/mo).
  On the Hobby tier ($5/mo) you should run periodic manual backups:
  `pg_dump` against the public `DATABASE_URL` to a local file or to an
  object-storage bucket.
- Schema changes between deploys are non-destructive thanks to
  `db push`, but **always test a schema change locally first** —
  destructive changes (column drops, type changes) will print a warning
  in the logs and require the `--accept-data-loss` flag, which the
  build command does NOT pass.

**Rolling back a bad deploy:**

- Railway web service → **Deployments** tab → find the last known-good
  deploy → click the `⋯` menu → **Redeploy**.
- This re-runs the same commit's build with the current env-vars,
  which usually fixes "I broke something in env, not in code"
  failures. For "I broke something in code" failures, also revert the
  bad commit in the GitHub repo so the next push doesn't re-deploy the
  same broken build.

---

## 10. Cost expectations

For a small pilot (one company, 1-10 users, ~100 generations/month):

| Item | Monthly cost |
|---|---|
| Railway Hobby plan | $5 |
| Postgres usage | included up to ~1GB |
| Persistent volume (5GB) | included on Hobby |
| Bandwidth | included up to ~100GB |
| Fal.ai generations (~100 × $0.03) | ~$3 |
| **Total** | **~$8/month** |

Heavier usage (1000+ generations) pushes the Fal cost up
proportionally and may require the Pro plan ($20/mo) for the higher
CPU/RAM ceiling.

---

## 11. Future migrations

When you outgrow the local-volume storage model (e.g. you want
multi-region deploys, or the volume hits its size limit), the path
forward is:

1. Add `@aws-sdk/client-s3` and an S3-compatible bucket (Cloudflare R2
   is cheapest — $0.015/GB-month, zero egress).
2. Implement an `S3StorageBackend` next to the existing
   `LocalStorageBackend` in `src/services/storage/`, switch on
   `STORAGE_BACKEND=s3` env var.
3. Run a one-off migration script to copy existing volume contents
   into the bucket.

This is intentionally not done up front to keep the pilot deploy
simple.
