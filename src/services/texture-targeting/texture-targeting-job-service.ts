import { GenerationLogStatus } from "@prisma/client";
import sharp from "sharp";

import { prisma } from "@/lib/prisma";
import { inpaintWithFal } from "@/services/providers/fal-inpainting";
import {
  readStoredFile,
  writeGeneratedVersionBuffer,
} from "@/services/storage/storage-service";
import type {
  TextureApplyRequest,
  TextureApplyResponse,
  TexturePreviewRequest,
  TexturePreviewResponse,
} from "@/types/domain";

const FAL_INPAINTING_PROVIDER = "fal-inpainting";

// Mask-edge softness (px) for the final composite. The Fal Fill model
// produces a clean transition on its own, but feathering the binary
// client-drawn mask before the over-source composite hides any minor
// rounding artefacts on the inside-mask boundary.
const MASK_FEATHER_PX = 6;

/** Carry-over from the mock implementation — only the apply endpoint
 *  has changed. Preview kept as-is to avoid breaking
 *  /api/texture-targeting/preview consumers in this pass. */
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

/** Legacy mock — kept so the preset-driven preview/select payloads
 *  the existing route still accepts compile cleanly. Real material
 *  editing now flows through applyMaterialInpainting (below). */
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
      jobType: "texture_targeting_mock",
      providerName: "mock-texture-targeting",
      promptVersion: "texture-targeting-phase-1",
      settingsJson: JSON.stringify({ legacy: true }),
      success: true,
      processingTime: 0,
      status: GenerationLogStatus.completed,
    },
  });

  const imageVersion = await prisma.imageVersion.create({
    data: {
      imageAssetId: imageAsset.id,
      versionType: "texture_pass" as never,
      filePath: imageAsset.storedFilePath,
      promptUsed: input.customMaterialPrompt ?? "",
      presetUsed: input.materialPreset,
      settingsJson: JSON.stringify({ legacy: true }),
      metadataJson: JSON.stringify({ source: "legacy-mock" }),
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

export type MaterialInpaintingInput = {
  imageAssetId: string;
  /** Binary PNG mask, any pixel dimensions — service resizes to source. */
  maskBytes: Buffer;
  /** Free-text material/colour directive supplied by the user. */
  prompt: string;
  /** Optional denoising strength (0..1). Honoured by Flux Dev only. */
  strength?: number;
};

export type MaterialInpaintingResult = {
  generationLogId: string;
  imageVersionId: string;
};

/**
 * Sprint F entry point. Run a real Fal Fill / inpainting pass on the
 * client-drawn mask, composite the result back over the source so the
 * outside-mask region is pixel-perfect identical to the original, then
 * persist as a new texture_pass version.
 *
 * Lifecycle mirrors createGenerationJob() in image-processing-service:
 * generationLog moves queued → processing → completed | failed, and the
 * imageAsset status flips to processing during the call.
 */
export async function applyMaterialInpainting(
  input: MaterialInpaintingInput
): Promise<MaterialInpaintingResult> {
  const imageAsset = await prisma.imageAsset.findUnique({
    where: { id: input.imageAssetId },
    include: { project: true },
  });
  if (!imageAsset) throw new Error("Image asset not found.");

  const settingsSnapshot = JSON.stringify({
    prompt: input.prompt,
    strength: input.strength ?? null,
  });

  const generationLog = await prisma.generationLog.create({
    data: {
      imageAssetId: imageAsset.id,
      jobType: "texture_targeting",
      providerName: FAL_INPAINTING_PROVIDER,
      promptVersion: "material-inpainting-v1",
      settingsJson: settingsSnapshot,
      success: false,
      processingTime: 0,
      status: GenerationLogStatus.queued,
    },
  });

  const startedAt = Date.now();

  try {
    await prisma.generationLog.update({
      where: { id: generationLog.id },
      data: { status: GenerationLogStatus.processing },
    });
    await prisma.imageAsset.update({
      where: { id: imageAsset.id },
      data: { status: "processing" },
    });

    // ── 1. Read source bytes (path-traversal checked inside) ──────────────
    const sourceBytes = await readStoredFile(imageAsset.storedFilePath);

    // ── 2. Normalise the client mask to the source dimensions ──────────────
    // The client draws in display-space (often smaller than the asset). The
    // model needs source-sized PNG, so we resize. fit:"fill" preserves the
    // aspect mapping the client used.
    const sourceMeta = await sharp(sourceBytes).metadata();
    const sourceWidth = sourceMeta.width ?? imageAsset.width;
    const sourceHeight = sourceMeta.height ?? imageAsset.height;

    const normalisedMaskBytes = await sharp(input.maskBytes)
      .resize(sourceWidth, sourceHeight, { fit: "fill" })
      // Reduce to a single grayscale channel — Fal Fill treats anything
      // non-black as "regenerate this pixel".
      .grayscale()
      .png()
      .toBuffer();

    // ── 3. Call Fal Flux Fill ──────────────────────────────────────────────
    const inpainted = await inpaintWithFal({
      sourcePath: imageAsset.storedFilePath,
      sourceBytes,
      maskBytes: normalisedMaskBytes,
      prompt: input.prompt,
      strength: input.strength,
    });

    // ── 4. Composite — outside-mask MUST be original pixels. ───────────────
    // Strategy: take the inpainted image, attach a feathered version of
    // the mask as its alpha channel, then composite that over the
    // original source. Outside-mask alpha = 0 → original pixels survive;
    // inside-mask alpha ≈ 255 → inpainted pixels show through; near the
    // boundary we get a soft blend so the seam is invisible.
    const featheredMaskBytes = await sharp(normalisedMaskBytes)
      .blur(MASK_FEATHER_PX)
      .toColourspace("b-w")
      .toBuffer();

    // Re-encode the generated image to RGB at the source dimensions so
    // joinChannel can attach the mask as alpha cleanly.
    const generatedRgbBytes = await sharp(inpainted.generatedBytes)
      .resize(sourceWidth, sourceHeight, { fit: "fill" })
      .removeAlpha()
      .toFormat("png")
      .toBuffer();

    const generatedRgbaBytes = await sharp(generatedRgbBytes)
      .ensureAlpha()
      .joinChannel(featheredMaskBytes)
      .png()
      .toBuffer();

    const compositeBytes = await sharp(sourceBytes)
      .composite([{ input: generatedRgbaBytes, blend: "over" }])
      .jpeg({ quality: 92 })
      .toBuffer();

    // ── 5. Persist ────────────────────────────────────────────────────────
    const saved = await writeGeneratedVersionBuffer({
      projectId: imageAsset.projectId,
      sourcePath: imageAsset.storedFilePath,
      versionLabel: "material-inpainting",
      bytes: compositeBytes,
    });

    const versionMetadata = {
      ...inpainted.metadata,
      featherPx: MASK_FEATHER_PX,
      processingTimeMs: Date.now() - startedAt,
    };

    const imageVersion = await prisma.imageVersion.create({
      data: {
        imageAssetId: imageAsset.id,
        versionType: "texture_pass" as never,
        filePath: saved.filePath,
        promptUsed: input.prompt,
        presetUsed: "free-prompt",
        settingsJson: settingsSnapshot,
        metadataJson: JSON.stringify(versionMetadata),
      },
    });

    await prisma.generationLog.update({
      where: { id: generationLog.id },
      data: {
        success: true,
        status: GenerationLogStatus.completed,
        processingTime: Date.now() - startedAt,
      },
    });
    await prisma.imageAsset.update({
      where: { id: imageAsset.id },
      data: { status: "ready" },
    });

    return {
      generationLogId: generationLog.id,
      imageVersionId: imageVersion.id,
    };
  } catch (error) {
    await prisma.generationLog.update({
      where: { id: generationLog.id },
      data: {
        success: false,
        status: GenerationLogStatus.failed,
        processingTime: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : "Unknown failure",
      },
    });
    await prisma.imageAsset.update({
      where: { id: imageAsset.id },
      data: { status: "failed" },
    });
    throw error;
  }
}
