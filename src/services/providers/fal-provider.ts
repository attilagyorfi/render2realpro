/**
 * fal-provider.ts — Realism-pass adapter for Fal.ai
 *
 * History (kept for context, since the model choice is the single most
 * impactful knob in the whole product):
 *
 *   v1 — fal-ai/flux-pro/v1/canny: a pure text-to-image model that saw
 *        only the source's edge map. Without source pixels, it routinely
 *        repainted materials and even reinterpreted exteriors as
 *        interiors. Removed.
 *
 *   v2 — fal-ai/flux-general/image-to-image + Canny ControlNet: image-
 *        to-image with structural ControlNet. Geometry stable, but the
 *        model is fundamentally a TRANSFORMATION pipeline — turning the
 *        denoise knob down (strength 0.4) made the output near-identical
 *        to the source; turning it up (strength 0.55–0.70) added
 *        real materials but at the cost of redesigning surfaces the user
 *        wanted preserved exactly. There is no setting on a flux img2img
 *        pipeline that means "sharpen and enrich the existing pixels
 *        without inventing new ones" — that is a different model class.
 *
 *   v3 (this file) — fal-ai/clarity-upscaler: a detail-enhancement /
 *        super-resolution model in the SUPIR / Magnific family. It does
 *        exactly what the architectural-visualisation use case needs:
 *        upscales the source 2× and adds real photographic micro-detail
 *        (concrete porosity, metal panel seams, blade-level grass,
 *        asphalt aggregate) on the SAME surfaces — it doesn't repaint or
 *        reinvent. The `resemblance` knob anchors output to the source
 *        far more strongly than any Canny weight could.
 *
 * Notable behavioural shifts vs. v2:
 *   - Output resolution is ~2× the source (upscale_factor=2). The
 *     Before/After slider handles this transparently — both images are
 *     fit-to-container, aspect ratio is preserved.
 *   - The "Kreativitás" slider is now the model's `creativity` knob
 *     directly (0.1 = pure sharpening, 0.5+ = starts adding detail the
 *     source didn't have). Safe range narrowed to 0.10..0.70 in the UI.
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

const DEFAULT_MODEL = process.env.FAL_MODEL ?? "fal-ai/clarity-upscaler";
/**
 * Clarity's `creativity` knob: 0 = pure sharpening, no new detail; ~0.35
 * = Clarity's documented default, adds plausible micro-texture on
 * surfaces; >0.6 starts inventing detail the source never implied.
 * 0.35 is the safest first-run experience for architectural CG renders.
 */
const DEFAULT_CREATIVITY = Number(process.env.FAL_CREATIVITY ?? "0.35");
/**
 * Clarity's `resemblance` knob (0..3 in the API). Higher = sticks closer
 * to the source pixels. 1.5 is the architectural sweet spot: noticeable
 * material upgrade, but the building outline / openings / vehicles /
 * vegetation positions all stay locked.
 */
const DEFAULT_RESEMBLANCE = Number(process.env.FAL_RESEMBLANCE ?? "1.5");
/**
 * 2× is the right default for architectural renders shown on a normal
 * monitor — enough resolution to make textures visible without 4× output
 * file sizes (which slow the comparison slider and balloon storage).
 */
const DEFAULT_UPSCALE_FACTOR = Number(process.env.FAL_UPSCALE_FACTOR ?? "2");
const DEFAULT_INFERENCE_STEPS = Number(process.env.FAL_INFERENCE_STEPS ?? "18");
const DEFAULT_GUIDANCE_SCALE = Number(process.env.FAL_GUIDANCE_SCALE ?? "4");

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
  readonly name = "fal-clarity-upscaler";
  readonly label = "Fal.ai Clarity Upscaler (Architectural Detail Pass)";

  async generateRealismPass(
    input: ProviderGenerateInput
  ): Promise<ProviderGenerateResult> {
    ensureConfigured();
    const startedAt = Date.now();

    // The two per-generation knobs the workspace exposes:
    //   creativity — Clarity's detail-add aggressiveness. Slider range
    //                in the UI is 0.10..0.70; clamped here too for
    //                safety against bad env overrides.
    //   quality    — maps to Clarity inference steps. The Clarity
    //                default is 18; low and high give the user a
    //                speed/quality knob.
    const settings = (input.prompt.settings ?? {}) as Record<string, unknown>;
    const rawCreativity = Number(settings.creativity);
    const creativity = Number.isFinite(rawCreativity)
      ? Math.min(0.7, Math.max(0.1, rawCreativity))
      : DEFAULT_CREATIVITY;
    const steps =
      settings.quality === "low"
        ? 12
        : settings.quality === "high"
          ? 28
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
    // Clarity treats the prompt as a flavour hint for what KIND of
    // detail to add; with the high `resemblance` value below it cannot
    // use the prompt to redesign. Keep it short and oriented toward the
    // material categories typical in architectural exteriors.
    const promptParts: string[] = [
      "masterpiece, best quality, highres, photorealistic architectural exterior photograph, real building materials, sharp natural daylight, fine surface detail on concrete, metal, glass, asphalt and vegetation",
    ];
    if (input.prompt.presetName && input.prompt.presetName !== "custom") {
      promptParts.push(`Style hint: ${input.prompt.presetName}`);
    }
    if (input.prompt.customDirectives?.length) {
      promptParts.push(...input.prompt.customDirectives);
    }
    const prompt = promptParts.join(", ");

    // Negative prompt: workspace-supplied negative first (highest weight),
    // then the standing bans against fantasy redesigns, watermarks, and
    // composition changes. Even with high resemblance, this catches the
    // rare drift case (e.g., Clarity adding text on glass surfaces).
    const userNegative =
      typeof settings.negativePrompt === "string" && settings.negativePrompt.trim()
        ? `${settings.negativePrompt.trim()}, `
        : "";
    const negativePrompt =
      userNegative +
      "(worst quality, low quality, normal quality:2), painting, illustration, " +
      "fantasy, cartoon, redesigned building, different roof material, repainted facade, " +
      "new vehicles, new people, new windows, new doors, " +
      "added decoration, removed decoration, " +
      "watermark, stock photo watermark, sample text, letters, typography, " +
      "captions, logo, signature, branding overlay";

    // ── 4. Call Fal.ai — Clarity Upscaler ──────────────────────────────────
    const result = (await fal.subscribe(DEFAULT_MODEL, {
      input: {
        image_url: sourceUrl,
        prompt,
        negative_prompt: negativePrompt,
        creativity,
        resemblance: DEFAULT_RESEMBLANCE,
        upscale_factor: DEFAULT_UPSCALE_FACTOR,
        num_inference_steps: steps,
        guidance_scale: DEFAULT_GUIDANCE_SCALE,
        enable_safety_checker: false,
      },
      logs: false,
    })) as FalSubscribeResponse;

    // Clarity historically returned `image` (singular). Some Fal models
    // in this family return `images` (array). Support both shapes so a
    // schema tweak upstream doesn't break us silently.
    const generated = result.data?.image ?? result.data?.images?.[0];
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
      versionLabel: "fal-clarity-upscaler-realism-pass",
      bytes: generatedBytes,
    });

    return {
      filePath: saved.filePath,
      metadata: {
        provider: this.name,
        model: DEFAULT_MODEL,
        promptUsed: prompt,
        creativity,
        resemblance: DEFAULT_RESEMBLANCE,
        upscaleFactor: DEFAULT_UPSCALE_FACTOR,
        inferenceSteps: steps,
        guidanceScale: DEFAULT_GUIDANCE_SCALE,
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
