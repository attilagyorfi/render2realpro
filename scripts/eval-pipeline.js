#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * eval-pipeline.js — quality measurement harness for the realism pass
 *
 * The development plan (§4.4) calls for an "eval harness on a golden set"
 * as the prerequisite for any further tuning. The point: if you cannot
 * objectively compare two pipeline configurations, "I tweaked the
 * parameters but it doesn't get better" is a guaranteed outcome. This
 * script is the measurement substrate.
 *
 * What it does:
 *   1. Reads every .png / .jpg / .jpeg / .webp under eval/golden/
 *   2. For each, runs the current Fal SDXL ControlNet Union pipeline
 *      (Canny + Depth, the recipe shipped in R11) with the parameters
 *      passed on the CLI (or the in-file defaults below).
 *   3. Writes, under eval/results/<isotimestamp>-<label>/:
 *        - <name>.input.{ext}    — copy of the source
 *        - <name>.output.jpg     — model output, downscaled to source dims
 *        - <name>.meta.json      — per-image params, timings, Fal request id
 *        - manifest.json         — run-level summary (all params + totals)
 *        - index.html            — side-by-side gallery for human review
 *   4. Prints a one-line summary per image to the terminal so you can
 *      sanity-check progress without watching the folder.
 *
 * What it does NOT do (yet):
 *   - Compute pixel-level metrics (SSIM, edge-IoU, CLIP-aesthetic). Plan
 *     §4.4 lists those as the second-stage upgrade once we are confident
 *     the side-by-side visual review is producing actionable signal.
 *   - Compare two runs automatically. Open two index.html files in two
 *     tabs for now; the manifest JSON makes it easy to script a diff
 *     later.
 *
 * Usage:
 *   npm run eval
 *   npm run eval -- --strength=0.65 --label=stronger-denoise
 *   npm run eval -- --steps=18 --controlnet-scale=0.7 --label=fast-rigid
 *
 * The script intentionally duplicates fal-provider.ts's call shape rather
 * than importing it — running TypeScript via the Next.js path-alias
 * resolver inside a standalone Node script would need tsx or a build
 * step, and we want this harness to stay runnable in a fresh checkout
 * with `npm install && npm run eval`. When you change the provider,
 * update the matching section below.
 */

require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const GOLDEN_DIR = path.join(REPO_ROOT, "eval", "golden");
const RESULTS_DIR = path.join(REPO_ROOT, "eval", "results");
const SUPPORTED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function parseArgs(argv) {
  // Minimal CLI parser — supports --key=value and --key value forms.
  // npm passes argv after "--" through unchanged so both work from
  // `npm run eval -- --strength=0.65` and `node scripts/eval-pipeline.js
  // --strength=0.65`.
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
      `[eval] No supported images in eval/golden/. See eval/golden/README.md for guidance on what to put there.`
    );
    process.exit(1);
  }
  return files.map((name) => path.join(GOLDEN_DIR, name));
}

function isoStamp() {
  // 2026-06-16T16-58-12Z, filesystem-safe (no colons).
  return new Date().toISOString().replace(/[:.]/g, "-").replace(/-\d{3}/, "");
}

function mimeFor(ext) {
  const e = ext.toLowerCase();
  if (e === ".jpg" || e === ".jpeg") return "image/jpeg";
  if (e === ".webp") return "image/webp";
  return "image/png";
}

/* ──────────────────────────────────────────────────────────────────────
 * Provider call. KEEP IN SYNC WITH src/services/providers/fal-provider.ts.
 * When you change parameters there, update the same fields here so the
 * harness measures the production pipeline, not a stale copy of it.
 * ────────────────────────────────────────────────────────────────────── */

const PIPELINE_DEFAULTS = {
  model: "fal-ai/sdxl-controlnet-union/image-to-image",
  strength: 0.55,
  controlnetScale: 0.6,
  guidanceScale: 7.5,
  steps: 30,
};

