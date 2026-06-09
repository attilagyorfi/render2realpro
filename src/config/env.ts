import { randomBytes } from "node:crypto";
import path from "node:path";

const fallbackStorageRoot = path.join(process.cwd(), "storage");
const configuredStorageRoot = process.env.RENDER2REAL_STORAGE_ROOT
  ? path.resolve(
      /* turbopackIgnore: true */ process.cwd(),
      process.env.RENDER2REAL_STORAGE_ROOT
    )
  : fallbackStorageRoot;

const isProduction = process.env.NODE_ENV === "production";

/**
 * Resolve the session HMAC secret. In production it is required and the
 * process should refuse to start without it. In development we generate a
 * deterministic-per-process placeholder and warn loudly, so the dev server
 * keeps working but every restart invalidates outstanding cookies (which
 * is the desired behaviour for an unconfigured local environment).
 */
function resolveSessionSecret(): string {
  const configured = process.env.RENDER2REAL_SESSION_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;

  if (isProduction) {
    throw new Error(
      "RENDER2REAL_SESSION_SECRET must be set to a value of at least 32 characters in production."
    );
  }

  // Dev fallback: per-process random secret so restart invalidates sessions.
  // Logged once so the warning is visible during development.
  console.warn(
    "[appEnv] RENDER2REAL_SESSION_SECRET is missing or too short; using an ephemeral dev secret. Sessions invalidate on server restart."
  );
  return randomBytes(32).toString("hex");
}

export const appEnv = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  storageRoot: configuredStorageRoot,
  activeProvider: process.env.RENDER2REAL_ACTIVE_PROVIDER ?? "mock-local",
  // RENDER2REAL_PROVIDER_API_KEY takes priority over OPENAI_API_KEY so that
  // a system-level OpenAI key set elsewhere on the machine cannot
  // accidentally hijack this project's intended key.
  providerApiKey:
    process.env.RENDER2REAL_PROVIDER_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  openAiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
  // Optional URL of the legacy render2real-api FastAPI service. Only the
  // texture-targeting inpainting feature still references it; the main
  // realism-pass pipeline now talks to Fal.ai directly via @fal-ai/client.
  render2realApiUrl: process.env.RENDER2REAL_API_URL ?? "http://localhost:8000",
  // Fal.ai API key, consumed directly by fal-provider.ts.
  falKey: process.env.FAL_KEY ?? "",
  // Public origin used to build absolute URLs inside transactional
  // emails (e.g. the approval link). Falls back to https://formaveris.hu
  // for production safety; in development, override to http://localhost:3000.
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://formaveris.hu",
  // Resend API key. When unset, the email service drops to a console
  // fallback that prints the email body + any links to stdout, so the
  // registration flow remains testable without a provider.
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  // Address used as the "From" header on every transactional email.
  // Should be on a verified Resend domain in production.
  emailFrom: process.env.EMAIL_FROM ?? "FormaVeris <noreply@formaveris.hu>",
  // Where the registration notifications go. Defaults match the
  // platform operator (see prisma/seed.js — the seeded admin user
  // uses the same address).
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL ?? "info@g2amarketing.hu",
  // HMAC secret for signed session cookies; lazy so a misconfigured prod
  // build fails on the first cookie verify rather than on module load.
  get sessionSecret(): string {
    return resolveSessionSecret();
  },
  isProduction,
} as const;
