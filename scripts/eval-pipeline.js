#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * eval-pipeline.js — quality measurement harness for the realism pass
 *
 * The development plan (§4.4) calls for an "eval harness on a golden set"
 * as the prerequisite for any tuning. If you cannot objectively compare
 * two pipeline configurations, "I tweaked the parameters but it doesn't
 * get better" is guaranteed. This is the measurement substrate.
 *
 * What it does:
 *   1. Reads every .png / .jpg / .jpeg / .webp under eval/golden/
 *   2. Runs the Fal SDXL ControlNet Union pipeline on each with the
 *      config passed on the CLI (or the defaults below).
 *   3. Writes eval/results/<isotimestamp>-<label>/ containing per-image
 *      input/output/meta + manifest.json + a self-contained index.html
 *      for side-by-side human review.
 *
 * Parameterized so experiments are cheap (Phase 0 spirit):
 *   --controls=teed,depth   which ControlNets to drive (comma list)
 *   --strength=0.35         img2img denoise (lower = more faithful)
 *   --controlnet-scale=0.80 ControlNet conditioning weight (higher = tighter)
 *   --steps=30              inference steps
 *   --guidance=7.5          CFG scale
 *   --prompt=fidelity       prompt set: "fidelity" (default) or "legacy"
 *   --label=my-experiment   folder suffix + report title
 *
 * Supported --controls values (what the sdxl-controlnet-union endpoint
 * actually exposes): canny, teed, depth, normal, openpose, segmentation.
 * NOTE: lineart and mlsd are NOT available on this endpoint. TEED is the
 * clean/soft-edge detector — the low-noise alternative to Canny for the
 * "don't turn texture noise into fake geometry" problem.
 *
 * Usage:
 *   npm run eval
 *   npm run eval -- --controls=teed,depth --strength=0.35 --controlnet-scale=0.80 --label=teed-s035-cn080
 *   npm run eval -- --controls=canny,depth --strength=0.55 --label=canny-baseline
 *
 * The script duplicates fal-provider.ts's call shape rather than
 * importing it (standalone Node, no tsx). When a winning config is found
 * on the golden set, promote it into fal-provider.ts in one go.
 */

require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const GOLDEN_DIR = path.join(REPO_ROOT, "eval", "golden");
const RESULTS_DIR = path.join(REPO_ROOT, "eval", "results");
const SUPPORTED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/**
 * The exact control-image fields the fal-ai/sdxl-controlnet-union
 * endpoint accepts. Verified against the Fal API schema — lineart, mlsd,
 * hed, scribble are NOT on this endpoint. Each entry maps our short name
 * to the endpoint's <name>_image_url / <name>_preprocess field pair.
 */
const SUPPORTED_CONTROLS = [
  "canny",
  "teed",
  "depth",
  "normal",
  "openpose",
  "segmentation",
];

/**
 * Prompt sets. "legacy" is what R11/R12 shipped (scene-material heavy).
 * "fidelity" is the render-to-real tuned set: leads with camera/optics +
 * PBR materials, and the negative prompt is dominated by geometry-drift
 * and CG-look bans (the biggest lever for engineering fidelity).
 */
const PROMPT_SETS = {
  legacy: {
    positive: [
      "professional architectural exterior photography, photorealistic",
      "shot on Hasselblad H6D-400c, 85mm prime lens, sharp focus, fine grain",
      "weathered concrete with visible porosity, brushed aluminum sandwich panels with seam highlights, asphalt with realistic aggregate and tyre marks",
      "blade-level grass with colour variation, real glass with subtle sky reflections",
      "late afternoon natural sun, atmospheric haze between camera and building, soft contact shadows, ambient occlusion in eaves",
      "ultra realistic materials, 8k resolution, masterpiece",
    ].join(", "),
    negative: [
      "cgi, 3d render, computer graphics, video game, unreal engine, twinmotion, lumion",
      "plastic, smooth surface, oversaturated, flat colours, sterile, perfect",
      "painting, illustration, drawing, cartoon, anime, fantasy",
      "redesigned building, deformed geometry, extra windows, missing windows",
      "changed building shape, different roof material, repainted facade",
      "new vehicles, new people, added decoration, removed decoration",
      "watermark, sample text, letters, typography, logo, signature",
      "low quality, worst quality, blurry, jpeg artifacts",
    ].join(", "),
  },
  fidelity: {
    // Camera/optics + PBR materials first — steers toward a PHOTOGRAPH of
    // the existing structure, not a redesign.
    positive: [
      "hyper-realistic architectural photography, raw photo",
      "f/8, 35mm lens, physically based rendering materials",
      "realistic reflections, subtle dirt and weathering, highly detailed textures",
      "concrete porosity, brushed metal, real glass, natural daylight, soft contact shadows",
    ].join(", "),
    // Geometry-drift + CG-look bans dominate — this is the fidelity lever.
    negative: [
      "altered geometry, changed structure, hallucinated details, missing windows, extra windows",
      "distorted perspective, warped lines, deformed building",
      "3d render, cgi, plastic materials, sketch, painting, illustration, cartoon",
      "twinmotion, lumion, unreal engine, oversaturated, flat colours",
      "redesigned building, different roof material, repainted facade, new vehicles, new people",
      "watermark, sample text, letters, typography, logo, signature",
      "low quality, worst quality, blurry, jpeg artifacts",
    ].join(", "),
  },
};

