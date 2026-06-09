import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedTextureAsset } from "@/app/api/texture-targeting/shared";
import { applyMaterialInpainting } from "@/services/texture-targeting/texture-targeting-job-service";

/**
 * POST /api/texture-targeting/apply
 *
 * Sprint F / Munkacsomag 3. The request payload is the new "free-prompt
 * material edit" shape: the client sends a binary PNG mask drawn over
 * the source render plus a free-text instruction. The legacy
 * material-preset / selectionMask payload is no longer accepted here —
 * the in-app UI never used it for real generation anyway (the previous
 * implementation was a mock that just wrote a DB row with the source
 * file path).
 */

const applySchema = z.object({
  imageAssetId: z.string().min(1),
  /**
   * Mask supplied as a data URI ("data:image/png;base64,...") or as a
   * raw base64 PNG string. Either form is accepted to keep the client
   * trivial.
   */
  mask: z.string().min(64, "Mask payload looks empty."),
  prompt: z.string().min(2, "Add a short instruction for the material edit."),
  /** Optional denoising strength (0..1) for Flux Dev. */
  strength: z.number().min(0).max(1).optional(),
});

function decodeMaskBytes(maskString: string): Buffer {
  const commaIndex = maskString.indexOf(",");
  const base64Payload =
    maskString.startsWith("data:") && commaIndex !== -1
      ? maskString.slice(commaIndex + 1)
      : maskString;
  return Buffer.from(base64Payload, "base64");
}

export async function POST(request: Request) {
  try {
    const payload = applySchema.parse(await request.json());
    const access = await getAuthorizedTextureAsset(payload.imageAssetId);
    if ("error" in access) return access.error;

    const maskBytes = decodeMaskBytes(payload.mask);
    if (maskBytes.length < 32) {
      return NextResponse.json(
        { error: "Mask payload could not be decoded." },
        { status: 400 }
      );
    }

    const result = await applyMaterialInpainting({
      imageAssetId: payload.imageAssetId,
      maskBytes,
      prompt: payload.prompt.trim(),
      strength: payload.strength,
    });

    return NextResponse.json(
      {
        textureEdit: {
          generationLogId: result.generationLogId,
          imageVersionId: result.imageVersionId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid material-edit request.",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error("[texture-targeting/apply]", error);
    return NextResponse.json(
      { error: "Material edit is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
