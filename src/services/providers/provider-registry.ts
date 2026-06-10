import { appEnv } from "@/config/env";
import type { ProviderStatusSnapshot } from "@/types/domain";

type ProviderEnvOverride = {
  activeProvider?: string;
  providerApiKey?: string;
  openAiImageModel?: string;
};

const FAL_MODEL = process.env.FAL_MODEL ?? "fal-ai/flux-general/image-to-image";

/**
 * The Fal provider now talks to Fal.ai directly via @fal-ai/client, so the
 * only thing that decides "is it ready" is whether we have a FAL_KEY.
 * No external Python microservice is involved any more.
 */
function isFalConfigured(): boolean {
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
        model: FAL_MODEL,
        statusMessage: falConfigured
          ? `Ready. Direct Fal.ai integration, model: ${FAL_MODEL}.`
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
