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
  // RENDER2REAL_PROVIDER_API_KEY takes priority so the system-level OPENAI_API_KEY
  // (which may be a Manus proxy key) does not override the project's own key.
  providerApiKey:
    process.env.RENDER2REAL_PROVIDER_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  openAiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
  // render2real-api FastAPI microservice URL
  render2realApiUrl: process.env.RENDER2REAL_API_URL ?? "http://localhost:8000",
  // Fal.ai key (used by the Python microservice; exposed here for status checks)
  falKey: process.env.FAL_KEY ?? "",
  // HMAC secret for signed session cookies; lazy so a misconfigured prod
  // build fails on the first cookie verify rather than on module load.
  get sessionSecret(): string {
    return resolveSessionSecret();
  },
  isProduction,
} as const;