const POSITIVE_PROMPT = [
  "professional architectural exterior photography, photorealistic",
  "shot on Hasselblad H6D-400c, 85mm prime lens, sharp focus, fine grain",
  "weathered concrete with visible porosity, brushed aluminum sandwich panels with seam highlights, asphalt with realistic aggregate and tyre marks",
  "blade-level grass with colour variation, real glass with subtle sky reflections",
  "late afternoon natural sun, atmospheric haze between camera and building, soft contact shadows, ambient occlusion in eaves",
  "ultra realistic materials, 8k resolution, masterpiece",
].join(", ");

const NEGATIVE_PROMPT = [
  "cgi, 3d render, computer graphics, video game, unreal engine, twinmotion, lumion",
  "plastic, smooth surface, oversaturated, flat colours, sterile, perfect",
  "painting, illustration, drawing, cartoon, anime, fantasy",
  "redesigned building, deformed geometry, extra windows, missing windows",
  "changed building shape, different roof material, repainted facade",
  "new vehicles, new people, added decoration, removed decoration",
  "watermark, sample text, letters, typography, logo, signature",
  "low quality, worst quality, blurry, jpeg artifacts",
].join(", ");

async function runPipelineOnImage({ fal, sharp, imagePath, params }) {
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

  const input = {
    image_url: sourceUrl,
    prompt: POSITIVE_PROMPT,
    negative_prompt: NEGATIVE_PROMPT,
    canny_image_url: sourceUrl,
    canny_preprocess: true,
    depth_image_url: sourceUrl,
    depth_preprocess: true,
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

  // Resample to source dimensions so the side-by-side comparison is
  // fair (same canvas size, only pixels differ).
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
    input,
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

/* ──────────────────────────────────────────────────────────────────────
 * HTML report generator.
 * ────────────────────────────────────────────────────────────────────── */

function buildIndexHtml({ manifest, perImage }) {
  // Self-contained HTML — no CSS framework, no JS bundle. Two columns
  // per row (source / output), filename + per-image timing on top of
  // each pair, manifest params in the top banner.
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
    h1 { margin:0 0 4px 0; font-size:18px; }
    .params { font-family:ui-monospace,Menlo,monospace; font-size:12px; color:#9ca3af; }
    .params code { background:#18181b; padding:2px 6px; border-radius:4px; margin-right:8px; }
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
      <code>strength=${manifest.params.strength}</code>
      <code>cn-scale=${manifest.params.controlnetScale}</code>
      <code>steps=${manifest.params.steps}</code>
      <code>guidance=${manifest.params.guidanceScale}</code>
      <code>controlnets=canny+depth</code>
      <code>n=${perImage.length}</code>
      <code>total=${(manifest.totalWallClockMs / 1000).toFixed(1)} s</code>
      <code>avg=${Math.round(manifest.totalWallClockMs / Math.max(1, perImage.length))} ms</code>
    </p>
  </header>
  ${rows}
</body>
</html>`;
}

/* ──────────────────────────────────────────────────────────────────────
 * Main.
 * ────────────────────────────────────────────────────────────────────── */

async function main() {
  if (!process.env.FAL_KEY) {
    console.error("[eval] FAL_KEY missing from .env. Set it before running.");
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const params = {
    model: args.model ?? PIPELINE_DEFAULTS.model,
    strength: Number(args.strength ?? PIPELINE_DEFAULTS.strength),
    controlnetScale: Number(
      args["controlnet-scale"] ?? PIPELINE_DEFAULTS.controlnetScale
    ),
    guidanceScale: Number(args.guidance ?? PIPELINE_DEFAULTS.guidanceScale),
    steps: Number(args.steps ?? PIPELINE_DEFAULTS.steps),
  };
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
      });
      fs.writeFileSync(path.join(runDir, outputFile), r.bytes);
      const meta = {
        name: baseName,
        params,
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
    promptHashes: {
      // Hash so manifest diffs make prompt drift obvious without
      // embedding the whole prompt in every result folder.
      positive: hashString(POSITIVE_PROMPT),
      negative: hashString(NEGATIVE_PROMPT),
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
  // Simple non-crypto digest — enough to spot prompt drift between runs.
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
