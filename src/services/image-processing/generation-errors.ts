export type GenerationFailureInfo = {
  code: "FAL_PROVIDER_ERROR" | "FAL_TIMEOUT" | "GENERATION_FAILED";
  canFallbackToMock: boolean;
  retryable: boolean;
};

export function classifyGenerationFailure(error: unknown): GenerationFailureInfo {
  const message = error instanceof Error ? error.message : String(error ?? "");

  // Fal.ai timeout (AbortError from the 5-minute AbortController)
  if (message.includes("timed out") || message.includes("AbortError") || message.includes("abort")) {
    return {
      code: "FAL_TIMEOUT",
      canFallbackToMock: true,
      retryable: true,
    };
  }

  // Fal.ai API errors (422, 5xx, etc.) — also catch legacy OpenAI strings
  if (
    message.includes("render2real-api") ||
    message.includes("enhance-render") ||
    message.includes("fal-ai") ||
    message.includes("Fal.ai") ||
    message.includes("OpenAI image edit failed") ||
    message.includes("billing_hard_limit_reached")
  ) {
    return {
      code: "FAL_PROVIDER_ERROR",
      canFallbackToMock: true,
      retryable: true,
    };
  }

  return {
    code: "GENERATION_FAILED",
    canFallbackToMock: false,
    retryable: false,
  };
}
