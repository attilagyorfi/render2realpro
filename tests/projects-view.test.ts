import { describe, expect, it } from "vitest";

import { formatProjectAssetCount } from "@/components/projects/projects-view";

describe("formatProjectAssetCount", () => {
  it("returns a stable label for the asset count", () => {
    expect(formatProjectAssetCount(1)).toBe("1 file");
    expect(formatProjectAssetCount(3)).toBe("3 files");
  });
});
