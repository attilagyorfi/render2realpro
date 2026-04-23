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
  providerApiKey:
    process.env.OPENAI_API_KEY ?? process.env.RENDER2REAL_PROVIDER_API_KEY ?? "",
  openAiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
} as const;
