/**
 * fal-provider.ts
 *
 * Direct integration with the Fal.ai Flux ControlNet Canny endpoint.
 * Replaces the previous proxy-through-FastAPI design — the only external
 * dependency required now is Fal.ai itself (FAL_KEY env variable).
 *
 * Pipeline:
 *   1. Read source image (path-traversal checked).
 *   2. Upload source bytes to Fal storage → returns a CDN URL.
 *   3. Call FAL_MODEL (default fal-ai/flux-pro/v1/canny) with the URL
 *      as the control image plus the architectural-preservation prompt.
 *      The model runs its own Canny preprocessor server-side, so no
 *      local edge detection is required.
 *   4. Download the generated image from the returned URL.
 *   5. Persist it under storageRoot via writeGeneratedVersionBuffer.
 *
 * Tunables (all overridable via env so we can iterate without redeploying):
 *   FAL_MODEL                        default "fal-ai/flux-pro/v1/canny"
 *   FAL_CONTROL_WEIGHT               default 0.75 (structural adherence)
 *   FAL_INFERENCE_STEPS              default 28
 *   FAL_GUIDANCE_SCALE               default 3.5
 */

import path from "path";

import { fal } from "@fal-ai/client";

import {
  readStoredFile,
  writeGeneratedVersionBuffer,
} from "@/services/storage/storage-service";

import type {
  ProviderAdapter,
  ProviderGenerateInput,
  ProviderGenerateResult,
} from "./provider-adapter";

const DEFAULT_MODEL = process.env.FAL_MODEL ?? "fal-ai/flux-pro/v1/canny";
const DEFAULT_CONTROL_WEIGHT = Number(process.env.FAL_CONTROL_WEIGHT ?? "0.75");
const DEFAULT_INFERENCE_STEPS = Number(process.env.FAL_INFERENCE_STEPS ?? "28");
const DEFAULT_GUIDANCE_SCALE = Number(process.env.FAL_GUIDANCE_SCALE ?? "3.5");

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error(
      "Missing FAL_KEY environment variable. Set FAL_KEY in .env to use the Fal.ai provider."
    );
  }
  fal.config({ credentials: key });
  configured = true;
}

/** Pick the closest Fal-supported image_size for the source aspect ratio. */
function pickImageSize(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 1.4) return "landscape_16_9";
  if (ratio > 1.05) return "landscape_4_3";
  if (ratio < 0.7) return "portrait_16_9";
  if (ratio < 0.95) return "portrait_4_3";
  return "square_hd";
}

type FalImageResult = {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
};

type FalSubscribeResponse = {
  data?: {
    images?: FalImageResult[];
    seed?: number;
    timings?: Record<string, number>;
    has_nsfw_concepts?: boolean[];
  };
  requestId?: string;
};

export class FalAiProvider implements ProviderAdapter {
  readonly name = "fal-controlnet";
  readonly label = "Fal.ai Flux ControlNet (Architectural Fidelity)";

  async generateRealismPass(
    input: ProviderGenerateInput
  ): Promise<ProviderGenerateResult> {
    ensureConfigured();
    const startedAt = Date.now();

    // ── 1. Read source image (path-traversal checked) ──────────────────────
    const imageBytes = await readStoredFile(input.sourcePath);
    const sourceExtension = path.extname(input.sourcePath).toLowerCase();
    const mimeType =
      sourceExtension === ".jpg" || sourceExtension === ".jpeg"
        ? "image/jpeg"
        : sourceExtension === ".webp"
          ? "image/webp"
          : "image/png";

    // ── 2. Upload source to Fal storage (the model needs a URL) ────────────
    const sourceFile = new File(
      [new Uint8Array(imageBytes)],
      path.basename(input.sourcePath),
      { type: mimeType }
    );
    const sourceUrl = await fal.storage.upload(sourceFile);

    // ── 3. Build prompt: preservation contract baked into plain English ────
    const promptParts: string[] = [
      "Photorealistic architectural rendering, ultra-high quality, professional architectural photography.",
    ];
    if (input.prompt.presetName && input.prompt.presetName !== "custom") {
      promptParts.push(`Style preset: ${input.prompt.presetName}.`);
    }
    if (input.prompt.customDirectives?.length) {
      promptParts.push(...input.prompt.customDirectives);
    }
    promptParts.push(
      "Preserve every architectural element exactly: building footprint, facade geometry, window positions, column spacing, roof shape, and all structural details.",
      "Preserve camera angle, perspective, framing, focal length, and field of view.",
      "Replace flat / clay-shaded materials with photorealistic textures: concrete, glass, metal, brick, wood, asphalt.",
      "Improve lighting realism (subsurface scattering on glass, ambient occlusion, contact shadows, soft natural light) without changing the lighting direction.",
      "Add subtle, believable weathering where surfaces already imply wear.",
      "No redesign. No extra people. No extra buildings. No composition changes."
    );
    const prompt = promptParts.join(" ");

    const imageSize = pickImageSize(
      input.sourceWidth ?? 1024,
      input.sourceHeight ?? 768
    );

    // ── 4. Call Fal.ai (subscribe waits for the queue to complete) ─────────
    const result = (await fal.subscribe(DEFAULT_MODEL, {
      input: {
        prompt,
        control_image_url: sourceUrl,
        image_size: imageSize,
        num_inference_steps: DEFAULT_INFERENCE_STEPS,
        guidance_scale: DEFAULT_GUIDANCE_SCALE,
        controlnet_conditioning_scale: DEFAULT_CONTROL_WEIGHT,
        num_images: 1,
        enable_safety_checker: false,
        output_format: "jpeg",
      },
      logs: false,
    })) as FalSubscribeResponse;

    const generated = result.data?.images?.[0];
    if (!generated?.url) {
      throw new Error(
        `Fal.ai (${DEFAULT_MODEL}) returned no image data. Raw response: ${JSON.stringify(
          result
        ).slice(0, 300)}`
      );
    }

    // ── 5. Download the generated image ────────────────────────────────────
    const downloadResponse = await fetch(generated.url);
    if (!downloadResponse.ok) {
      throw new Error(
        `Fal.ai download failed: ${downloadResponse.status} ${downloadResponse.statusText} (${generated.url})`
      );
    }
    const generatedBytes = Buffer.from(await downloadResponse.arrayBuffer());

    // ── 6. Persist under storageRoot ───────────────────────────────────────
    const saved = await writeGeneratedVersionBuffer({
      projectId: input.projectId,
      sourcePath: input.sourcePath,
      versionLabel: "fal-controlnet-realism-pass",
      bytes: generatedBytes,
    });

    return {
      filePath: saved.filePath,
      metadata: {
        provider: this.name,
        model: DEFAULT_MODEL,
        promptUsed: prompt,
        seed: result.data?.seed ?? null,
        timings: result.data?.timings ?? null,
        controlnetWeight: DEFAULT_CONTROL_WEIGHT,
        inferenceSteps: DEFAULT_INFERENCE_STEPS,
        guidanceScale: DEFAULT_GUIDANCE_SCALE,
        imageSize,
        generatedUrl: generated.url,
        generatedWidth: generated.width ?? null,
        generatedHeight: generated.height ?? null,
        requestId: result.requestId ?? null,
      },
      processingTimeMs: Date.now() - startedAt,
    };
  }
}
