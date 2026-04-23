import { z } from "zod";

import type {
  MaterialPreset,
  SelectionBounds,
  SelectionMask,
  SelectionMode,
  TextureApplyRequest,
  TexturePreviewRequest,
  TextureSelectionResponse,
  TextureTargetingRequest,
} from "@/types/domain";

export const MATERIAL_PRESETS: MaterialPreset[] = [
  "brick",
  "concrete",
  "glass",
  "wood",
  "metal",
  "roof",
  "asphalt",
];

const selectionPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const selectionMaskSchema = z.object({
  id: z.string().min(1),
  selectionMode: z.enum(["click-select", "brush-mask"]),
  bounds: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0).max(1),
    height: z.number().min(0).max(1),
  }),
  coverage: z.number().min(0).max(1),
  anchor: selectionPointSchema.optional(),
  points: z.array(selectionPointSchema).optional(),
});

export const textureTargetingRequestSchema = z.object({
  imageAssetId: z.string().min(1),
  selectionMode: z.enum(["click-select", "brush-mask"]),
  selectionInput: z.union([
    selectionPointSchema,
    z.object({
      points: z.array(selectionPointSchema).min(2),
    }),
  ]),
  materialPreset: z.enum(MATERIAL_PRESETS),
  customMaterialPrompt: z.string().optional(),
  referenceImageVersionId: z.string().optional(),
  preserveGeometry: z.boolean().optional().default(true),
  preserveLighting: z.boolean().optional().default(true),
  preserveSurroundings: z.boolean().optional().default(true),
});

export function normalizeTextureTargetingRequest(
  input: unknown
): TextureTargetingRequest {
  const parsed = textureTargetingRequestSchema.parse(input);

  return {
    ...parsed,
    customMaterialPrompt: parsed.customMaterialPrompt?.trim() ?? "",
    preserveGeometry: true,
    preserveLighting: parsed.preserveLighting,
    preserveSurroundings: parsed.preserveSurroundings,
  };
}

const texturePreviewRequestSchema = textureTargetingRequestSchema.extend({
  selectionMask: selectionMaskSchema,
});

export function normalizeTexturePreviewRequest(input: unknown): TexturePreviewRequest {
  const parsed = texturePreviewRequestSchema.parse(input);
  const normalized = normalizeTextureTargetingRequest(parsed);

  return {
    ...normalized,
    selectionMask: parsed.selectionMask as SelectionMask,
  };
}

export function normalizeTextureApplyRequest(input: unknown): TextureApplyRequest {
  const parsed = texturePreviewRequestSchema.parse(input);
  const normalized = normalizeTextureTargetingRequest(parsed);

  return {
    ...normalized,
    selectionMask: parsed.selectionMask as SelectionMask,
  };
}

function clampBounds(bounds: SelectionBounds): SelectionBounds {
  return {
    x: Math.max(0, Math.min(1, bounds.x)),
    y: Math.max(0, Math.min(1, bounds.y)),
    width: Math.max(0.08, Math.min(0.9, bounds.width)),
    height: Math.max(0.08, Math.min(0.9, bounds.height)),
  };
}

function makePreviewLabel(selectionMode: SelectionMode) {
  return selectionMode === "click-select" ? "Click Select preview" : "Brush Mask preview";
}

export function createMockTextureSelection(input: {
  imageAssetId: string;
  selectionMode: SelectionMode;
  selectionInput: TextureTargetingRequest["selectionInput"];
}): TextureSelectionResponse {
  const selectionPoints =
    "points" in input.selectionInput ? input.selectionInput.points : undefined;
  const bounds =
    input.selectionMode === "click-select"
      ? clampBounds({
          x: "x" in input.selectionInput ? input.selectionInput.x - 0.1 : 0.2,
          y: "y" in input.selectionInput ? input.selectionInput.y - 0.08 : 0.22,
          width: 0.24,
          height: 0.18,
        })
      : clampBounds(createBoundsFromPoints(selectionPoints ?? []));

  const mask: SelectionMask = {
    id: `${input.imageAssetId}-${input.selectionMode}-mask`,
    selectionMode: input.selectionMode,
    bounds,
    coverage: Number((bounds.width * bounds.height).toFixed(3)),
    anchor:
      "x" in input.selectionInput && "y" in input.selectionInput
        ? { x: input.selectionInput.x, y: input.selectionInput.y }
        : undefined,
    points: selectionPoints,
  };

  return {
    mask,
    previewLabel: makePreviewLabel(input.selectionMode),
    message: "Selection preview prepared.",
  };
}

function createBoundsFromPoints(points: Array<{ x: number; y: number }>): SelectionBounds {
  if (points.length === 0) {
    return {
      x: 0.2,
      y: 0.2,
      width: 0.18,
      height: 0.18,
    };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(0.08, maxX - minX),
    height: Math.max(0.08, maxY - minY),
  };
}
