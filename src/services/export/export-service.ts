import sharp from "sharp";

import type { ExportFormat, ExportRequest } from "@/types/domain";

type RawExportRequest = Partial<ExportRequest> & {
  imageVersionId?: string;
  format?: ExportFormat;
};

export function normalizeExportRequest(input: RawExportRequest): ExportRequest {
  if (!input.imageVersionId) {
    throw new Error("Missing image version id.");
  }

  const format = input.format ?? "png";
  const quality = Math.min(100, Math.max(1, input.quality ?? 92));
  const width = input.width && input.width > 0 ? input.width : undefined;
  const height = input.height && input.height > 0 ? input.height : undefined;

  return {
    imageVersionId: input.imageVersionId,
    format,
    quality,
    width,
    height,
    filenameSuffix: (input.filenameSuffix ?? "export").trim() || "export",
    retainMetadata: input.retainMetadata ?? true,
  };
}

export async function exportImageBuffer(
  sourceBuffer: Buffer,
  request: ExportRequest
): Promise<Buffer> {
  const pipeline = sharp(sourceBuffer);

  if (request.width || request.height) {
    pipeline.resize({
      width: request.width,
      height: request.height,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  switch (request.format) {
    case "jpg":
      pipeline.jpeg({ quality: request.quality, mozjpeg: true });
      break;
    case "webp":
      pipeline.webp({ quality: request.quality });
      break;
    case "png":
    default:
      pipeline.png({ quality: request.quality });
      break;
  }

  if (!request.retainMetadata) {
    pipeline.withMetadata({});
  }

  return pipeline.toBuffer();
}
