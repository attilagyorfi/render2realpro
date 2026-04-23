export type GenerationFailureInfo = {
  code: "OPENAI_BILLING_LIMIT" | "OPENAI_PROVIDER_ERROR" | "GENERATION_FAILED";
  canFallbackToMock: boolean;
  retryable: boolean;
};

export function classifyGenerationFailure(error: unknown): GenerationFailureInfo {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (message.includes("billing_hard_limit_reached")) {
    return {
      code: "OPENAI_BILLING_LIMIT",
      canFallbackToMock: true,
      retryable: true,
    };
  }

  if (message.includes("OpenAI image edit failed")) {
    return {
      code: "OPENAI_PROVIDER_ERROR",
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
