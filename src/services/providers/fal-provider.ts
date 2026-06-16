/**
 * fal-provider.ts — Realism-pass adapter for Fal.ai
 *
 * History (kept for context, since model choice is the single most
 * impactful knob in the whole product):
 *
 *   v1 — fal-ai/flux-pro/v1/canny: edge-only text-to-image, repainted
 *        materials and reinterpreted exteriors as interiors. Removed.
 *
 *   v2 — fal-ai/flux-general/image-to-image + Canny ControlNet: low
 *        strength = near-identical output, high strength = redesigned
 *        materials. No middle ground. Removed.
 *
 *   v3 — fal-ai/clarity-upscaler: SD1.5-based Magnific clone. After
 *        4 rounds of recalibration (R6..R9) the model is reachable
 *        and the field names are correct, but the user reports the
 *        output still looks indistinguishable from the source. SD1.5
 *        backbone is materially weaker than SDXL for "make CG photo-
 *        real" — published Magnific recipes get away with it via
 *        very specific scheduler + denoise combinations we can't
 *        fully tune through the Fal wrapper.
 *
 *   v4 (this file) — fal-ai/supir: SDXL-based image restoration model
 *        in the same family as Magnific's higher-tier "Precision V2"
 *        stack. Designed exactly for "low-quality / synthetic input
 *        → photoreal output while respecting content". Heavier than
 *        Clarity (30–60 s typical wall-clock), which is itself a good
 *        signal that the model is actually running — Clarity's sub-
 *        second returns were the first hint that something was wrong
 *        upstream of the model.
 *
 * Server-side logging is loud on purpose now: after several rounds of
 * "results look the same", we cannot afford a silent mock-fallback
 * regression to go unnoticed again. Every Fal call prints model +
 * params + wall-clock to the dev server terminal.
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

const DEFAULT_MODEL = process.env.FAL_MODEL ?? "fal-ai/supir";
/**
 * SUPIR upsampling ratio. 2 is the standard restoration ratio: the
 * model paints detail into a 2× canvas, then sharp downscales back to
 * source dimensions (the painted detail survives the resample as
 * visibly sharper texture at the user's resolution).
 */
const DEFAULT_UPSAMPLING_RATIO = Number(process.env.FAL_UPSAMPLING_RATIO ?? "2");
/**
 * "Q" (Quality) mode in SUPIR: aggressive restoration with detail
 * invention. "F" (Fidelity) sticks closer to source but adds less
 * material detail. For CG-render → photoreal, Q is the right tier.
 */
