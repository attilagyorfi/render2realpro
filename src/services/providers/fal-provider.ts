/**
 * fal-provider.ts — Realism-pass adapter for Fal.ai
 *
 * History (kept for context, since model choice has dominated this
 * product's debugging budget):
 *
 *   v1 — fal-ai/flux-pro/v1/canny       (text-to-image only, removed)
 *   v2 — fal-ai/flux-general/image-to-image + Canny  (transformation-only,
 *        no "sharpen without redesign" middle ground)
 *   v3 — fal-ai/clarity-upscaler        (SD1.5, output indistinguishable
 *        from source even with correct field names)
 *   v4 — fal-ai/supir                   (SDXL restoration, weaker at
 *        "invent rich texture" per research brief)
 *
 *   v5 (this file) — fal-ai/sdxl-controlnet-union/image-to-image
 *        The rendair.ai recipe in turnkey form: SDXL base + multiple
 *        ControlNets (Canny for edges, Depth for geometry) + img2img.
 *        Both ControlNets feed from the SAME source URL with
 *        canny_preprocess and depth_preprocess set to true so Fal runs
 *        the preprocessors itself — we send one upload, get a dual-CN
 *        pass. This is the architectural-viz industry standard
 *        (Juggernaut XL / RealVisXL + Canny + Depth + img2img at
 *        denoise ~0.55), packaged as a single endpoint.
 *
 *   Provider class `name` stays "fal-controlnet" across every model
 *   version — provider-registry.ts and the user's .env both reference
 *   that exact string. R6 broke this once already (rename → silent
 *   mock-fallback for several sprints).
 *
 * Server-side logging stays loud: every call prints model + params +
 * wall-clock so any future regression of the silent-mock class is
 * visible at the very first request in the dev server terminal.
 */

import path from "path";

import { fal } from "@fal-ai/client";
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

const DEFAULT_MODEL =
  process.env.FAL_MODEL ?? "fal-ai/sdxl-controlnet-union/image-to-image";

/**
 * ControlNet conditioning scale. 0.5 is Fal's documented default; 0.6
 * is firmer for the architectural use case where we cannot afford the
 * building outline to drift even slightly. Above 0.8 the result starts
 * to look "traced" — preserving edges so rigidly that the surrounding
 * denoise can't actually transform materials.
 */
const DEFAULT_CONTROLNET_SCALE = Number(
  process.env.FAL_CONTROLNET_SCALE ?? "0.6"
);

/**
 * Inference steps. SDXL Union docs default to 35. 30 gives near-
 * identical quality at noticeably lower latency.
 */
const DEFAULT_INFERENCE_STEPS = Number(process.env.FAL_INFERENCE_STEPS ?? "30");
const DEFAULT_GUIDANCE_SCALE = Number(process.env.FAL_GUIDANCE_SCALE ?? "7.5");

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

type FalImageResult = {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
};

type FalSubscribeResponse = {
  data?: {
    image?: FalImageResult;
    images?: FalImageResult[];
    seed?: number;
    timings?: Record<string, number>;
  };
  requestId?: string;
};

export class FalAiProvider implements ProviderAdapter {
  readonly name = "fal-controlnet";
  readonly label = "Fal.ai SDXL ControlNet Union (Architectural Photo)";

