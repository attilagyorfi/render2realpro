import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedTextureAsset } from "@/app/api/texture-targeting/shared";
import { applyTexturePass } from "@/services/texture-targeting/texture-targeting-job-service";
import { normalizeTextureApplyRequest } from "@/services/texture-targeting/texture-targeting-service";

export async function POST(request: Request) {
  try {
    const payload = normalizeTextureApplyRequest(await request.json());
    const access = await getAuthorizedTextureAsset(payload.imageAssetId);

    if ("error" in access) {
      return access.error;
    }

    const texturePass = await applyTexturePass(payload);
    return NextResponse.json({ texturePass }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid texture targeting apply request.",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to apply texture pass.",
      },
      { status: 500 }
    );
  }
}
