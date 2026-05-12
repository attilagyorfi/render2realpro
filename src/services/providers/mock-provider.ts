import crypto from "node:crypto";

import sharp from "sharp";

import {
  readStoredFile,
  writeGeneratedVersionBuffer,
} from "@/services/storage/storage-service";

import type {
  ProviderAdapter,
  ProviderGenerateInput,
  ProviderGenerateResult,
} from "./provider-adapter";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tunable parameters of the mock realism pass. Kept as named constants so
 * the metadata blob mirrors the actual sharp() pipeline exactly.
 */
const MOCK_TRANSFORM = {
  saturation: 1.12,
  brightness: 1.03,
  contrastSlope: 1.08,
  contrastOffset: -8,
  sharpenSigma: 0.7,
  sharpenFlat: 0.5,
  sharpenJagged: 1.5,
  vignetteInnerStop: 0.55,
  vignetteOuterRadius: 0.8,
  jpegQuality: 90,
} as const;

function vignetteOverlay(width: number, height: number): Buffer {
  const innerPct = Math.round(MOCK_TRANSFORM.vignetteInnerStop * 100);
  const outerPct = Math.round(MOCK_TRANSFORM.vignetteOuterRadius * 100);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<defs><radialGradient id="g" cx="50%" cy="50%" r="${outerPct}%">` +
    `<stop offset="${innerPct}%" stop-color="white" stop-opacity="1"/>` +
    `<stop offset="100%" stop-color="black" stop-opacity="1"/>` +
    `</radialGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>` +
    `</svg>`;
  return Buffer.from(svg);
}

/**
 * MockLocalProvider — produces a deterministic, composition-preserving
 * "realism pass" without calling any external model. Suitable for local
 * UI demos and tests when the Fal.ai/OpenAI backends are not configured.
 *
 * The transformation is intentionally subtle: a small contrast and
 * saturation boost, gentle sharpening, and a soft vignette. None of these
 * change geometry, perspective, or object placement.
 */
export class MockLocalProvider implements ProviderAdapter {
  readonly name = "mock-local";
  readonly label = "Mock Local Provider";

  async generateRealismPass(
    input: ProviderGenerateInput
  ): Promise<ProviderGenerateResult> {
    const startedAt = Date.now();

    // Simulate provider latency (~1.4s) so the workspace progress overlay
    // has time to animate during local demos.
    await sleep(350);
    await sleep(600);
    await sleep(420);

    // Path-traversal checked: only paths under appEnv.storageRoot succeed.
    const sourceBytes = await readStoredFile(input.sourcePath);
    const meta = await sharp(sourceBytes).metadata();
    const width = meta.width ?? input.sourceWidth ?? 1024;
    const height = meta.height ?? input.sourceHeight ?? 768;

    const enhancedBuffer = await sharp(sourceBytes)
      .rotate() // honour EXIF orientation
      .modulate({
        saturation: MOCK_TRANSFORM.saturation,
        brightness: MOCK_TRANSFORM.brightness,
      })
      .linear(MOCK_TRANSFORM.contrastSlope, MOCK_TRANSFORM.contrastOffset)
      .sharpen({
        sigma: MOCK_TRANSFORM.sharpenSigma,
        m1: MOCK_TRANSFORM.sharpenFlat,
        m2: MOCK_TRANSFORM.sharpenJagged,
      })
      .composite([{ input: vignetteOverlay(width, height), blend: "multiply" }])
      .jpeg({ quality: MOCK_TRANSFORM.jpegQuality })
      .toBuffer();

    const saved = await writeGeneratedVersionBuffer({
      projectId: input.projectId,
      sourcePath: input.sourcePath,
      versionLabel: "mock-realism-pass",
      bytes: enhancedBuffer,
    });

    return {
      filePath: saved.filePath,
      metadata: {
        provider: this.name,
        traceId: crypto.randomUUID(),
        simulated: true,
        preservedComposition: true,
        outputFormat: "jpeg",
        outputDimensions: { width, height },
        transform: MOCK_TRANSFORM,
      },
      processingTimeMs: Date.now() - startedAt,
    };
  }
}