  async generateRealismPass(
    input: ProviderGenerateInput
  ): Promise<ProviderGenerateResult> {
    ensureConfigured();
    const startedAt = Date.now();

    // The workspace's "Kreativitás" slider (0.10..0.70 in the UI) is
    // passed directly as the SDXL img2img `strength` — the documented
    // denoise sweet spot for arch viz "preserve scene, transform
    // materials" sits at 0.50..0.60 and the slider lives in that
    // range. Fal's documented `strength` default is 0.95, which would
    // be far too transformative (full redesign).
    const settings = (input.prompt.settings ?? {}) as Record<string, unknown>;
    const rawCreativity = Number(settings.creativity);
    const strength = Number.isFinite(rawCreativity)
      ? Math.min(0.7, Math.max(0.1, rawCreativity))
      : 0.55;

    // ── 1. Read source ────────────────────────────────────────────────────
    const imageBytes = await readStoredFile(input.sourcePath);
    const sourceExtension = path.extname(input.sourcePath).toLowerCase();
    const mimeType =
      sourceExtension === ".jpg" || sourceExtension === ".jpeg"
        ? "image/jpeg"
        : sourceExtension === ".webp"
          ? "image/webp"
          : "image/png";

    // ── 2. Upload to Fal storage ─────────────────────────────────────────
    const sourceFile = new File(
      [new Uint8Array(imageBytes)],
      path.basename(input.sourcePath),
      { type: mimeType }
    );
    const sourceUrl = await fal.storage.upload(sourceFile);

    // ── 3. Prompt: photograph-first pattern ──────────────────────────────
    // The published Magnific / rendair-style positive-prompt template:
    // lead with camera + lens + film grain (steers the model toward a
    // PHOTOGRAPH), then list the architectural surface materials we
    // want to see (steers the denoise to repaint THOSE surfaces), then
    // atmosphere (light, haze, shadows). Scene nouns are deliberately
    // avoided — they give the model permission to redesign.
    const promptParts: string[] = [
      "professional architectural exterior photography, photorealistic",
      "shot on Hasselblad H6D-400c, 85mm prime lens, sharp focus, fine grain",
      "weathered concrete with visible porosity, brushed aluminum sandwich panels with seam highlights, asphalt with realistic aggregate and tyre marks",
      "blade-level grass with colour variation, real glass with subtle sky reflections",
      "late afternoon natural sun, atmospheric haze between camera and building, soft contact shadows, ambient occlusion in eaves",
      "ultra realistic materials, 8k resolution, masterpiece",
    ];
    if (input.prompt.presetName && input.prompt.presetName !== "custom") {
      promptParts.push(`style hint: ${input.prompt.presetName}`);
    }
    if (input.prompt.customDirectives?.length) {
      promptParts.push(...input.prompt.customDirectives);
    }
    const prompt = promptParts.join(", ");

    // Negative prompt — keywords describing the INPUT (cgi, render,
    // plastic, smooth) push the diffusion AWAY from the CG look the
    // source has. Without these the model preserves the cg-plastic
    // appearance because nothing told it not to.
    const userNegative =
      typeof settings.negativePrompt === "string" && settings.negativePrompt.trim()
        ? `${settings.negativePrompt.trim()}, `
        : "";
    const negativePrompt =
      userNegative +
      "cgi, 3d render, computer graphics, video game, unreal engine, twinmotion, lumion, " +
      "plastic, smooth surface, oversaturated, flat colours, sterile, perfect, " +
      "painting, illustration, drawing, cartoon, anime, fantasy, " +
      "redesigned building, deformed geometry, extra windows, missing windows, " +
      "changed building shape, different roof material, repainted facade, " +
      "new vehicles, new people, added decoration, removed decoration, " +
      "watermark, sample text, letters, typography, logo, signature, " +
      "low quality, worst quality, blurry, jpeg artifacts";

    const seed = Math.floor(Math.random() * 2 ** 31);

    // SDXL ControlNet Union accepts the same source image as Canny
    // AND Depth control simultaneously. canny_preprocess / depth_preprocess
    // set to true tells Fal to run the preprocessors itself, so we
    // upload one image and get a true dual-ControlNet pass — the
    // rendair-style recipe in a single HTTP round-trip.
    const sdxlInput = {
      image_url: sourceUrl,
      prompt,
      negative_prompt: negativePrompt,
      canny_image_url: sourceUrl,
      canny_preprocess: true,
      depth_image_url: sourceUrl,
      depth_preprocess: true,
      strength,
      controlnet_conditioning_scale: DEFAULT_CONTROLNET_SCALE,
      guidance_scale: DEFAULT_GUIDANCE_SCALE,
      num_inference_steps: DEFAULT_INFERENCE_STEPS,
      seed,
    };

    // ── 4. Call Fal — loud logging on input ──────────────────────────────
    console.log(
      `[fal-provider] → Calling ${DEFAULT_MODEL} (project=${input.projectId.slice(0, 8)}…) with:`,
      {
        strength: sdxlInput.strength,
        controlnet_conditioning_scale: sdxlInput.controlnet_conditioning_scale,
        guidance_scale: sdxlInput.guidance_scale,
        num_inference_steps: sdxlInput.num_inference_steps,
        controlnets: "canny+depth (both from source)",
        creativity_slider: strength,
        seed: sdxlInput.seed,
        prompt_chars: prompt.length,
        negative_chars: negativePrompt.length,
      }
    );

    const result = (await fal.subscribe(DEFAULT_MODEL, {
      input: sdxlInput,
      logs: false,
    })) as FalSubscribeResponse;

    const generated = result.data?.image ?? result.data?.images?.[0];
    if (!generated?.url) {
      throw new Error(
        `Fal.ai (${DEFAULT_MODEL}) returned no image data. Raw response: ${JSON.stringify(
          result
        ).slice(0, 300)}`
      );
    }

    const falWallClockMs = Date.now() - startedAt;
    console.log(
      `[fal-provider] ← ${DEFAULT_MODEL} returned after ${falWallClockMs} ms, ` +
        `output URL ${generated.url.slice(0, 80)}…, ` +
        `output ${generated.width ?? "?"}×${generated.height ?? "?"}`
    );

    // ── 5. Download ───────────────────────────────────────────────────────
    const downloadResponse = await fetch(generated.url);
    if (!downloadResponse.ok) {
      throw new Error(
        `Fal.ai download failed: ${downloadResponse.status} ${downloadResponse.statusText} (${generated.url})`
      );
    }
    const rawGeneratedBytes = Buffer.from(await downloadResponse.arrayBuffer());

    // ── 5b. Match source dimensions ───────────────────────────────────────
    // SDXL Union outputs at its own preferred resolution; we resample
    // back to source dimensions so the user gets matched-resolution
    // before/after for the comparison slider.
    const sourceMeta = await sharp(imageBytes).metadata();
    const targetWidth = sourceMeta.width ?? input.sourceWidth;
    const targetHeight = sourceMeta.height ?? input.sourceHeight;
    let generatedBytes: Buffer = rawGeneratedBytes;
    let resampledFrom: { width: number; height: number } | null = null;
    if (targetWidth && targetHeight) {
      const got = await sharp(rawGeneratedBytes).metadata();
      if (
        got.width &&
        got.height &&
        (got.width !== targetWidth || got.height !== targetHeight)
      ) {
        generatedBytes = Buffer.from(
          await sharp(rawGeneratedBytes)
            .resize(targetWidth, targetHeight, {
              kernel: sharp.kernel.lanczos3,
              fit: "fill",
            })
            .jpeg({ quality: 92 })
            .toBuffer()
        );
        resampledFrom = { width: got.width, height: got.height };
      }
    }

    // ── 6. Persist ────────────────────────────────────────────────────────
    const saved = await writeGeneratedVersionBuffer({
      projectId: input.projectId,
      sourcePath: input.sourcePath,
      versionLabel: "fal-sdxl-controlnet-union-realism-pass",
      bytes: generatedBytes,
    });

    const totalMs = Date.now() - startedAt;
    console.log(
      `[fal-provider] ✓ Persisted to ${saved.filePath} (Fal ${falWallClockMs} ms, ` +
        `total ${totalMs} ms${resampledFrom ? `, resampled from ${resampledFrom.width}×${resampledFrom.height}` : ""})`
    );

    return {
      filePath: saved.filePath,
      metadata: {
        provider: this.name,
        model: DEFAULT_MODEL,
        promptUsed: prompt,
        creativitySlider: strength,
        strength,
        controlnetConditioningScale: DEFAULT_CONTROLNET_SCALE,
        controlnets: "canny+depth",
        guidanceScale: DEFAULT_GUIDANCE_SCALE,
        inferenceSteps: DEFAULT_INFERENCE_STEPS,
        seed: result.data?.seed ?? sdxlInput.seed,
        timings: result.data?.timings ?? null,
        generatedUrl: generated.url,
        generatedWidth: generated.width ?? null,
        generatedHeight: generated.height ?? null,
        resampledFromWidth: resampledFrom?.width ?? null,
        resampledFromHeight: resampledFrom?.height ?? null,
        requestId: result.requestId ?? null,
        falWallClockMs,
      },
      processingTimeMs: totalMs,
    };
  }
}
