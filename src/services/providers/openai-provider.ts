import { readFile } from "node:fs/promises";
import path from "node:path";

import { appEnv } from "@/config/env";
import { writeGeneratedVersionBuffer } from "@/services/storage/storage-service";

import type { ProviderAdapter, ProviderGenerateInput, ProviderGenerateResult } from "./provider-adapter";

type OpenAiImageEditResponse = {
  created: number;
  data: Array<{
    b64_json?: string;
    revised_prompt?: string;
  }>;
  usage?: Record<string, unknown>;
  output_format?: string;
  background?: string;
  size?: string;
  quality?: string;
};

export class OpenAiImageEditingProvider implements ProviderAdapter {
  readonly name = "openai-image-editing";
  readonly label = "OpenAI Image Editing";

  async generateRealismPass(
    input: ProviderGenerateInput
  ): Promise<ProviderGenerateResult> {
    if (!appEnv.providerApiKey) {
      throw new Error("Missing OPENAI_API_KEY for the OpenAI image editing provider.");
    }

    const startedAt = Date.now();
    const imageBytes = await readFile(input.sourcePath);
    const sourceExtension = path.extname(input.sourcePath).toLowerCase();
    const sourceType =
      sourceExtension === ".jpg" || sourceExtension === ".jpeg"
        ? "image/jpeg"
        : sourceExtension === ".webp"
          ? "image/webp"
          : "image/png";

    const formData = new FormData();
    const prompt = [
      // Core task
      "TASK: Convert this architectural 3D render into a photorealistic image.",
      // Preset and image context
      input.prompt.presetName ? `Style preset: ${input.prompt.presetName}.` : "",
      input.prompt.imageName ? `Image: ${input.prompt.imageName}.` : "",
      ...(input.prompt.customDirectives ?? []),
      // STRICT GEOMETRY LOCK — highest priority instructions
      "STRICT RULES (must follow exactly):",
      "1. PRESERVE every structural element pixel-perfectly: building footprint, facade geometry, window positions, door positions, column spacing, roof shape, floor levels, balconies, overhangs, and all architectural details.",
      "2. PRESERVE exact camera angle, focal length, perspective, and field of view — do NOT zoom, pan, tilt, or change the viewpoint by even 1 degree.",
      "3. PRESERVE exact positions of all objects: roads, parking lots, railway tracks, vehicles, trucks, trees, shrubs, benches, fences, lighting poles, signage, and any site furniture.",
      "4. PRESERVE exact proportions and scale of every element — no stretching, no scaling, no distortion.",
      "5. DO NOT add, remove, or move any object, person, vehicle, or vegetation that is not already in the scene.",
      "6. DO NOT redesign, simplify, or alter any architectural element.",
      "7. DO NOT change the sky composition or lighting direction — only improve realism of existing lighting.",
      // What IS allowed
      "ALLOWED ENHANCEMENTS ONLY:",
      "- Replace flat/plastic-looking materials with photorealistic textures (concrete, glass, metal, brick, wood, asphalt) while keeping exact shapes.",
      "- Add realistic surface details: weathering, micro-texture, reflections, subsurface scattering on glass.",
      "- Improve shadow quality and ambient occlusion to match real-world physics.",
      "- Add subtle atmospheric depth (haze, sky gradient) without changing composition.",
      "- Improve vegetation realism (leaf detail, bark texture) without moving or resizing plants.",
    ].filter(Boolean).join(" ");

    formData.append("model", appEnv.openAiImageModel);
    formData.append("image", new File([imageBytes], path.basename(input.sourcePath), { type: sourceType }));
    formData.append("prompt", prompt);
    formData.append("size", "1536x1024");
    formData.append("quality", "medium");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appEnv.providerApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI image edit failed: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as OpenAiImageEditResponse;
    const encodedImage = result.data[0]?.b64_json;

    if (!encodedImage) {
      throw new Error("OpenAI image edit returned no image data.");
    }

    const imageBuffer = Buffer.from(encodedImage, "base64");
    const saved = await writeGeneratedVersionBuffer({
      projectId: input.projectId,
      sourcePath: input.sourcePath,
      versionLabel: "openai-realism-pass",
      bytes: imageBuffer,
    });

    return {
      filePath: saved.filePath,
      metadata: {
        provider: this.name,
        model: appEnv.openAiImageModel,
        revisedPrompt: result.data[0]?.revised_prompt ?? null,
        usage: result.usage ?? null,
        outputFormat: result.output_format ?? sourceExtension.replace(".", "") ?? "png",
      },
      processingTimeMs: Date.now() - startedAt,
    };
  }
}
