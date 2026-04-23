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
      input.prompt.presetName,
      input.prompt.imageName,
      ...(input.prompt.customDirectives ?? []),
      "Preserve exact composition, camera angle, geometry, facade layout, proportions, object placement, roads, rails, vegetation, vehicles, and scene layout.",
      "No redesign. No geometry changes. No new people. No fantasy architecture. No camera changes.",
      "Enhance realism through material fidelity, reflections, shadows, and believable weathering only.",
    ].join(" ");

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
