/**
 * fal-provider.ts
 *
 * Next.js provider adapter that routes image enhancement jobs to the
 * render2real-api FastAPI microservice (Fal.ai Flux ControlNet Canny).
 *
 * This provider replaces the OpenAI image editing provider.
 * It preserves the ProviderAdapter interface so no other code needs to change.
 */

import path from "path";
import { readFile } from "fs/promises";
import { writeGeneratedVersionBuffer } from "@/services/storage/storage-service";
import type { ProviderAdapter, ProviderGenerateInput, ProviderGenerateResult } from "./provider-adapter";

const API_BASE_URL = process.env.RENDER2REAL_API_URL ?? "http://localhost:8000";

// Fal.ai Flux ControlNet can take 60–300 seconds
const FETCH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class FalAiProvider implements ProviderAdapter {
  readonly name = "fal-controlnet";
  readonly label = "Fal.ai Flux ControlNet (Architectural Fidelity)";

  async generateRealismPass(input: ProviderGenerateInput): Promise<ProviderGenerateResult> {
    // ── Read source image ───────────────────────────────────────────────────
    const imageBytes = await readFile(input.sourcePath);
    const sourceExtension = path.extname(input.sourcePath).toLowerCase();
    const mimeType =
      sourceExtension === ".jpg" || sourceExtension === ".jpeg"
        ? "image/jpeg"
        : sourceExtension === ".webp"
          ? "image/webp"
          : "image/png";

    // ── Build prompt from preset directives ─────────────────────────────────
    const promptParts: string[] = [];
    if (input.prompt.presetName) {
      promptParts.push(`Style preset: ${input.prompt.presetName}.`);
    }
    if (input.prompt.customDirectives?.length) {
      promptParts.push(...input.prompt.customDirectives);
    }
    const userPrompt = promptParts.join(" ");

    // ── Map slider values to realism_level ──────────────────────────────────
    const realismLevel = 0.5; // default; can be extended to use slider values

    // ── Build multipart form data ────────────────────────────────────────────
    const formData = new FormData();
    formData.append(
      "image",
      new File([imageBytes], path.basename(input.sourcePath), { type: mimeType })
    );
    if (userPrompt) {
      formData.append("prompt", userPrompt);
    }
    formData.append("realism_level", String(realismLevel));
    formData.append("output_format", "png");

    // ── Call FastAPI microservice (with 5-minute timeout) ────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/api/enhance-render`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `render2real-api timed out after ${FETCH_TIMEOUT_MS / 1000}s. ` +
          `The Fal.ai model is still processing — please try again.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`render2real-api enhance-render failed: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as {
      job_id: string;
      status: string;
      enhanced_image: string; // data URI
      canny_image: string;
      fidelity: {
        overall: number;
        edge_similarity: number;
        ssim: number;
        dimension_match: number;
        label: string;
        warnings: string[];
      };
      model: string;
      parameters: Record<string, unknown>;
      processing_time_ms: number;
      retry_log: unknown[];
      warnings: string[];
    };

    // ── Decode base64 enhanced image ─────────────────────────────────────────
    const base64Data = result.enhanced_image.replace(/^data:image\/[a-z]+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // ── Save to storage ──────────────────────────────────────────────────────
    const saved = await writeGeneratedVersionBuffer({
      projectId: input.projectId,
      sourcePath: input.sourcePath,
      versionLabel: "fal-controlnet-realism-pass",
      bytes: imageBuffer,
    });

    return {
      filePath: saved.filePath,
      metadata: {
        provider: this.name,
        model: result.model,
        jobId: result.job_id,
        fidelity: result.fidelity,
        parameters: result.parameters,
        retryLog: result.retry_log,
        warnings: result.warnings,
        cannyImageDataUri: result.canny_image,
      },
      processingTimeMs: result.processing_time_ms,
    };
  }
}
