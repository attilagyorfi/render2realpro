import { describe, expect, it } from "vitest";

import { getPricingHighlightTier } from "@/components/landing/landing-view";

describe("landing pricing highlight", () => {
  it("keeps the studio tier as the highlighted offer", () => {
    expect(getPricingHighlightTier()).toBe("studio");
  });
});
