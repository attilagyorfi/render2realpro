import { describe, expect, it } from "vitest";

import {
  MATERIAL_PRESETS,
  createMockTextureSelection,
  normalizeTextureTargetingRequest,
} from "@/services/texture-targeting/texture-targeting-service";

describe("texture targeting service helpers", () => {
  it("exposes the supported architectural material presets", () => {
    expect(MATERIAL_PRESETS).toEqual([
      "brick",
      "concrete",
      "glass",
      "wood",
      "metal",
      "roof",
      "asphalt",
    ]);
  });

  it("normalizes custom prompts while preserving the geometry lock", () => {
    const normalized = normalizeTextureTargetingRequest({
      imageAssetId: "asset-1",
      selectionMode: "brush-mask",
      selectionInput: {
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.3, y: 0.4 },
        ],
      },
      materialPreset: "wood",
      customMaterialPrompt: "  warm cedar slats  ",
      preserveGeometry: false,
      preserveLighting: false,
      preserveSurroundings: false,
    });

    expect(normalized.customMaterialPrompt).toBe("warm cedar slats");
    expect(normalized.preserveGeometry).toBe(true);
    expect(normalized.preserveLighting).toBe(false);
    expect(normalized.preserveSurroundings).toBe(false);
  });

  it("creates a deterministic mock selection preview for click targeting", () => {
    const selection = createMockTextureSelection({
      imageAssetId: "asset-1",
      selectionMode: "click-select",
      selectionInput: { x: 0.42, y: 0.61 },
    });

    expect(selection.mask.id).toBe("asset-1-click-select-mask");
    expect(selection.mask.bounds.width).toBeGreaterThan(0);
    expect(selection.mask.bounds.height).toBeGreaterThan(0);
    expect(selection.mask.coverage).toBeGreaterThan(0);
    expect(selection.previewLabel).toContain("Click Select");
  });
});
