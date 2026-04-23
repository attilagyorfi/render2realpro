import { describe, expect, it } from "vitest";

import { classifyGenerationFailure } from "@/services/image-processing/generation-errors";

describe("generation fallback classification", () => {
  it("recognizes OpenAI billing hard limit errors as mock-fallback eligible", () => {
    const result = classifyGenerationFailure(
      new Error(
        'OpenAI image edit failed: 400 {"error":{"message":"Billing hard limit has been reached.","code":"billing_hard_limit_reached"}}'
      )
    );

    expect(result.code).toBe("OPENAI_BILLING_LIMIT");
    expect(result.canFallbackToMock).toBe(true);
    expect(result.retryable).toBe(true);
  });

  it("recognizes generic OpenAI provider failures as retryable and mock-fallback eligible", () => {
    const result = classifyGenerationFailure(
      new Error("OpenAI image edit failed: 500 upstream timeout")
    );

    expect(result.code).toBe("OPENAI_PROVIDER_ERROR");
    expect(result.canFallbackToMock).toBe(true);
    expect(result.retryable).toBe(true);
  });

  it("keeps unknown errors unclassified for generic handling", () => {
    const result = classifyGenerationFailure(new Error("Preset not found."));

    expect(result.code).toBe("GENERATION_FAILED");
    expect(result.canFallbackToMock).toBe(false);
    expect(result.retryable).toBe(false);
  });
});
