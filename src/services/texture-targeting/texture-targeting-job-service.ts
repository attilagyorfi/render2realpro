import { GenerationLogStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  TextureApplyRequest,
  TextureApplyResponse,
  TexturePreviewRequest,
  TexturePreviewResponse,
} from "@/types/domain";

const MOCK_TEXTURE_PROVIDER = "mock-texture-targeting";

function serializeTextureSettings(input: TexturePreviewRequest | TextureApplyRequest) {
  return JSON.stringify({
    selectionMode: input.selectionMode,
    materialPreset: input.materialPreset,
    customMaterialPrompt: input.customMaterialPrompt ?? "",
    preserveGeometry: input.preserveGeometry,
    preserveLighting: input.preserveLighting,
    preserveSurroundings: input.preserveSurroundings,
    selectionMask: input.selectionMask,
    referenceImageVersionId: input.referenceImageVersionId,
  });
}

export async function createTexturePreview(
  input: TexturePreviewRequest
): Promise<TexturePreviewResponse> {
  return {
    previewVersionId: `preview-${input.imageAssetId}-${input.materialPreset}`,
    previewLabel: `${input.materialPreset} preview`,
    status: "ready",
    message: "Texture preview prepared.",
  };
}

export async function applyTexturePass(
  input: TextureApplyRequest
): Promise<TextureApplyResponse> {
  const imageAsset = await prisma.imageAsset.findUnique({
    where: { id: input.imageAssetId },
  });

  if (!imageAsset) {
    throw new Error("Image asset not found.");
  }

  const generationLog = await prisma.generationLog.create({
    data: {
      imageAssetId: imageAsset.id,
      jobType: "texture_targeting",
      providerName: MOCK_TEXTURE_PROVIDER,
      promptVersion: "texture-targeting-phase-1",
      settingsJson: serializeTextureSettings(input),
      success: false,
      processingTime: 0,
      status: GenerationLogStatus.queued,
    },
  });

  const imageVersion = await prisma.imageVersion.create({
    data: {
      imageAssetId: imageAsset.id,
      versionType: "texture_pass" as never,
      filePath: imageAsset.storedFilePath,
      promptUsed: input.customMaterialPrompt ?? "",
      presetUsed: input.materialPreset,
      settingsJson: serializeTextureSettings(input),
      metadataJson: JSON.stringify({
        source: "texture-targeting-phase-1",
        selectionMask: input.selectionMask,
      }),
    },
  });

  await prisma.generationLog.update({
    where: { id: generationLog.id },
    data: {
      success: true,
      status: GenerationLogStatus.completed,
      processingTime: 650,
    },
  });

  return {
    generationLogId: generationLog.id,
    imageVersionId: imageVersion.id,
    versionType: "texture_pass",
    status: "completed",
    message: "Texture pass saved.",
  };
}
