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
 *                            deviate from the source pixels. 0.55 is
 *                            the architectural sweet spot at the current
 *                            Canny weight: enough denoise to actually
 *                            repaint CG-plastic surfaces with real
 *                            photographed materials, not so much that
 *                            the building geometry shifts.
 *   - controlnets[Canny]   → keeps geometry pinned at every denoise
 *                            step. Conditioning weight 0.45 is firm on
 *                            the building outline without overpowering
 *                            the denoise pass (the previous 0.65 made
 *                            the result mirror the source pixel-for-
 *                            pixel even when strength was raised).
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
 * How much of the source the model is allowed to overwrite. Earlier
 * default of 0.4 left visible CG-render artefacts: white-plastic walls,
 * flat-green grass, sterile asphalt — the model literally lacked enough
 * denoise budget to repaint surfaces. 0.55 gives it room to redo the
 * micro-detail layer (texture pores, blade-level grass, real road wear)
 * without letting it redraw the building. Canny at DEFAULT_CONTROL_WEIGHT
 * keeps geometry pinned at this strength.
 */
const DEFAULT_STRENGTH = Number(process.env.FAL_STRENGTH ?? "0.55");
/**
 * Canny ControlNet conditioning weight. Dropped from 0.65 → 0.45: at
 * 0.65 the edge map was overriding the model so hard that even with
 * higher denoise the result mirrored the source pixel-for-pixel. 0.45
 * still locks the building outline (verified on the warehouse smoke
 * render) but lets the denoise actually breathe.
 */
const DEFAULT_CONTROL_WEIGHT = Number(process.env.FAL_CONTROL_WEIGHT ?? "0.45");
const DEFAULT_INFERENCE_STEPS = Number(process.env.FAL_INFERENCE_STEPS ?? "30");
/**
 * Slight bump (3.5 → 4.0) so the photoreal-transformation prompt has
 * enough pull at the higher denoise. Still well below the 7+ range that
 * causes flux to over-saturate and posterise.
 */
const DEFAULT_GUIDANCE_SCALE = Number(process.env.FAL_GUIDANCE_SCALE ?? "4.0");
/**
 * Canny ControlNet weights on Fal. controlnets[].path expects a
 * HuggingFace repo slug in DIFFUSERS format. Two earlier values failed
 * in sequence: "openai/controlnet-canny" (Fal's illustrative sample,
 * not a real repo → 422) and "XLabs-AI/flux-controlnet-canny-v3"
 * (real repo but xlabs format, no config.json → pipeline load error
 * after minutes of queueing). InstantX is the standard diffusers-format
 * Flux Canny and is validated end-to-end via scripts/fal-smoke-test.js:
 * ~7s runtime, geometry fully preserved on the reference render.
 */
const DEFAULT_CONTROL_PATH =
  process.env.FAL_CONTROL_PATH ?? "InstantX/FLUX.1-dev-Controlnet-Canny";

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

    // Per-generation overrides arrive via settingsOverride →
    // mergePresetSettings → input.prompt.settings. Two are honoured here:
    //   creativity — the user-facing denoising strength (0.2 faithful …
    //                0.85 bold). Exposed by the workspace "Kreativitás"
    //                slider; falls back to the env-tuned default.
    //   quality    — maps to inference steps (low/medium/high).
    const settings = (input.prompt.settings ?? {}) as Record<string, unknown>;
    const rawCreativity = Number(settings.creativity);
    const strength = Number.isFinite(rawCreativity)
      ? Math.min(0.85, Math.max(0.2, rawCreativity))
      : DEFAULT_STRENGTH;
    const steps =
      settings.quality === "low"
        ? 24
        : settings.quality === "high"
          ? 40
          : DEFAULT_INFERENCE_STEPS;

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
    // The earlier prompt ("subtly improve … keep every element exactly as
    // in the source") was, in effect, asking the model to do nothing —
    // and combined with strength 0.4 + Canny 0.65 the model obliged.
    // The Canny ControlNet already enforces structural preservation; the
    // prompt's job is to push hard on the *transformation* axis (CG →
    // photograph) so the denoise budget gets spent on real materials,
    // not on a slightly softer copy of the source.
    const promptParts: string[] = [
      "Transform this CG architectural render into a real on-site photograph taken with a professional DSLR. Replace the plastic CG surfaces with real photographed materials: visible concrete porosity and grain on walls, real metal sandwich-panel seams with subtle specular highlights, individual blades of grass with colour variation instead of flat green plastic, asphalt with realistic aggregate, road wear, and tyre marks, and atmospheric depth-of-field haze between camera and building.",
      "Realistic outdoor sun-and-sky illumination with soft contact shadows under the building footprint, ambient occlusion in the eaves and at the ground line, and faint dust on lower wall surfaces.",
      "Preserve exactly: building outline, roof geometry, window and door positions, parked vehicle placement, vegetation placement, and the overall scene composition. Only the material quality, surface detail, and lighting realism change.",
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
    // The controlnets entry uses only the three schema-documented
    // fields (path / control_image_url / conditioning_scale). Earlier
    // we passed start_percentage and end_percentage too — the
    // documented schema doesn't accept them and the endpoint 422'd on
    // the unknown keys. Without those keys the ControlNet just stays
    // active for the whole denoising pass, which is what we want
    // anyway.
    const result = (await fal.subscribe(DEFAULT_MODEL, {
      input: {
        prompt,
        image_url: sourceUrl,
        strength,
        image_size: imageSize,
        num_inference_steps: steps,
        guidance_scale: DEFAULT_GUIDANCE_SCALE,
        // The watermark/text/logo bans exist because test renders sourced
        // from stock sites carry diagonal watermarks — without the ban the
        // model happily "enhances" the watermark into the output. A user-
        // supplied negative prompt (workspace Advanced section) is
        // prepended so it carries the most weight.
        negative_prompt:
          (typeof settings.negativePrompt === "string" && settings.negativePrompt.trim()
            ? `${settings.negativePrompt.trim()}, `
            : "") +
          "redesigned building, different roof material, repainted facade, " +
          "new vehicles, new people, different camera angle, indoor scene, " +
          "fantasy architecture, cartoon style, illustration, low quality, " +
          "extra elements, missing elements, " +
          "watermark, stock photo watermark, sample text, letters, " +
          "typography, captions, logo, signature, branding overlay",
        controlnets: [
          {
            path: DEFAULT_CONTROL_PATH,
            control_image_url: sourceUrl,
            conditioning_scale: DEFAULT_CONTROL_WEIGHT,
          },
        ],
        num_images: 1,
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
        strength,
        controlPath: DEFAULT_CONTROL_PATH,
        controlnetWeight: DEFAULT_CONTROL_WEIGHT,
        inferenceSteps: steps,
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