const DEFAULT_MODEL_TYPE = process.env.FAL_MODEL_TYPE ?? "Q";

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
  // Identifier kept stable across model changes (v1..v4) because
  // provider-registry.ts and the user's .env both reference this
  // exact string. R6's rename to "fal-clarity-upscaler" silently
  // broke resolveProvider — every generation routed to mock for
  // multiple sprints. The label can evolve; the name cannot.
  readonly name = "fal-controlnet";
  readonly label = "Fal.ai SUPIR (Architectural Photo Restoration)";

  async generateRealismPass(
    input: ProviderGenerateInput
  ): Promise<ProviderGenerateResult> {
    ensureConfigured();
    const startedAt = Date.now();

    const settings = (input.prompt.settings ?? {}) as Record<string, unknown>;
    // SUPIR doesn't expose Clarity's `creativity` knob directly; the
    // CFG scale (s_cfg_end) is the closest analogue. The workspace
    // slider stays 0.10..0.70; we map it to s_cfg_end 4..9 (SUPIR's
    // documented range), with the slider's 0.55 mid-point landing
    // around s_cfg=6.5 which is the published sweet spot.
    const rawCreativity = Number(settings.creativity);
    const clampedCreativity = Number.isFinite(rawCreativity)
      ? Math.min(0.7, Math.max(0.1, rawCreativity))
      : 0.55;
    const sCfgEnd = 4 + clampedCreativity * (9 - 4) * (1 / 0.7);

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

    // ── 3. Build prompt ───────────────────────────────────────────────────
    // Photograph-first pattern (camera + materials + atmosphere), not
    // scene-first — describing the SCENE invites redesign of its
    // contents, describing the PHOTO steers the model to repaint
    // surfaces while preserving layout.
    const promptParts: string[] = [
      "professional architectural exterior photography",
      "shot on Hasselblad H6D, 85mm prime lens, fine grain",
      "weathered concrete with visible porosity, brushed aluminum panels with seam highlights",
      "asphalt aggregate, blade-level grass texture, real glass reflections",
      "late afternoon natural sun, atmospheric haze, soft contact shadows, ambient occlusion",
      "ultra realistic materials, photorealistic, sharp focus, 8k, masterpiece",
    ];
    if (input.prompt.presetName && input.prompt.presetName !== "custom") {
      promptParts.push(`style hint: ${input.prompt.presetName}`);
    }
    if (input.prompt.customDirectives?.length) {
      promptParts.push(...input.prompt.customDirectives);
    }
    const prompt = promptParts.join(", ");

    // Negative prompt — keywords that describe the INPUT push the
    // diffusion AWAY from the CG-look the source has.
    const userNegative =
      typeof settings.negativePrompt === "string" && settings.negativePrompt.trim()
        ? `${settings.negativePrompt.trim()}, `
        : "";
    const negativePrompt =
      userNegative +
      "cgi, 3d render, computer graphics, video game, unreal engine, " +
      "plastic, smooth surface, oversaturated, flat colours, " +
      "painting, illustration, drawing, cartoon, anime, fantasy, " +
      "redesigned building, deformed geometry, extra windows, missing windows, " +
      "changed building shape, different roof material, repainted facade, " +
      "new vehicles, new people, added decoration, removed decoration, " +
      "watermark, sample text, letters, typography, logo, signature, " +
      "low quality, worst quality, blurry";

    const seed = Math.floor(Math.random() * 2 ** 31);

    const supirInput = {
      image_url: sourceUrl,
      prompt,
      negative_prompt: negativePrompt,
      upsampling_ratio: DEFAULT_UPSAMPLING_RATIO,
      model_type: DEFAULT_MODEL_TYPE,
      s_cfg_end: Number(sCfgEnd.toFixed(2)),
      seed,
    };

    // ── 4. Call SUPIR — with loud logging ─────────────────────────────────
    console.log(
      `[fal-provider] → Calling ${DEFAULT_MODEL} (project=${input.projectId.slice(0, 8)}…) with:`,
      {
        upsampling_ratio: supirInput.upsampling_ratio,
        model_type: supirInput.model_type,
        s_cfg_end: supirInput.s_cfg_end,
        creativity_slider: clampedCreativity,
        seed: supirInput.seed,
        prompt_chars: prompt.length,
        negative_chars: negativePrompt.length,
      }
    );

    const result = (await fal.subscribe(DEFAULT_MODEL, {
      input: supirInput,
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

    // ── 5b. Downscale to source dimensions ───────────────────────────────
    const sourceMeta = await sharp(imageBytes).metadata();
    const targetWidth = sourceMeta.width ?? input.sourceWidth;
    const targetHeight = sourceMeta.height ?? input.sourceHeight;
    let generatedBytes: Buffer = rawGeneratedBytes;
    let downscaledFrom: { width: number; height: number } | null = null;
    if (targetWidth && targetHeight) {
      const upscaled = await sharp(rawGeneratedBytes).metadata();
      if (
        upscaled.width &&
        upscaled.height &&
        (upscaled.width !== targetWidth || upscaled.height !== targetHeight)
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
        downscaledFrom = { width: upscaled.width, height: upscaled.height };
      }
    }

    // ── 6. Persist ────────────────────────────────────────────────────────
    const saved = await writeGeneratedVersionBuffer({
      projectId: input.projectId,
      sourcePath: input.sourcePath,
      versionLabel: "fal-supir-realism-pass",
      bytes: generatedBytes,
    });

    const totalMs = Date.now() - startedAt;
    console.log(
      `[fal-provider] ✓ Persisted to ${saved.filePath} (Fal ${falWallClockMs} ms, ` +
        `total ${totalMs} ms${downscaledFrom ? `, downscaled from ${downscaledFrom.width}×${downscaledFrom.height}` : ""})`
    );

    return {
      filePath: saved.filePath,
      metadata: {
        provider: this.name,
        model: DEFAULT_MODEL,
        promptUsed: prompt,
        creativitySlider: clampedCreativity,
        sCfgEnd: supirInput.s_cfg_end,
        upsamplingRatio: DEFAULT_UPSAMPLING_RATIO,
        modelType: DEFAULT_MODEL_TYPE,
        seed: result.data?.seed ?? supirInput.seed,
        timings: result.data?.timings ?? null,
        generatedUrl: generated.url,
        generatedWidth: generated.width ?? null,
        generatedHeight: generated.height ?? null,
        downscaledFromWidth: downscaledFrom?.width ?? null,
        downscaledFromHeight: downscaledFrom?.height ?? null,
        requestId: result.requestId ?? null,
        falWallClockMs,
      },
      processingTimeMs: totalMs,
    };
  }
}
