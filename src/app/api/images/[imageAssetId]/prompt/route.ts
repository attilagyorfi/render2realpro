import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { buildPromptDocument } from "@/features/prompt-engine/build-prompt";
import { mergePresetSettings } from "@/config/presets";

const requestSchema = z.object({
  presetId: z.string(),
  customDirectives: z.array(z.string()).optional(),
  settingsOverride: z.record(z.string(), z.unknown()).optional(),
});

type RouteContext = {
  params: Promise<{ imageAssetId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { imageAssetId } = await context.params;
  const payload = requestSchema.parse(await request.json());

  const [imageAsset, preset] = await Promise.all([
    prisma.imageAsset.findUnique({ where: { id: imageAssetId } }),
    prisma.preset.findUnique({ where: { id: payload.presetId } }),
  ]);

  if (!imageAsset || !preset) {
    return NextResponse.json(
      { error: "Unable to build prompt for the selected image/preset." },
      { status: 404 }
    );
  }

  const prompt = buildPromptDocument({
    imageName: imageAsset.originalFileName,
    presetName: preset.name,
    settings: mergePresetSettings(JSON.parse(preset.settingsJson), payload.settingsOverride),
    customDirectives: payload.customDirectives,
  });

  return NextResponse.json({ prompt });
}
