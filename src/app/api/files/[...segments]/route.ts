import { NextResponse } from "next/server";
import path from "node:path";

import { appEnv } from "@/config/env";
import { readStoredFile } from "@/services/storage/storage-service";

type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { segments } = await context.params;
  const requestedPath = path.resolve(appEnv.storageRoot, ...segments);

  if (!requestedPath.startsWith(appEnv.storageRoot)) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }

  const file = await readStoredFile(requestedPath);
  const extension = path.extname(requestedPath).toLowerCase();
  const contentType =
    extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".webp"
        ? "image/webp"
        : "image/png";

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
