export type PresetSettings = {
  realismIntensity: number;
  weatheringIntensity: number;
  reflectionIntensity: number;
  vegetationNaturalness: number;
  glassReflectionLevel: number;
  concreteWearLevel: number;
  shadowStrength: number;
  ambientOcclusionLevel: number;
  strictGeometryPreservation: boolean;
  avoidHallucinations: boolean;
};

export type PresetDefinition = {
  name: string;
  description: string;
  category: string;
  settings: PresetSettings;
};

export type PromptSections = {
  preservationRules: string[];
  realismEnhancementRules: string[];
  materialEnhancementRules: string[];
  environmentRules: string[];
  lightingRules: string[];
  cameraRules: string[];
  negativeInstructions: string[];
  styleKeywords: string[];
};

export type PromptDocument = {
  title: string;
  sections: PromptSections;
  fullPrompt: string;
};

export type BuildPromptInput = {
  imageName: string;
  presetName: string;
  settings: PresetSettings;
  customDirectives?: string[];
};

export type ProviderCapability = {
  name: string;
  label: string;
  description: string;
  configured: boolean;
  supportsRealtimeProgress: boolean;
  requiresApiKey: boolean;
  statusMessage: string;
  model?: string;
};

export type ProviderStatusSnapshot = {
  activeProvider: string;
  providers: ProviderCapability[];
};

export type ExportFormat = "png" | "jpg" | "webp";

export type ExportRequest = {
  imageVersionId: string;
  format: ExportFormat;
  quality: number;
  width?: number;
  height?: number;
  filenameSuffix: string;
  retainMetadata: boolean;
};

export type WorkspaceEditorState = {
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  saturation: number;
  temperature: number;
  sharpen: number;
  dehaze: number;
  noiseReduction: number;
  vignette: number;
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
};

export type GenerationRequestPayload = {
  imageAssetId: string;
  presetId: string;
  settingsOverride?: Partial<PresetSettings>;
  customDirectives?: string[];
  providerOverride?: string;
};

export type SelectionMode = "click-select" | "brush-mask";

export type MaterialPreset =
  | "brick"
  | "concrete"
  | "glass"
  | "wood"
  | "metal"
  | "roof"
  | "asphalt";

export type SelectionPoint = {
  x: number;
  y: number;
};

export type SelectionBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SelectionMask = {
  id: string;
  selectionMode: SelectionMode;
  bounds: SelectionBounds;
  coverage: number;
  anchor?: SelectionPoint;
  points?: SelectionPoint[];
};

export type TextureSelectionInput =
  | SelectionPoint
  | {
      points: SelectionPoint[];
    };

export type TextureTargetingRequest = {
  imageAssetId: string;
  selectionMode: SelectionMode;
  selectionInput: TextureSelectionInput;
  materialPreset: MaterialPreset;
  customMaterialPrompt?: string;
  referenceImageVersionId?: string;
  preserveGeometry: boolean;
  preserveLighting: boolean;
  preserveSurroundings: boolean;
};

export type TextureSelectionResponse = {
  mask: SelectionMask;
  previewLabel: string;
  message: string;
};

export type TexturePreviewRequest = TextureTargetingRequest & {
  selectionMask: SelectionMask;
};

export type TexturePreviewResponse = {
  previewVersionId: string;
  previewLabel: string;
  status: "ready";
  message: string;
};

export type TextureApplyRequest = TextureTargetingRequest & {
  selectionMask: SelectionMask;
};

export type TextureApplyResponse = {
  generationLogId: string;
  imageVersionId: string;
  versionType: "texture_pass";
  status: "completed";
  message: string;
};