const PIPELINE_DEFAULTS = {
  model: "fal-ai/sdxl-controlnet-union/image-to-image",
  controls: ["canny", "depth"],
  strength: 0.55,
  controlnetScale: 0.6,
  guidanceScale: 7.5,
  steps: 30,
  promptSet: "fidelity",
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq > 2) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[arg.slice(2)] = next;
        i++;
      } else {
        out[arg.slice(2)] = "true";
      }
    }
  }
  return out;
}

function resolveControls(raw) {
  if (!raw) return PIPELINE_DEFAULTS.controls;
  const picked = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const invalid = picked.filter((c) => !SUPPORTED_CONTROLS.includes(c));
  if (invalid.length) {
    console.error(
      `[eval] Unsupported control(s): ${invalid.join(", ")}.\n` +
        `[eval] This endpoint supports: ${SUPPORTED_CONTROLS.join(", ")}.\n` +
        (invalid.includes("lineart") || invalid.includes("mlsd")
          ? `[eval] Note: lineart/mlsd are NOT on fal-ai/sdxl-controlnet-union. ` +
            `Use "teed" for a clean, low-noise edge control (the anti-Canny).`
          : "")
    );
    process.exit(1);
  }
  if (picked.length === 0) return PIPELINE_DEFAULTS.controls;
  return picked;
}

function readGoldenImages() {
  if (!fs.existsSync(GOLDEN_DIR)) {
    console.error(
      `[eval] eval/golden/ does not exist. Create it and drop a few source renders in there.`
    );
    process.exit(1);
  }
  const files = fs
    .readdirSync(GOLDEN_DIR)
    .filter((name) => SUPPORTED_EXT.has(path.extname(name).toLowerCase()))
    .sort();
  if (files.length === 0) {
    console.error(
      `[eval] No supported images in eval/golden/. See eval/golden/README.md.`
    );
    process.exit(1);
  }
  return files.map((name) => path.join(GOLDEN_DIR, name));
}

function isoStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace(/-\d{3}/, "");
}

function mimeFor(ext) {
  const e = ext.toLowerCase();
  if (e === ".jpg" || e === ".jpeg") return "image/jpeg";
  if (e === ".webp") return "image/webp";
  return "image/png";
}

async function runPipelineOnImage({ fal, sharp, imagePath, params, prompts }) {
  const startedAt = Date.now();
  const bytes = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath);
  const sourceFile = new File(
    [new Uint8Array(bytes)],
    path.basename(imagePath),
    { type: mimeFor(ext) }
  );
  const sourceUrl = await fal.storage.upload(sourceFile);

  const seed = Math.floor(Math.random() * 2 ** 31);

  // Build the control fields dynamically from the selected control set.
  // Every selected control is fed from the same source URL with its
  // preprocessor enabled, so Fal derives the control map itself.
  const controlFields = {};
  for (const control of params.controls) {
    controlFields[`${control}_image_url`] = sourceUrl;
    controlFields[`${control}_preprocess`] = true;
  }

  const input = {
    image_url: sourceUrl,
    prompt: prompts.positive,
    negative_prompt: prompts.negative,
    ...controlFields,
    strength: params.strength,
    controlnet_conditioning_scale: params.controlnetScale,
    guidance_scale: params.guidanceScale,
    num_inference_steps: params.steps,
    seed,
  };

  const result = await fal.subscribe(params.model, { input, logs: false });
  const generated = result?.data?.image ?? result?.data?.images?.[0];
  if (!generated?.url) {
    throw new Error(
      `Fal returned no image. Raw response head: ${JSON.stringify(result).slice(0, 200)}`
    );
  }

  const dl = await fetch(generated.url);
  if (!dl.ok) {
    throw new Error(`Download failed: ${dl.status} ${dl.statusText}`);
  }
  const rawOut = Buffer.from(await dl.arrayBuffer());

  const srcMeta = await sharp(bytes).metadata();
  let outBytes = rawOut;
  let resampledFrom = null;
  if (srcMeta.width && srcMeta.height) {
    const outMeta = await sharp(rawOut).metadata();
    if (
      outMeta.width &&
      outMeta.height &&
      (outMeta.width !== srcMeta.width || outMeta.height !== srcMeta.height)
    ) {
      outBytes = Buffer.from(
        await sharp(rawOut)
          .resize(srcMeta.width, srcMeta.height, {
            kernel: sharp.kernel.lanczos3,
            fit: "fill",
          })
          .jpeg({ quality: 92 })
          .toBuffer()
      );
      resampledFrom = { width: outMeta.width, height: outMeta.height };
    }
  }

  return {
    output: {
      url: generated.url,
      width: generated.width ?? null,
      height: generated.height ?? null,
    },
    bytes: outBytes,
    resampledFrom,
    seed,
    sourceWidth: srcMeta.width ?? null,
    sourceHeight: srcMeta.height ?? null,
    requestId: result?.requestId ?? null,
    timings: result?.data?.timings ?? null,
    wallClockMs: Date.now() - startedAt,
  };
}

