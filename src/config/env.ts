import path from "node:path";

const fallbackStorageRoot = path.join(process.cwd(), "storage");
const configuredStorageRoot = process.env.RENDER2REAL_STORAGE_ROOT
  ? path.resolve(
      /* turbopackIgnore: true */ process.cwd(),
      process.env.RENDER2REAL_STORAGE_ROOT
    )
  : fallbackStorageRoot;

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
} as const;
