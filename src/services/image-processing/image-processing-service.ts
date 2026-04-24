import { GenerationLogStatus, ImageVersionType } from "@prisma/client";

import { buildPromptDocument } from "@/features/prompt-engine/build-prompt";
import { prisma } from "@/lib/prisma";
import { MockLocalProvider } from "@/services/providers/mock-provider";
import { OpenAiImageEditingProvider } from "@/services/providers/openai-provider";
import { FalAiProvider } from "@/services/providers/fal-provider";
import { getActiveProviderName } from "@/services/providers/provider-registry";
import { mergePresetSettings } from "@/config/presets";
import type { GenerationRequestPayload } from "@/types/domain";
import type { ProviderAdapter } from "@/services/providers/provider-adapter";

const mockProvider = new MockLocalProvider();
const openAiProvider = new OpenAiImageEditingProvider();
const falProvider = new FalAiProvider();

function resolveProvider(providerOverride?: string): ProviderAdapter {
  // Explicit override
  if (providerOverride === mockProvider.name) return mockProvider;
  if (providerOverride === openAiProvider.name) return openAiProvider;
  if (providerOverride === falProvider.name) return falProvider;

  // Auto-select based on active provider setting
  const activeProvider = getActiveProviderName();
  if (activeProvider === falProvider.name) return falProvider;
  if (activeProvider === openAiProvider.name) return openAiProvider;
  return mockProvider;
}

export async function createGenerationJob(input: GenerationRequestPayload) {
  const imageAsset = await prisma.imageAsset.findUnique({
    where: { id: input.imageAssetId },
    include: {
      project: true,
      imageVersions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!imageAsset) {
    throw new Error("Image asset not found.");
  }

  // Resolve preset — required for preset mode, optional for custom prompt mode
  const preset = input.presetId
    ? await prisma.preset.findUnique({ where: { id: input.presetId } })
    : await prisma.preset.findFirst({ orderBy: { createdAt: "asc" } });

  if (!preset) {
    throw new Error("No preset available. Please seed the database.");
  }

  const parsedSettings = JSON.parse(preset.settingsJson);
  const mergedSettings = mergePresetSettings(parsedSettings, input.settingsOverride);
  const provider = resolveProvider(input.providerOverride);

  // Custom prompt mode: use the user's prompt as the primary directive
  const effectiveDirectives = input.customPrompt
    ? [input.customPrompt, ...(input.customDirectives ?? [])]
    : input.customDirectives;

  const promptDocument = buildPromptDocument({
    imageName: imageAsset.originalFileName,
    presetName: input.presetId ? preset.name : "custom",
    settings: mergedSettings,
    customDirectives: effectiveDirectives,
  });

  const generationLog = await prisma.generationLog.create({
    data: {
      imageAssetId: imageAsset.id,
      providerName: provider.name,
      promptVersion: promptDocument.title,
      settingsJson: JSON.stringify(mergedSettings),
      success: false,
      processingTime: 0,
      status: GenerationLogStatus.queued,
    },
  });

  await prisma.imageAsset.update({
    where: { id: imageAsset.id },
    data: { status: "processing" },
  });

  try {
    await prisma.generationLog.update({
      where: { id: generationLog.id },
      data: { status: GenerationLogStatus.processing },
    });

    const result = await provider.generateRealismPass({
      projectId: imageAsset.projectId,
      sourcePath: imageAsset.storedFilePath,
      sourceWidth: imageAsset.width ?? undefined,
      sourceHeight: imageAsset.height ?? undefined,
      prompt: {
        imageName: imageAsset.originalFileName,
        presetName: input.presetId ? preset.name : "custom",
        settings: mergedSettings,
        customDirectives: effectiveDirectives,
      },
    });

    const imageVersion = await prisma.imageVersion.create({
      data: {
        imageAssetId: imageAsset.id,
        versionType: ImageVersionType.realism_pass,
        filePath: result.filePath,
        promptUsed: promptDocument.fullPrompt,
        presetUsed: preset.name,
        settingsJson: JSON.stringify(mergedSettings),
        metadataJson: JSON.stringify(result.metadata),
      },
    });

    await prisma.generationLog.update({
      where: { id: generationLog.id },
      data: {
        success: true,
        processingTime: result.processingTimeMs,
        status: GenerationLogStatus.completed,
      },
    });

    await prisma.imageAsset.update({
      where: { id: imageAsset.id },
      data: { status: "ready" },
    });

    return {
      generationLogId: generationLog.id,
      imageVersionId: imageVersion.id,
      promptDocument,
      settings: mergedSettings,
      // Pass fidelity metadata to the caller if available (Fal.ai provider)
      fidelity: (result.metadata as Record<string, unknown>)?.fidelity ?? null,
    };
  } catch (error) {
    await prisma.generationLog.update({
      where: { id: generationLog.id },
      data: {
        success: false,
        processingTime: 0,
        status: GenerationLogStatus.failed,
        errorMessage: error instanceof Error ? error.message : "Unknown generation failure.",
      },
    });

    await prisma.imageAsset.update({
      where: { id: imageAsset.id },
      data: { status: "failed" },
    });

    throw error;
  }
}
