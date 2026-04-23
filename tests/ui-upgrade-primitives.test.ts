import { describe, expect, it } from "vitest";

import {
  getGenerationStatusLabelKey,
  getGenerationStatusTone,
} from "@/config/design-tokens";

describe("design token helpers", () => {
  it("maps processing statuses to semantic tones", () => {
    expect(getGenerationStatusTone("queued")).toBe("warning");
    expect(getGenerationStatusTone("processing")).toBe("info");
    expect(getGenerationStatusTone("completed")).toBe("success");
    expect(getGenerationStatusTone("failed")).toBe("danger");
  });

  it("returns stable translation keys for generation statuses", () => {
    expect(getGenerationStatusLabelKey("queued")).toBe("status.queued");
    expect(getGenerationStatusLabelKey("processing")).toBe("status.processing");
    expect(getGenerationStatusLabelKey("completed")).toBe("status.completed");
    expect(getGenerationStatusLabelKey("failed")).toBe("status.failed");
  });
});
