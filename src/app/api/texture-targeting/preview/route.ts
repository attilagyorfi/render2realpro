import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedTextureAsset } from "@/app/api/texture-targeting/shared";
import { createTexturePreview } from "@/services/texture-targeting/texture-targeting-job-service";
import { normalizeTexturePreviewRequest } from "@/services/texture-targeting/texture-targeting-service";

export async function POST(request: Request) {
  try {
    const payload = normalizeTexturePreviewRequest(await request.json());
    const access = await getAuthorizedTextureAsset(payload.imageAssetId);

    if ("error" in access) {
      return access.error;
    }

    const preview = await createTexturePreview(payload);
    return NextResponse.json({ preview });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid texture targeting preview request.",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create texture preview.",
      },
      { status: 500 }
    );
  }
}
