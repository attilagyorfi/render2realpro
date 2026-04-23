import type { BuildPromptInput, PromptDocument, PromptSections } from "@/types/domain";

const IMMUTABLE_PRESERVATION_RULES = [
  "preserve exact composition",
  "preserve exact camera angle",
  "preserve exact perspective",
  "preserve exact building geometry",
  "preserve exact proportions",
  "preserve exact object placement",
  "preserve exact roads rails vegetation loading docks and vehicles",
  "preserve exact scene layout",
  "preserve exact facade layout",
  "preserve exact roof geometry",
];

const IMMUTABLE_NEGATIVE_INSTRUCTIONS = [
  "no redesign",
  "no roof geometry changes",
  "no extra people",
  "no extra buildings",
  "no extra landscaping",
  "no surrealism",
  "no fantasy architecture",
  "no dramatic lighting",
  "no composition changes",
  "no geometry changes",
  "no camera position changes",
];

export function buildPromptDocument(input: BuildPromptInput): PromptDocument {
  const sections: PromptSections = {
    preservationRules: IMMUTABLE_PRESERVATION_RULES,
    realismEnhancementRules: [
      "enhance material realism",
      "add subtle imperfections",
      input.settings.weatheringIntensity > 0.45
        ? "add believable weathering where surfaces already imply wear"
        : "keep weathering subtle and disciplined",
      "improve reflections",
      "improve shadows",
      "improve contact shadows",
      "improve ambient occlusion",
    ],
    materialEnhancementRules: [
      `reflection intensity ${Math.round(input.settings.reflectionIntensity * 100)} percent`,
      `glass reflection level ${Math.round(input.settings.glassReflectionLevel * 100)} percent`,
      `concrete wear level ${Math.round(input.settings.concreteWearLevel * 100)} percent`,
      `vegetation naturalness ${Math.round(input.settings.vegetationNaturalness * 100)} percent`,
    ],
    environmentRules: [
      "keep the existing environment layout untouched",
      "retain all roads rails landscape masses and vehicle placements",
      "improve realism through texture response and believable atmosphere only",
    ],
    lightingRules: [
      `shadow strength ${Math.round(input.settings.shadowStrength * 100)} percent`,
      `ambient occlusion level ${Math.round(input.settings.ambientOcclusionLevel * 100)} percent`,
      "maintain realistic daylight balance without stylized contrast swings",
    ],
    cameraRules: [
      "architectural photography lens discipline",
      "no camera shift",
      "no perspective correction changes",
      "no framing changes",
    ],
    negativeInstructions: IMMUTABLE_NEGATIVE_INSTRUCTIONS,
    styleKeywords: [
      "photorealistic",
      "architectural photography",
      "high-fidelity materials",
      input.presetName.toLowerCase(),
      "engineering review safe",
    ],
  };

  const customBlock =
    input.customDirectives && input.customDirectives.length > 0
      ? `custom directives: ${input.customDirectives.join(", ")}`
      : "";

  const fullPrompt = [
    `Render2Real Pro realism enhancement for ${input.imageName}.`,
    `Preset: ${input.presetName}.`,
    `Preservation rules: ${sections.preservationRules.join(", ")}.`,
    `Realism enhancement rules: ${sections.realismEnhancementRules.join(", ")}.`,
    `Material enhancement rules: ${sections.materialEnhancementRules.join(", ")}.`,
    `Environment rules: ${sections.environmentRules.join(", ")}.`,
    `Lighting rules: ${sections.lightingRules.join(", ")}.`,
    `Camera rules: ${sections.cameraRules.join(", ")}.`,
    `Negative instructions: ${sections.negativeInstructions.join(", ")}.`,
    `Style keywords: ${sections.styleKeywords.join(", ")}.`,
    customBlock,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title: `${input.presetName} prompt`,
    sections,
    fullPrompt,
  };
}
