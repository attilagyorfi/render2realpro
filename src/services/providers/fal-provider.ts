/**
 * fal-provider.ts
 *
 * Realism-pass adapter for Fal.ai. The previous revision used
 * fal-ai/flux-pro/v1/canny (a pure Canny→image text-to-image endpoint),
 * which only sees the EDGE MAP of the source — not the source pixels.
 * Without the original textures as a visual reference, the model
 * routinely hallucinated different materials and even reinterpreted
 * exteriors as interiors. No amount of prompt-engineering can fix that
 * class of problem when the source pixels never reach the model.
 *
 * This revision moves to fal-ai/flux-general/image-to-image, which
 * accepts BOTH the source image AND a Canny ControlNet at the same
 * time:
 *
 *   - image_url            → the source render, given to the model as
 *                            its base. The model now SEES the actual
 *                            white-concrete tones, the metal cladding,
 *                            the asphalt — not just outlines.
 *   - strength             → how aggressively the model is allowed to
 *                            deviate from the source pixels. 0.4 is the
 *                            architectural sweet spot: enough denoise
 *                            to add real material micro-detail, not so
 *                            much that materials get reinvented.
 *   - controlnets[Canny]   → keeps the geometry locked down even at the
 *                            small amount of denoise we DO allow.
 *
 * The prompt also gets dramatically shorter. With the image-to-image
 * pipeline, the model already knows what's in the scene; we don't need
 * a 200-word preservation contract anymore.
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

const DEFAULT_MODEL =
  process.env.FAL_MODEL ?? "fal-ai/flux-general/image-to-image";
/**
 * How much of the source the model is allowed to overwrite. 0.4 means
 * "keep 60% of the source signal, repaint 40% with photoreal detail".
 * Going below 0.3 makes the change invisible; going above 0.6 starts
 * letting the model reinvent materials.
 */
const DEFAULT_STRENGTH = Number(process.env.FAL_STRENGTH ?? "0.4");
/**
 * Canny ControlNet conditioning weight. 0.65 is firm without being so
 * rigid that the soft-denoise can't add material detail at all.
 */
const DEFAULT_CONTROL_WEIGHT = Number(process.env.FAL_CONTROL_WEIGHT ?? "0.65");
const DEFAULT_INFERENCE_STEPS = Number(process.env.FAL_INFERENCE_STEPS ?? "30");
/**
 * Lower guidance now that the source image is the model's anchor —
 * the prompt only needs to whisper "photoreal" rather than shout it.
 */
const DEFAULT_GUIDANCE_SCALE = Number(process.env.FAL_GUIDANCE_SCALE ?? "3.5");
/**
 * Canny ControlNet weights on Fal. Their own samples reference
 * `openai/controlnet-canny`; can be overridden via env if a better one
 * ships later.
 */
const DEFAULT_CONTROL_PATH =
  process.env.FAL_CONTROL_PATH ?? "openai/controlnet-canny";

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
    // Now that the model has the source pixels AND a Canny ControlNet,
    // the prompt's job is to add intent ("photoreal exterior, slight
    // material refinement"), not to enforce preservation. The Canny
    // controlnet + low strength handle preservation structurally.
    const promptParts: string[] = [
      "Photorealistic architectural exterior photography, professional reference photo of an existing building, true-to-source materials, natural outdoor daylight, accurate contact shadows, atmospheric haze.",
      "Subtly improve surface textures and lighting realism while keeping every building element, vehicle, vegetation, and material exactly as in the source.",
    ];
    if (input.prompt.presetName && input.prompt.presetName !== "custom") {
      promptParts.push(`Preset: ${input.prompt.presetName}.`);
    }
    if (input.prompt.customDirectives?.length) {
      promptParts.push(...input.prompt.customDirectives);
    }
    const prompt = promptParts.join(" ");

    const imageSize = pickImageSize(
      input.sourceWidth ?? 1024,
      input.sourceHeight ?? 768
    );

    // ── 4. Call Fal.ai — image-to-image with a Canny ControlNet ───────────
    const result = (await fal.subscribe(DEFAULT_MODEL, {
      input: {
        prompt,
        image_url: sourceUrl,
        strength: DEFAULT_STRENGTH,
        image_size: imageSize,
        num_inference_steps: DEFAULT_INFERENCE_STEPS,
        guidance_scale: DEFAULT_GUIDANCE_SCALE,
        // Canny ControlNet pinned at the same URL — Fal generates the
        // edge map server-side from the control_image_url.
        controlnets: [
          {
            path: DEFAULT_CONTROL_PATH,
            control_image_url: sourceUrl,
            conditioning_scale: DEFAULT_CONTROL_WEIGHT,
            start_percentage: 0,
            end_percentage: 1,
          },
        ],
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
      versionLabel: "fal-img2img-realism-pass",
      bytes: generatedBytes,
    });

    return {
      filePath: saved.filePath,
      metadata: {
        provider: this.name,
        model: DEFAULT_MODEL,
        promptUsed: prompt,
        strength: DEFAULT_STRENGTH,
        controlPath: DEFAULT_CONTROL_PATH,
        controlnetWeight: DEFAULT_CONTROL_WEIGHT,
        inferenceSteps: DEFAULT_INFERENCE_STEPS,
        guidanceScale: DEFAULT_GUIDANCE_SCALE,
        imageSize,
        seed: result.data?.seed ?? null,
        timings: result.data?.timings ?? null,
        generatedUrl: generated.url,
        generatedWidth: generated.width ?? null,
        generatedHeight: generated.height ?? null,
        requestId: result.requestId ?? null,
      },
      processingTimeMs: Date.now() - startedAt,
    };
  }
}
