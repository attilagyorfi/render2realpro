import { NextResponse } from "next/server";
import { z } from "zod";

import { createGenerationJob } from "@/services/image-processing/image-processing-service";
import { classifyGenerationFailure } from "@/services/image-processing/generation-errors";

const generationSchema = z.object({
  imageAssetId: z.string(),
  presetId: z.string().optional(),
  customPrompt: z.string().optional(),
  settingsOverride: z.record(z.string(), z.unknown()).optional(),
  customDirectives: z.array(z.string()).optional(),
  providerOverride: z.string().optional(),
}).refine(
  (data) => data.presetId || data.customPrompt,
  { message: "Either presetId or customPrompt must be provided." }
);

export async function POST(request: Request) {
  try {
    const payload = generationSchema.parse(await request.json());
    const generation = await createGenerationJob(payload);
    return NextResponse.json({ generation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid generation request.",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    const failure = classifyGenerationFailure(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete generation.",
        code: failure.code,
        canFallbackToMock: failure.canFallbackToMock,
        retryable: failure.retryable,
        fallbackProvider: failure.canFallbackToMock ? "mock-local" : null,
      },
      { status: failure.code === "GENERATION_FAILED" ? 500 : 503 }
    );
  }
}
