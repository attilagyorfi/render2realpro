import { describe, expect, it } from "vitest";

import { classifyGenerationFailure } from "@/services/image-processing/generation-errors";

describe("generation fallback classification", () => {
  it("classifies Fal.ai provider 4xx/5xx errors as retryable with mock fallback", () => {
    const result = classifyGenerationFailure(
      new Error("render2real-api enhance-render failed: 422 Unprocessable Entity")
    );

    expect(result.code).toBe("FAL_PROVIDER_ERROR");
    expect(result.canFallbackToMock).toBe(true);
    expect(result.retryable).toBe(true);
  });

  it("classifies AbortController timeouts as FAL_TIMEOUT", () => {
    const result = classifyGenerationFailure(
      new Error("render2real-api timed out after 300s. The Fal.ai model is still processing — please try again.")
    );

    expect(result.code).toBe("FAL_TIMEOUT");
    expect(result.canFallbackToMock).toBe(true);
    expect(result.retryable).toBe(true);
  });

  it("still classifies legacy OpenAI billing-limit errors as FAL_PROVIDER_ERROR for fallback compatibility", () => {
    const result = classifyGenerationFailure(
      new Error(
        'OpenAI image edit failed: 400 {"error":{"message":"Billing hard limit has been reached.","code":"billing_hard_limit_reached"}}'
      )
    );

    expect(result.code).toBe("FAL_PROVIDER_ERROR");
    expect(result.canFallbackToMock).toBe(true);
    expect(result.retryable).toBe(true);
  });

  it("classifies generic OpenAI image-edit failures via legacy string match", () => {
    const result = classifyGenerationFailure(
      new Error("OpenAI image edit failed: 500 upstream timeout")
    );

    expect(result.code).toBe("FAL_PROVIDER_ERROR");
    expect(result.canFallbackToMock).toBe(true);
    expect(result.retryable).toBe(true);
  });

  it("keeps unknown errors unclassified for generic handling", () => {
    const result = classifyGenerationFailure(new Error("Preset not found."));

    expect(result.code).toBe("GENERATION_FAILED");
    expect(result.canFallbackToMock).toBe(false);
    expect(result.retryable).toBe(false);
  });

  it("handles non-Error throwables defensively", () => {
    const result = classifyGenerationFailure("plain string failure");

    expect(result.code).toBe("GENERATION_FAILED");
    expect(result.retryable).toBe(false);
  });
});
