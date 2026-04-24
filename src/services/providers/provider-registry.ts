import { appEnv } from "@/config/env";
import type { ProviderStatusSnapshot } from "@/types/domain";

type ProviderEnvOverride = {
  activeProvider?: string;
  providerApiKey?: string;
  openAiImageModel?: string;
};

const RENDER2REAL_API_URL = process.env.RENDER2REAL_API_URL ?? "http://localhost:8000";

/**
 * Check if the render2real FastAPI microservice is reachable.
 * This is a synchronous check based on env vars only (no network call at registry time).
 */
function isFalConfigured(): boolean {
  // The FAL_KEY is used by the Python microservice, not directly here.
  // We consider it "configured" if the API URL is set and FAL_KEY env var is present.
  return Boolean(process.env.FAL_KEY);
}

export function getProviderStatusSnapshot(
  override?: ProviderEnvOverride
): ProviderStatusSnapshot {
  const activeProvider = override?.activeProvider ?? appEnv.activeProvider;
  const providerApiKey = override?.providerApiKey ?? appEnv.providerApiKey;
  const openAiImageModel = override?.openAiImageModel ?? appEnv.openAiImageModel;
  const falConfigured = isFalConfigured();

  return {
    activeProvider,
    providers: [
      {
        name: "mock-local",
        label: "Mock Local Provider",
        description:
          "Simulates a realism pass, duplicates the source image, and records generation metadata.",
        configured: true,
        supportsRealtimeProgress: true,
        requiresApiKey: false,
        statusMessage: "Ready for local workflow validation.",
      },
      {
        name: "fal-controlnet",
        label: "Fal.ai Flux ControlNet (Architectural Fidelity)",
        description:
          "Uses Fal.ai Flux ControlNet Canny to transform architectural renders into photorealistic images while preserving all structural elements. Includes structural fidelity validation and auto-retry.",
        configured: falConfigured,
        supportsRealtimeProgress: false,
        requiresApiKey: true,
        model: "fal-ai/flux-pro/v1/canny",
        statusMessage: falConfigured
          ? `Ready. API: ${RENDER2REAL_API_URL}`
          : "Missing FAL_KEY. Set FAL_KEY environment variable to enable this provider.",
      },
      {
        name: "openai-image-editing",
        label: "OpenAI Image Editing (Legacy)",
        description:
          "Uses the OpenAI Images edits endpoint. Not recommended for architectural work — use Fal.ai ControlNet instead.",
        configured: Boolean(providerApiKey),
        supportsRealtimeProgress: false,
        requiresApiKey: true,
        model: openAiImageModel,
        statusMessage: providerApiKey
          ? `Ready with model ${openAiImageModel}. (Legacy — not recommended for architecture)`
          : "Missing API key. OpenAI image editing is unavailable until OPENAI_API_KEY is set.",
      },
    ],
  };
}

export function getActiveProviderName(snapshot = getProviderStatusSnapshot()) {
  const requestedProvider = snapshot.providers.find(
    (provider) => provider.name === snapshot.activeProvider
  );

  if (requestedProvider?.configured) {
    return requestedProvider.name;
  }

  return "mock-local";
}
