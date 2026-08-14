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
 *        ControlNets + img2img, all fed from the SAME source URL with
 *        preprocessing on, so one upload yields a true multi-ControlNet
 *        pass. R14 tuned it for engineering fidelity per the user's
 *        guidance: TEED (clean/soft edges, ignores render noise) + Depth
 *        instead of Canny+Depth, denoise ~0.35 instead of ~0.55, and
 *        ControlNet scale 0.8 instead of 0.6 — "swap materials, don't
 *        redesign". All four knobs are env-overridable (FAL_CONTROLS,
 *        FAL_STRENGTH via the UI slider, FAL_CONTROLNET_SCALE) so the
 *        operating point can be A/B'd without a code change.
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
 * Which ControlNets drive the pass. R14 switched the default from
 * canny+depth to TEED+depth: Canny fires on every fleck of render noise,
 * every shadow edge and blade of grass, and the model then tries to turn
 * that noise into real geometry — the "melted / noisy detail" failure
 * mode. TEED is a soft, clean edge detector that ignores texture noise
 * and keeps only the true structural lines, so the building geometry is
 * held firmly while the denoise is free to repaint materials. Depth adds
 * 3D structure preservation on top.
 *
 * The endpoint only exposes: canny, teed, depth, normal, openpose,
 * segmentation (NOT lineart/mlsd). Override via FAL_CONTROLS, e.g.
 * FAL_CONTROLS="canny,depth" to A/B the edge detector from .env with no
 * code change. An unknown value warns and falls back to the default.
 */
const SUPPORTED_CONTROLS = [
  "canny",
  "teed",
  "depth",
  "normal",
  "openpose",
  "segmentation",
] as const;

function resolveControls(): string[] {
  const raw = process.env.FAL_CONTROLS ?? "teed,depth";
  const picked = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const invalid = picked.filter(
    (c) => !(SUPPORTED_CONTROLS as readonly string[]).includes(c)
  );
  if (invalid.length || picked.length === 0) {
    if (invalid.length) {
      console.warn(
        `[fal-provider] Ignoring unsupported FAL_CONTROLS value(s): ${invalid.join(", ")}. ` +
          `Supported: ${SUPPORTED_CONTROLS.join(", ")}. Falling back to teed,depth.`
      );
    }
    return ["teed", "depth"];
  }
  return picked;
}

const DEFAULT_CONTROLS = resolveControls();

/**
 * ControlNet conditioning scale. Raised from 0.6 to 0.8 in R14 on the
 * user's render-to-real fidelity guidance: at the lower denoise we now
 * run (strength ~0.35), a firmer 0.8 forces the repainted materials to
 * stay strictly inside the source structure instead of drifting. With
 * TEED (clean edges) rather than Canny, 0.8 no longer risks the "traced"
 * look Canny produced at high weight.
 */
const DEFAULT_CONTROLNET_SCALE = Number(
  process.env.FAL_CONTROLNET_SCALE ?? "0.8"
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
    // passed directly as the SDXL img2img `strength`. R14 lowered the
    // no-slider fallback from 0.55 to 0.35 on the render-to-real fidelity
    // guidance: at ~0.35 the model only repaints materials (glass, metal,
    // concrete, vegetation) while door/window openings and the building
    // outline stay put; by 0.50+ it starts redrawing openings.
    // Paired with the higher ControlNet scale (0.8) and TEED edges, this
    // is the "swap materials, don't redesign" operating point.
    const settings = (input.prompt.settings ?? {}) as Record<string, unknown>;
    const rawCreativity = Number(settings.creativity);
    const strength = Number.isFinite(rawCreativity)
      ? Math.min(0.7, Math.max(0.1, rawCreativity))
      : 0.35;

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

    // ── 3. Prompt: render-to-real fidelity pattern (R14) ──────────────────
    // Camera/optics + PBR-materials first — this steers the model toward a
    // PHOTOGRAPH of the existing structure, not a redesign. The heavy
    // lifting for fidelity is on the NEGATIVE side below; the positive
    // prompt just names the photographic qualities we want on the
    // repainted surfaces. Scene nouns are avoided (they invite redesign).
    const promptParts: string[] = [
      "hyper-realistic architectural photography, raw photo",
      "f/8, 35mm lens, physically based rendering materials",
      "realistic reflections, subtle dirt and weathering, highly detailed textures",
      "concrete porosity, brushed metal, real glass, natural daylight, soft contact shadows",
    ];
    if (input.prompt.presetName && input.prompt.presetName !== "custom") {
      promptParts.push(`style hint: ${input.prompt.presetName}`);
    }
    if (input.prompt.customDirectives?.length) {
      promptParts.push(...input.prompt.customDirectives);
    }
    const prompt = promptParts.join(", ");

    // Negative prompt is the primary fidelity lever. It is dominated by
    // geometry-drift bans (altered geometry, hallucinated details,
    // missing/extra windows, distorted perspective) and CG-look bans
    // (3d render, plastic, twinmotion/lumion) — the combination that
    // keeps the structure intact while pushing away from the CG source
    // appearance. A user-supplied negative (workspace Advanced) is
    // prepended so it carries the most weight.
    const userNegative =
      typeof settings.negativePrompt === "string" && settings.negativePrompt.trim()
        ? `${settings.negativePrompt.trim()}, `
        : "";
    const negativePrompt =
      userNegative +
      "altered geometry, changed structure, hallucinated details, missing windows, extra windows, " +
      "distorted perspective, warped lines, deformed building, changed building shape, " +
      "3d render, cgi, plastic materials, sketch, painting, illustration, cartoon, " +
      "twinmotion, lumion, unreal engine, oversaturated, flat colours, " +
      "redesigned building, different roof material, repainted facade, new vehicles, new people, " +
      "watermark, sample text, letters, typography, logo, signature, " +
      "low quality, worst quality, blurry, jpeg artifacts";

    const seed = Math.floor(Math.random() * 2 ** 31);

    // SDXL ControlNet Union accepts several control maps from the SAME
    // source image simultaneously. For each selected control we set
    // <name>_image_url = source and <name>_preprocess = true so Fal runs
    // the preprocessor itself — one upload, a true multi-ControlNet pass.
    const controlFields: Record<string, string | boolean> = {};
    for (const control of DEFAULT_CONTROLS) {
      controlFields[`${control}_image_url`] = sourceUrl;
      controlFields[`${control}_preprocess`] = true;
    }

    const sdxlInput = {
      image_url: sourceUrl,
      prompt,
      negative_prompt: negativePrompt,
      ...controlFields,
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
        controlnets: `${DEFAULT_CONTROLS.join("+")} (all from source)`,
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
        controlnets: DEFAULT_CONTROLS.join("+"),
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
