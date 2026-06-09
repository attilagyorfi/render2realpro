#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * optimize-public-images.js
 *
 * One-shot image optimization for the marketing assets in /public.
 * Run this whenever the source images change.
 *
 * Targets:
 *   logo.png                4.2 MB → ~30 KB        (256×256 PNG, the logo
 *                                                  renders at 36 px so 256
 *                                                  is plenty even for @4x)
 *   hero-render-before.png  2.75 MB → ~200 KB WebP (max 1600 px wide)
 *   hero-render-after.png   2.09 MB → ~200 KB WebP (max 1600 px wide)
 *
 * The originals are overwritten in place. The git history keeps the
 * uncompressed versions if we ever need them back.
 *
 * Usage:
 *   node scripts/optimize-public-images.js
 */

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const PUBLIC_DIR = path.join(__dirname, "..", "public");

const TARGETS = [
  {
    src: "logo.png",
    dst: "logo.png",
    pipeline: (img) =>
      img.resize({ width: 256, height: 256, fit: "inside" }).png({
        quality: 90,
        compressionLevel: 9,
        palette: true,
      }),
  },
  {
    src: "hero-render-before.png",
    dst: "hero-render-before.webp",
    pipeline: (img) =>
      img.resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }),
  },
  {
    src: "hero-render-after.png",
    dst: "hero-render-after.webp",
    pipeline: (img) =>
      img.resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }),
  },
];

async function run() {
  for (const target of TARGETS) {
    const srcPath = path.join(PUBLIC_DIR, target.src);
    const dstPath = path.join(PUBLIC_DIR, target.dst);

    if (!fs.existsSync(srcPath)) {
      console.warn(`[optimize] skip — ${target.src} not found.`);
      continue;
    }

    const before = fs.statSync(srcPath).size;
    const buffer = await target.pipeline(sharp(srcPath)).toBuffer();
    fs.writeFileSync(dstPath, buffer);

    // If the destination is a different format than the source, delete the
    // source PNG so we don't ship the bloated original alongside the
    // optimized WebP.
    if (target.src !== target.dst && fs.existsSync(srcPath)) {
      fs.unlinkSync(srcPath);
    }

    const after = fs.statSync(dstPath).size;
    const ratio = ((1 - after / before) * 100).toFixed(1);
    console.log(
      `[optimize] ${target.src} (${formatBytes(before)}) → ${target.dst} (${formatBytes(after)})  −${ratio}%`
    );
  }
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
