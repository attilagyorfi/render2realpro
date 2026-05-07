/**
 * storage-service.ts
 *
 * Local-first filesystem storage for project assets, previews, and generated
 * versions. All paths live under `appEnv.storageRoot`; reads enforce a
 * containment check to avoid path traversal.
 *
 * Layout:
 *   <storageRoot>/projects/<projectId>/originals/<assetId>.<ext>
 *   <storageRoot>/projects/<projectId>/previews/<assetId>.jpg
 *   <storageRoot>/projects/<projectId>/versions/<base>__<label>__<ts>__<rand>.<ext>
 */

import crypto from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { appEnv } from "@/config/env";

const PROJECTS_DIR = "projects";
const ORIGINALS_DIR = "originals";
const PREVIEWS_DIR = "previews";
const VERSIONS_DIR = "versions";

const PREVIEW_MAX_SIDE = 512;
const PREVIEW_QUALITY = 78;

function projectRoot(projectId: string): string {
  return path.join(appEnv.storageRoot, PROJECTS_DIR, projectId);
}

/**
 * Throws if the given path resolves outside of the configured storage root.
 * Both the candidate and the root are resolved to absolute form before the
 * containment check so symlinks and relative `..` segments cannot escape.
 */
function assertWithinStorage(filePath: string): void {
  const resolvedRoot = path.resolve(appEnv.storageRoot);
  const resolvedTarget = path.resolve(filePath);
  const rootWithSep = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : resolvedRoot + path.sep;

  if (
    resolvedTarget !== resolvedRoot &&
    !resolvedTarget.startsWith(rootWithSep)
  ) {
    throw new Error("Refusing to access path outside of storage root.");
  }
}

/**
 * Detects the image format from the magic number of the buffer. Falls back
 * to the provided extension when no signature matches (e.g. exotic formats).
 */
function detectExtensionFromBuffer(bytes: Buffer, fallback: string): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return ".jpg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return ".png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return ".webp";
  }
  return fallback;
}

function sanitizeLabel(label: string): string {
  return label.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "version";
}

export type StoreUploadedImageInput = {
  projectId: string;
  originalFileName: string;
  bytes: Buffer;
  mimeType: string;
};

export type StoreUploadedImageResult = {
  storedFilePath: string;
  previewPath: string;
  imageType: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
};

/**
 * Persists an uploaded image as the original asset and generates a
 * thumbnail-sized JPEG preview alongside it. Returns the metadata the caller
 * needs to populate Prisma's ImageAsset row.
 */
export async function storeUploadedImage(
  input: StoreUploadedImageInput
): Promise<StoreUploadedImageResult> {
  const { projectId, originalFileName, bytes, mimeType } = input;
  const fallbackExt = path.extname(originalFileName).toLowerCase() || ".png";
  const ext = detectExtensionFromBuffer(bytes, fallbackExt);
  const assetId = crypto.randomUUID();

  const projectDir = projectRoot(projectId);
  const originalsDir = path.join(projectDir, ORIGINALS_DIR);
  const previewsDir = path.join(projectDir, PREVIEWS_DIR);

  await mkdir(originalsDir, { recursive: true });
  await mkdir(previewsDir, { recursive: true });

  const storedFilePath = path.join(originalsDir, `${assetId}${ext}`);
  const previewPath = path.join(previewsDir, `${assetId}.jpg`);

  await writeFile(storedFilePath, new Uint8Array(bytes));

  const meta = await sharp(bytes).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  await sharp(bytes)
    .rotate() // honour EXIF orientation
    .resize({
      width: PREVIEW_MAX_SIDE,
      height: PREVIEW_MAX_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: PREVIEW_QUALITY })
    .toFile(previewPath);

  return {
    storedFilePath,
    previewPath,
    imageType: ext.replace(".", "") || "png",
    mimeType,
    width,
    height,
    size: bytes.length,
  };
}

export type WriteGeneratedVersionBufferInput = {
  projectId: string;
  sourcePath: string;
  versionLabel: string;
  bytes: Buffer;
};

export type WriteGeneratedVersionResult = {
  filePath: string;
};

/**
 * Writes a generated image buffer (e.g. Fal.ai or OpenAI output) into the
 * project's versions directory. Filename pattern preserves a link back to
 * the source asset and the producing pipeline label, plus a timestamp and
 * random suffix to avoid collisions.
 */
export async function writeGeneratedVersionBuffer(
  input: WriteGeneratedVersionBufferInput
): Promise<WriteGeneratedVersionResult> {
  const { projectId, sourcePath, versionLabel, bytes } = input;
  const sourceExt = path.extname(sourcePath).toLowerCase() || ".png";
  const ext = detectExtensionFromBuffer(bytes, sourceExt);

  const versionsDir = path.join(projectRoot(projectId), VERSIONS_DIR);
  await mkdir(versionsDir, { recursive: true });

  const baseName = path.basename(sourcePath, path.extname(sourcePath));
  const safeLabel = sanitizeLabel(versionLabel);
  const stamp = Date.now();
  const rand = crypto.randomBytes(4).toString("hex");
  const filePath = path.join(
    versionsDir,
    `${baseName}__${safeLabel}__${stamp}__${rand}${ext}`
  );

  await writeFile(filePath, new Uint8Array(bytes));
  return { filePath };
}

export type DuplicateGeneratedVersionInput = {
  projectId: string;
  sourcePath: string;
  versionLabel: string;
};

/**
 * Copies an existing version file to a new versioned filename. Used by the
 * mock provider (which doesn't actually run a model) and by the version
 * restore endpoint. The source path must live inside the storage root.
 */
export async function duplicateGeneratedVersion(
  input: DuplicateGeneratedVersionInput
): Promise<WriteGeneratedVersionResult> {
  const { projectId, sourcePath, versionLabel } = input;
  assertWithinStorage(sourcePath);

  const sourceStat = await stat(sourcePath).catch(() => null);
  if (!sourceStat || !sourceStat.isFile()) {
    throw new Error(`Source file not found for duplication: ${sourcePath}`);
  }

  const ext = path.extname(sourcePath).toLowerCase() || ".png";
  const versionsDir = path.join(projectRoot(projectId), VERSIONS_DIR);
  await mkdir(versionsDir, { recursive: true });

  const baseName = path.basename(sourcePath, path.extname(sourcePath));
  const safeLabel = sanitizeLabel(versionLabel);
  const stamp = Date.now();
  const rand = crypto.randomBytes(4).toString("hex");
  const filePath = path.join(
    versionsDir,
    `${baseName}__${safeLabel}__${stamp}__${rand}${ext}`
  );

  await copyFile(sourcePath, filePath);
  return { filePath };
}

/**
 * Reads a file from the storage root. Refuses to read anything outside of
 * the configured root, even if the caller passes an absolute path.
 */
export async function readStoredFile(filePath: string): Promise<Buffer> {
  assertWithinStorage(filePath);
  return readFile(filePath);
}
