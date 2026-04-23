import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRESET_CATALOG,
  clampPresetSettings,
  mergePresetSettings,
} from "@/config/presets";
import { buildPromptDocument } from "@/features/prompt-engine/build-prompt";
import {
  getActiveProviderName,
  getProviderStatusSnapshot,
} from "@/services/providers/provider-registry";
import { normalizeExportRequest } from "@/services/export/export-service";

describe("preset catalog", () => {
  it("contains the ten default realism presets", () => {
    expect(DEFAULT_PRESET_CATALOG).toHaveLength(10);
  });

  it("merges overrides while preserving strict geometry flags", () => {
    const merged = mergePresetSettings(DEFAULT_PRESET_CATALOG[0].settings, {
      realismIntensity: 0.92,
      strictGeometryPreservation: false,
      avoidHallucinations: false,
    });

    expect(merged.realismIntensity).toBe(0.92);
    expect(merged.strictGeometryPreservation).toBe(true);
    expect(merged.avoidHallucinations).toBe(true);
  });

  it("clamps numeric preset values into the supported range", () => {
    const clamped = clampPresetSettings({
      realismIntensity: 4,
      weatheringIntensity: -2,
      reflectionIntensity: 0.5,
      vegetationNaturalness: 1.2,
      glassReflectionLevel: -0.3,
      concreteWearLevel: 3,
      shadowStrength: 2,
      ambientOcclusionLevel: -1,
      strictGeometryPreservation: true,
      avoidHallucinations: true,
    });

    expect(clamped.realismIntensity).toBe(1);
    expect(clamped.weatheringIntensity).toBe(0);
    expect(clamped.vegetationNaturalness).toBe(1);
    expect(clamped.glassReflectionLevel).toBe(0);
    expect(clamped.ambientOcclusionLevel).toBe(0);
  });
});

describe("prompt engine", () => {
  it("always keeps the immutable preservation and negative rules in the output", () => {
    const prompt = buildPromptDocument({
      imageName: "factory-render.png",
      presetName: "Industrial Exterior Realism",
      settings: DEFAULT_PRESET_CATALOG[0].settings,
      customDirectives: ["use believable industrial weathering"],
    });

    expect(prompt.fullPrompt).toContain("preserve exact camera angle");
    expect(prompt.fullPrompt).toContain("preserve exact building geometry");
    expect(prompt.fullPrompt).toContain("no redesign");
    expect(prompt.fullPrompt).toContain("no geometry changes");
    expect(prompt.sections.styleKeywords).toContain("architectural photography");
  });
});

describe("provider status", () => {
  it("reports the mock provider as configured by default", () => {
    const snapshot = getProviderStatusSnapshot();
    const mockProvider = snapshot.providers.find(
      (provider) => provider.name === "mock-local"
    );

    expect(snapshot.activeProvider).toBe("mock-local");
    expect(mockProvider?.configured).toBe(true);
    expect(mockProvider?.supportsRealtimeProgress).toBe(true);
  });

  it("marks the OpenAI provider as unavailable when no API key is present", () => {
    const snapshot = getProviderStatusSnapshot({
      activeProvider: "openai-image-editing",
      providerApiKey: "",
    });

    const openAiProvider = snapshot.providers.find(
      (provider) => provider.name === "openai-image-editing"
    );

    expect(openAiProvider?.configured).toBe(false);
    expect(openAiProvider?.statusMessage).toContain("Missing API key");
    expect(getActiveProviderName(snapshot)).toBe("mock-local");
  });

  it("keeps OpenAI active when its API key is configured", () => {
    const snapshot = getProviderStatusSnapshot({
      activeProvider: "openai-image-editing",
      providerApiKey: "test-key",
    });

    const openAiProvider = snapshot.providers.find(
      (provider) => provider.name === "openai-image-editing"
    );

    expect(openAiProvider?.configured).toBe(true);
    expect(openAiProvider?.statusMessage).toContain("Ready");
    expect(getActiveProviderName(snapshot)).toBe("openai-image-editing");
  });
});

describe("export request normalization", () => {
  it("normalizes resize values, metadata retention, and file suffixes", () => {
    const request = normalizeExportRequest({
      imageVersionId: "version-1",
      format: "jpg",
      quality: 120,
      width: 0,
      height: 1600,
      filenameSuffix: "  final  ",
      retainMetadata: false,
    });

    expect(request.quality).toBe(100);
    expect(request.width).toBeUndefined();
    expect(request.height).toBe(1600);
    expect(request.filenameSuffix).toBe("final");
    expect(request.retainMetadata).toBe(false);
  });
});
