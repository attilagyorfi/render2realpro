import path from "node:path";

import { NextResponse } from "next/server";

import { normalizeExportRequest, exportImageBuffer } from "@/services/export/export-service";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/services/storage/storage-service";

export async function POST(request: Request) {
  const payload = normalizeExportRequest(await request.json());
  const version = await prisma.imageVersion.findUnique({
    where: { id: payload.imageVersionId },
  });

  if (!version) {
    return NextResponse.json({ error: "Image version not found." }, { status: 404 });
  }

  const sourceBuffer = await readStoredFile(version.filePath);
  const exportedBuffer = await exportImageBuffer(sourceBuffer, payload);
  const baseName = path.basename(version.filePath, path.extname(version.filePath));
  const filename = `${baseName}-${payload.filenameSuffix}.${payload.format}`;

  return new NextResponse(new Uint8Array(exportedBuffer), {
    status: 200,
    headers: {
      "Content-Type":
        payload.format === "jpg"
          ? "image/jpeg"
          : payload.format === "webp"
            ? "image/webp"
            : "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