function buildIndexHtml({ manifest, perImage }) {
  const rows = perImage
    .map(
      (img) => `
    <article>
      <h2>${img.name}</h2>
      <p class="meta">
        Source: ${img.sourceWidth ?? "?"}×${img.sourceHeight ?? "?"} ·
        Output (raw): ${img.outputWidth ?? "?"}×${img.outputHeight ?? "?"} ·
        Fal: ${img.wallClockMs} ms · Seed: ${img.seed}
        ${img.error ? `<br><strong style="color:#f87171">Error: ${img.error}</strong>` : ""}
      </p>
      <div class="pair">
        <figure><img src="${img.inputFile}" alt="source"><figcaption>source</figcaption></figure>
        ${img.outputFile ? `<figure><img src="${img.outputFile}" alt="output"><figcaption>output</figcaption></figure>` : `<figure class="missing"><figcaption>(no output)</figcaption></figure>`}
      </div>
    </article>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Eval ${manifest.label} — ${manifest.timestamp}</title>
  <style>
    :root { color-scheme: dark; }
    body { background:#0a0a0b; color:#e7e7ea; font-family:-apple-system,Segoe UI,sans-serif; margin:0; padding:24px; }
    header { border-bottom:1px solid #2a2a2f; padding-bottom:16px; margin-bottom:24px; }
    h1 { margin:0 0 8px 0; font-size:18px; }
    .params { font-family:ui-monospace,Menlo,monospace; font-size:12px; color:#9ca3af; }
    .params code { background:#18181b; padding:2px 6px; border-radius:4px; margin-right:8px; display:inline-block; margin-bottom:4px; }
    article { border:1px solid #2a2a2f; border-radius:8px; padding:16px; margin-bottom:24px; }
    h2 { margin:0 0 8px 0; font-size:14px; font-family:ui-monospace,Menlo,monospace; }
    .meta { color:#9ca3af; font-size:12px; margin:0 0 12px 0; }
    .pair { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    figure { margin:0; }
    figure img { width:100%; height:auto; display:block; border-radius:4px; }
    figcaption { font-size:11px; color:#71717a; padding:4px 0 0 2px; }
    figure.missing { background:#18181b; border:1px dashed #3f3f46; border-radius:4px; min-height:200px; display:flex; align-items:center; justify-content:center; }
  </style>
</head>
<body>
  <header>
    <h1>Eval run — <code>${manifest.label}</code> — ${manifest.timestamp}</h1>
    <p class="params">
      <code>model=${manifest.params.model}</code>
      <code>controls=${manifest.params.controls.join("+")}</code>
      <code>strength=${manifest.params.strength}</code>
      <code>cn-scale=${manifest.params.controlnetScale}</code>
      <code>steps=${manifest.params.steps}</code>
      <code>guidance=${manifest.params.guidanceScale}</code>
      <code>prompt=${manifest.params.promptSet}</code>
      <code>n=${perImage.length}</code>
      <code>total=${(manifest.totalWallClockMs / 1000).toFixed(1)} s</code>
      <code>avg=${Math.round(manifest.totalWallClockMs / Math.max(1, perImage.length))} ms</code>
    </p>
  </header>
  ${rows}
</body>
</html>`;
}

async function main() {
  if (!process.env.FAL_KEY) {
    console.error("[eval] FAL_KEY missing from .env. Set it before running.");
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const promptSet = args.prompt ?? PIPELINE_DEFAULTS.promptSet;
  if (!PROMPT_SETS[promptSet]) {
    console.error(
      `[eval] Unknown --prompt=${promptSet}. Available: ${Object.keys(PROMPT_SETS).join(", ")}.`
    );
    process.exit(1);
  }
  const params = {
    model: args.model ?? PIPELINE_DEFAULTS.model,
    controls: resolveControls(args.controls),
    strength: Number(args.strength ?? PIPELINE_DEFAULTS.strength),
    controlnetScale: Number(
      args["controlnet-scale"] ?? PIPELINE_DEFAULTS.controlnetScale
    ),
    guidanceScale: Number(args.guidance ?? PIPELINE_DEFAULTS.guidanceScale),
    steps: Number(args.steps ?? PIPELINE_DEFAULTS.steps),
    promptSet,
  };
  const prompts = PROMPT_SETS[promptSet];
  const label = (args.label ?? "default")
    .replace(/[^a-z0-9._-]/gi, "-")
    .slice(0, 40);

  const ts = isoStamp();
  const runDir = path.join(RESULTS_DIR, `${ts}-${label}`);
  fs.mkdirSync(runDir, { recursive: true });

  const golden = readGoldenImages();
  console.log(
    `[eval] ${golden.length} image(s) from eval/golden/ → ${path.relative(REPO_ROOT, runDir)}`
  );
  console.log(`[eval] params:`, params);

  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: process.env.FAL_KEY });
  const sharp = require("sharp");

  const perImage = [];
  const runStartedAt = Date.now();

  for (const imagePath of golden) {
    const baseName = path.basename(imagePath, path.extname(imagePath));
    const ext = path.extname(imagePath);
    const inputFile = `${baseName}.input${ext}`;
    const outputFile = `${baseName}.output.jpg`;
    const metaFile = `${baseName}.meta.json`;

    fs.copyFileSync(imagePath, path.join(runDir, inputFile));

    process.stdout.write(`[eval] ${baseName} ... `);
    try {
      const r = await runPipelineOnImage({
        fal,
        sharp,
        imagePath,
        params,
        prompts,
      });
      fs.writeFileSync(path.join(runDir, outputFile), r.bytes);
      const meta = {
        name: baseName,
        params,
        promptSet,
        sourceWidth: r.sourceWidth,
        sourceHeight: r.sourceHeight,
        outputWidth: r.output.width,
        outputHeight: r.output.height,
        resampledFrom: r.resampledFrom,
        seed: r.seed,
        falRequestId: r.requestId,
        falTimings: r.timings,
        wallClockMs: r.wallClockMs,
        outputUrl: r.output.url,
      };
      fs.writeFileSync(
        path.join(runDir, metaFile),
        JSON.stringify(meta, null, 2)
      );
      perImage.push({
        name: baseName,
        inputFile,
        outputFile,
        sourceWidth: r.sourceWidth,
        sourceHeight: r.sourceHeight,
        outputWidth: r.output.width,
        outputHeight: r.output.height,
        wallClockMs: r.wallClockMs,
        seed: r.seed,
      });
      console.log(`OK (${r.wallClockMs} ms)`);
    } catch (err) {
      console.log(`FAIL — ${err.message}`);
      const errMeta = {
        name: baseName,
        params,
        promptSet,
        error: String(err.message ?? err),
      };
      fs.writeFileSync(
        path.join(runDir, metaFile),
        JSON.stringify(errMeta, null, 2)
      );
      perImage.push({
        name: baseName,
        inputFile,
        outputFile: null,
        error: String(err.message ?? err),
        sourceWidth: null,
        sourceHeight: null,
        outputWidth: null,
        outputHeight: null,
        wallClockMs: 0,
        seed: null,
      });
    }
  }

  const totalWallClockMs = Date.now() - runStartedAt;
  const manifest = {
    timestamp: ts,
    label,
    params,
    promptSet,
    promptHashes: {
      positive: hashString(prompts.positive),
      negative: hashString(prompts.negative),
    },
    prompts: {
      positive: prompts.positive,
      negative: prompts.negative,
    },
    images: perImage.map((p) => ({
      name: p.name,
      ok: !p.error,
      wallClockMs: p.wallClockMs,
      seed: p.seed,
    })),
    totalWallClockMs,
    avgWallClockMs:
      perImage.length === 0
        ? 0
        : Math.round(totalWallClockMs / perImage.length),
  };
  fs.writeFileSync(
    path.join(runDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  fs.writeFileSync(
    path.join(runDir, "index.html"),
    buildIndexHtml({ manifest, perImage })
  );

  const failed = perImage.filter((p) => p.error).length;
  console.log(
    `[eval] done. ${perImage.length - failed}/${perImage.length} OK, total ${(totalWallClockMs / 1000).toFixed(1)} s.`
  );
  console.log(
    `[eval] open: ${path.relative(REPO_ROOT, path.join(runDir, "index.html"))}`
  );
}

function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

main().catch((err) => {
  console.error("[eval] fatal:", err);
  process.exit(1);
});
