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
// Lower conditioning_scale leaves more room for photorealistic texture and
// lighting; 0.75 was reproducing the source's flat-shaded look. 0.5 is the
// architectural sweet spot — strong enough to preserve geometry, loose
// enough to let the model invent realistic materials.
const DEFAULT_CONTROL_WEIGHT = Number(process.env.FAL_CONTROL_WEIGHT ?? "0.5");
// More inference steps trade a few seconds of latency for visibly sharper
// materials and lighting; 40 is the practical ceiling before diminishing
// returns on Flux Pro v1.
const DEFAULT_INFERENCE_STEPS = Number(process.env.FAL_INFERENCE_STEPS ?? "40");
// Higher guidance pushes the model harder toward the prompt's photographic
// language. 3.5 was too permissive — outputs stayed close to the input
// render's washed-out look. 7 is the standard "follow the prompt firmly"
// value for Flux without going into oversaturation territory.
const DEFAULT_GUIDANCE_SCALE = Number(process.env.FAL_GUIDANCE_SCALE ?? "7");

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
    // Flux responds far better to descriptive *photographic* language than
    // to engineering checklists. The previous prompt was a list of
    // preservation rules; the model interpreted that as "stay as close to
    // the input as possible" and never invented any real material or light.
    // We now lead with photography vocabulary, name concrete materials,
    // and describe the lighting before we mention any preservation rule.
    const promptParts: string[] = [
      "RAW photo, professional architectural photography, ultra-realistic, photorealistic, shot on a Hasselblad H6D medium format camera, 50mm prime lens, sharp focus, natural daylight.",
      "High-end architecture magazine photography style: rich material detail, true-to-life textures, subtle surface imperfections, soft directional shadows, ambient occlusion in corners, light bouncing off polished surfaces.",
      "Materials should look real: brushed concrete with fine aggregate, polished limestone or terrazzo floor with soft specular reflections, oak or walnut wood with visible grain, brushed aluminium or anodised metal trims, clear architectural glass with subtle reflections and slight tinting, white painted plaster walls with minimal texture.",
      "Lighting: warm natural daylight streaming through windows, soft volumetric light, gentle contact shadows under objects, golden-hour ambient tones.",
    ];
    if (input.prompt.presetName && input.prompt.presetName !== "custom") {
      promptParts.push(`Style preset: ${input.prompt.presetName}.`);
    }
    if (input.prompt.customDirectives?.length) {
      promptParts.push(...input.prompt.customDirectives);
    }
    // Preservation contract goes LAST — Flux weighs the front of the prompt
    // more heavily, so the photo-style language dominates while these
    // constraints still ride along.
    promptParts.push(
      "Strictly preserve the original camera angle, perspective, framing, and field of view.",
      "Preserve every architectural element exactly: building footprint, facade geometry, window positions, column spacing, roof shape, and all structural details.",
      "No redesign, no extra people, no extra buildings, no composition changes, no cartoon style, no illustration look, no flat shading, no 3D-render look."
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
