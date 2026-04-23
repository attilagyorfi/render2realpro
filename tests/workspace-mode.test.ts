import { describe, expect, it } from "vitest";

import { createWorkspaceState } from "@/store/workspace-store";
import { getControlledSelectValue } from "@/components/workspace/workspace-view";

describe("workspace mode readiness", () => {
  it("defaults to realism-pass mode", () => {
    expect(createWorkspaceState().mode).toBe("realism-pass");
  });

  it("initializes texture targeting controls with safe preservation locks", () => {
    const state = createWorkspaceState();

    expect(state.selectionMode).toBe("click-select");
    expect(state.targetMaterial).toBe("concrete");
    expect(state.customMaterialPrompt).toBe("");
    expect(state.preserveGeometry).toBe(true);
    expect(state.preserveLighting).toBe(true);
    expect(state.preserveSurroundings).toBe(true);
    expect(state.texturePreviewStatus).toBe("idle");
    expect(state.selectionMask).toBeUndefined();
    expect(state.texturePreviewVersionId).toBeUndefined();
  });

  it("keeps select values controlled even before async presets load", () => {
    expect(getControlledSelectValue(undefined)).toBe("");
    expect(getControlledSelectValue("preset-1")).toBe("preset-1");
  });
});
