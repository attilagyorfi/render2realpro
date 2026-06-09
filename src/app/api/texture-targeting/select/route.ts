import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedTextureAsset } from "@/app/api/texture-targeting/shared";
import {
  createMockTextureSelection,
  normalizeTextureTargetingRequest,
} from "@/services/texture-targeting/texture-targeting-service";

export async function POST(request: Request) {
  try {
    const payload = normalizeTextureTargetingRequest(await request.json());
    const access = await getAuthorizedTextureAsset(payload.imageAssetId);

    if ("error" in access) {
      return access.error;
    }

    const selection = createMockTextureSelection(payload);
    return NextResponse.json({ selection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid texture targeting selection request.",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error("[texture-targeting/select]", error);
    return NextResponse.json(
      { error: "Unable to create selection preview." },
      { status: 500 }
    );
  }
}
