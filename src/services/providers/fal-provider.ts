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
// How tightly the model must follow the Canny edge map. At 0.5 the model
// took too many liberties and started reinterpreting an industrial
// exterior as a wood-clad interior. 0.75 brings the geometry back —
// edges become near-mandatory — at the cost of slightly less material
// invention. The "Magas" generation-quality button bumps this further
// up in the quality-tuning logic below.
const DEFAULT_CONTROL_WEIGHT = Number(process.env.FAL_CONTROL_WEIGHT ?? "0.75");
// More inference steps trade a few seconds of latency for visibly sharper
// materials and lighting; 40 is the practical ceiling before diminishing
// returns on Flux Pro v1.
const DEFAULT_INFERENCE_STEPS = Number(process.env.FAL_INFERENCE_STEPS ?? "40");
// Guidance pushes the model toward the prompt's photographic language.
// 7 was sending it too hard toward magazine-photography aesthetics
// (carved wood, soft daylight) which then conflicted with the source
// render's geometry. 4.5 lets the prompt steer the materials without
// overriding the structural cues from the Canny edge map.
const DEFAULT_GUIDANCE_SCALE = Number(process.env.FAL_GUIDANCE_SCALE ?? "4.5");

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

    // ── 3. Build prompt ────────────────────────────────────────────────────
    // The previous version of this builder led with magazine-photography
    // vocabulary ("oak wood", "Hasselblad", "interior light") and pushed
    // the preservation contract to the tail. With ControlNet at 0.5 that
    // produced outputs that broadly ignored the source — e.g. an
    // industrial exterior turned into a wood-clad interior. Flux weighs
    // the front of the prompt the hardest, so the preservation contract
    // now goes FIRST; the photographic vocabulary comes after, only to
    // dress what the geometry already dictates.
    const promptParts: string[] = [
      // 1) Preserve, loud and early.
      "Photorealistic rendering of the EXACT scene shown in the control image. Preserve the original camera angle, perspective, framing, and field of view bit-for-bit.",
      "Preserve every architectural element exactly as drawn: building footprint, facade geometry, window positions, column spacing, roof shape, vehicles, vegetation, ground surfaces.",
      "Do NOT redesign the building. Do NOT change interior vs. exterior. Do NOT reinterpret the scene as something different.",
      // 2) THEN the realism upgrade — but only on what's already there.
      "Upgrade the existing surfaces to photoreal materials: weathered concrete or precast panels for the building, asphalt or compacted gravel for the ground, real metal cladding where the render shows metal, glass with subtle reflections only where windows already exist.",
      "Natural outdoor daylight from the same direction as the source, soft contact shadows, atmospheric haze in the distance, professional architectural exterior photography.",
    ];
    if (input.prompt.presetName && input.prompt.presetName !== "custom") {
      promptParts.push(`Style preset: ${input.prompt.presetName}.`);
    }
    if (input.prompt.customDirectives?.length) {
      promptParts.push(...input.prompt.customDirectives);
    }
    promptParts.push(
      // 3) Hard-negative cues for the failure modes we've actually seen.
      "No interior. No indoor wood paneling. No skylights or roof openings that aren't in the source. No new vehicles, no new people, no extra buildings, no fantasy elements, no flat shading, no 3D-render look, no cartoon style."
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
