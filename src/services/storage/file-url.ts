/**
 * file-url.ts
 *
 * Maps absolute filesystem paths under the storage root onto public API
 * URLs that `app/api/files/[...segments]/route.ts` can serve. URLs always
 * use forward slashes, regardless of the host OS.
 */

import path from "node:path";

import { appEnv } from "@/config/env";

const FILES_API_PREFIX = "/api/files";

/**
 * Convert an absolute storage filesystem path into the public file URL.
 * Returns the original input verbatim if the path lies outside the
 * configured storage root, so the caller can decide how to render it.
 *
 * @example
 *   storagePathToApiPath("/storage/projects/abc/originals/xyz.png")
 *   // -> "/api/files/projects/abc/originals/xyz.png"
 */
export function storagePathToApiPath(filePath: string): string {
  const resolvedRoot = path.resolve(appEnv.storageRoot);
  const resolvedTarget = path.resolve(filePath);
  const rootWithSep = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : resolvedRoot + path.sep;

  if (
    resolvedTarget !== resolvedRoot &&
    !resolvedTarget.startsWith(rootWithSep)
  ) {
    return filePath;
  }

  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (!relative) {
    return FILES_API_PREFIX;
  }

  const urlSegments = relative.split(path.sep).filter(Boolean).map(encodeURIComponent);
  return `${FILES_API_PREFIX}/${urlSegments.join("/")}`;
}
