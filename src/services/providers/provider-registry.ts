import { appEnv } from "@/config/env";
import type { ProviderStatusSnapshot } from "@/types/domain";

type ProviderEnvOverride = {
  activeProvider?: string;
  providerApiKey?: string;
  openAiImageModel?: string;
};

export function getProviderStatusSnapshot(
  override?: ProviderEnvOverride
): ProviderStatusSnapshot {
  const activeProvider = override?.activeProvider ?? appEnv.activeProvider;
  const providerApiKey = override?.providerApiKey ?? appEnv.providerApiKey;
  const openAiImageModel = override?.openAiImageModel ?? appEnv.openAiImageModel;

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
        name: "openai-image-editing",
        label: "OpenAI Image Editing",
        description:
          "Uses the OpenAI Images edits endpoint to create a realism-enhanced version while preserving composition.",
        configured: Boolean(providerApiKey),
        supportsRealtimeProgress: false,
        requiresApiKey: true,
        model: openAiImageModel,
        statusMessage: providerApiKey
          ? `Ready with model ${openAiImageModel}.`
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
