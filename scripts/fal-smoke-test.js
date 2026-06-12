#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * fal-smoke-test.js
 *
 * Standalone validation harness for the realism-pass Fal call. Mirrors
 * src/services/providers/fal-provider.ts exactly (model, prompt,
 * ControlNet, tunables) but runs outside Next.js, so the operator (or an
 * AI agent) can iterate on FAL_STRENGTH / FAL_CONTROL_WEIGHT without
 * clicking through the UI or spinning up the dev server.
 *
 * Usage:
 *   node scripts/fal-smoke-test.js <imagePath> [strength] [controlWeight] [controlPath|none]
 *
 * Examples:
 *   node scripts/fal-smoke-test.js public/test-render.png
 *   node scripts/fal-smoke-test.js storage/projects/<id>/originals/<file>.png 0.25 0.8
 *   node scripts/fal-smoke-test.js <file>.png 0.4 0 none          # img2img only, no ControlNet
 *
 * Output lands in storage/smoke-tests/ (gitignored) with the parameters
 * embedded in the filename, so A/B runs are easy to compare.
 */

require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const [, , imagePathArg, strengthArg, controlWeightArg, controlPathArg] = process.argv;
  if (!imagePathArg) {
    console.error("Usage: node scripts/fal-smoke-test.js <imagePath> [strength] [controlWeight]");
    process.exit(1);
  }
  if (!process.env.FAL_KEY) {
    console.error("FAL_KEY missing from .env");
    process.exit(1);
  }

  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: process.env.FAL_KEY });

  const model = process.env.FAL_MODEL ?? "fal-ai/flux-general/image-to-image";
  const strength = Number(strengthArg ?? process.env.FAL_STRENGTH ?? "0.4");
  const controlWeight = Number(controlWeightArg ?? process.env.FAL_CONTROL_WEIGHT ?? "0.65");
  const steps = Number(process.env.FAL_INFERENCE_STEPS ?? "30");
  const guidance = Number(process.env.FAL_GUIDANCE_SCALE ?? "3.5");
  const controlPath =
    controlPathArg ?? process.env.FAL_CONTROL_PATH ?? "InstantX/FLUX.1-dev-Controlnet-Canny";
  const useControlnet = controlPath !== "none";

  const imagePath = path.resolve(imagePathArg);
  const bytes = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";

  console.log(
    `[smoke] model=${model} strength=${strength} controlnet=${useControlnet ? `${controlPath}@${controlWeight}` : "OFF"} steps=${steps} guidance=${guidance}`
  );
  console.log(`[smoke] uploading ${path.basename(imagePath)} (${(bytes.length / 1024).toFixed(0)} KB)...`);

  const sourceUrl = await fal.storage.upload(
    new File([new Uint8Array(bytes)], path.basename(imagePath), { type: mime })
  );
  console.log(`[smoke] uploaded`);

  // Prompt mirrors fal-provider.ts verbatim (with the commercial preset).
  const prompt = [
    "Photorealistic architectural exterior photography, professional reference photo of an existing building, true-to-source materials, natural outdoor daylight, accurate contact shadows, atmospheric haze.",
    "Subtly improve surface textures and lighting realism while keeping every building element, vehicle, vegetation, and material exactly as in the source.",
    "Preset: Commercial Architecture Realism.",
  ].join(" ");
  const negativePrompt =
    "redesigned building, different roof material, repainted facade, " +
    "new vehicles, new people, different camera angle, indoor scene, " +
    "fantasy architecture, cartoon style, illustration, low quality, " +
    "extra elements, missing elements";

  const startedAt = Date.now();
  console.log(`[smoke] calling ${model} ...`);

  let result;
  try {
    const input = {
      prompt,
      image_url: sourceUrl,
      strength,
      image_size: "landscape_16_9",
      num_inference_steps: steps,
      guidance_scale: guidance,
      negative_prompt: negativePrompt,
      num_images: 1,
      output_format: "jpeg",
    };
    if (useControlnet) {
      input.controlnets = [
        {
          path: controlPath,
          control_image_url: sourceUrl,
          conditioning_scale: controlWeight,
        },
      ];
    }
    result = await fal.subscribe(model, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status) process.stdout.write(`\r[smoke] queue: ${update.status}        `);
      },
    });
  } catch (err) {
    console.error(`\n[smoke] FAILED after ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
    // Fal ApiError carries the validation detail in err.body
    if (err && typeof err === "object" && "body" in err) {
      console.error("[smoke] error body:", JSON.stringify(err.body, null, 2));
    } else {
      console.error(err);
    }
    process.exit(2);
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const imageUrl = result?.data?.images?.[0]?.url ?? result?.data?.image?.url;
  if (!imageUrl) {
    console.error(`\n[smoke] no image in response:`, JSON.stringify(result).slice(0, 400));
    process.exit(3);
  }

  const dl = await fetch(imageUrl);
  const outBytes = Buffer.from(await dl.arrayBuffer());
  const outDir = path.resolve("storage/smoke-tests");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(
    outDir,
    `smoke_s${strength}_c${controlWeight}_${Date.now()}.jpg`
  );
  fs.writeFileSync(outFile, outBytes);

  console.log(`\n[smoke] OK in ${elapsed}s — saved: ${outFile} (${(outBytes.length / 1024).toFixed(0)} KB)`);
  console.log(`[smoke] seed=${result?.data?.seed ?? "?"} requestId=${result?.requestId ?? "?"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
