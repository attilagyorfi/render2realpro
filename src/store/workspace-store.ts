import { create } from "zustand";

import type {
  MaterialPreset,
  SelectionMask,
  SelectionMode,
  WorkspaceEditorState,
} from "@/types/domain";

type CompareLayout = "slider" | "side-by-side";
export type WorkspaceMode = "realism-pass" | "texture-targeting";
type TexturePreviewStatus = "idle" | "processing" | "ready" | "failed";

type QueueEntry = {
  id: string;
  label: string;
  progress: number;
  status: "queued" | "processing" | "completed" | "failed";
  message: string;
};

type WorkspaceStore = {
  mode: WorkspaceMode;
  selectedAssetId?: string;
  selectedVersionId?: string;
  compareEnabled: boolean;
  compareLayout: CompareLayout;
  activePresetId?: string;
  promptPreview?: string;
  queue: QueueEntry[];
  selectionMode: SelectionMode;
  selectionMask?: SelectionMask;
  targetMaterial: MaterialPreset;
  customMaterialPrompt: string;
  preserveGeometry: boolean;
  preserveLighting: boolean;
  preserveSurroundings: boolean;
  texturePreviewVersionId?: string;
  texturePreviewStatus: TexturePreviewStatus;
  editor: WorkspaceEditorState;
  setSelectedAsset: (assetId?: string, versionId?: string) => void;
  setMode: (mode: WorkspaceMode) => void;
  setCompareEnabled: (enabled: boolean) => void;
  setCompareLayout: (layout: CompareLayout) => void;
  setActivePresetId: (presetId?: string) => void;
  setPromptPreview: (prompt?: string) => void;
  setTextureTargetingValue: <
    K extends
      | "selectionMode"
      | "targetMaterial"
      | "customMaterialPrompt"
      | "preserveGeometry"
      | "preserveLighting"
      | "preserveSurroundings"
      | "texturePreviewVersionId"
      | "texturePreviewStatus",
  >(
    key: K,
    value: WorkspaceStore[K]
  ) => void;
  setSelectionMask: (mask?: SelectionMask) => void;
  setEditorValue: <K extends keyof WorkspaceEditorState>(
    key: K,
    value: WorkspaceEditorState[K]
  ) => void;
  upsertQueueEntry: (entry: QueueEntry) => void;
};

const defaultEditorState: WorkspaceEditorState = {
  brightness: 100,
  contrast: 100,
  highlights: 100,
  shadows: 100,
  saturation: 100,
  temperature: 0,
  sharpen: 0,
  dehaze: 0,
  noiseReduction: 0,
  vignette: 0,
  crop: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0,
};

export function createWorkspaceState() {
  return {
    mode: "realism-pass" as WorkspaceMode,
    compareEnabled: false,
    compareLayout: "slider" as CompareLayout,
    queue: [],
    selectionMode: "click-select" as SelectionMode,
    selectionMask: undefined,
    targetMaterial: "concrete" as MaterialPreset,
    customMaterialPrompt: "",
    preserveGeometry: true,
    preserveLighting: true,
    preserveSurroundings: true,
    texturePreviewVersionId: undefined,
    texturePreviewStatus: "idle" as TexturePreviewStatus,
    editor: defaultEditorState,
  };
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  ...createWorkspaceState(),
  setSelectedAsset: (selectedAssetId, selectedVersionId) =>
    set({ selectedAssetId, selectedVersionId }),
  setMode: (mode) => set({ mode }),
  setCompareEnabled: (compareEnabled) => set({ compareEnabled }),
  setCompareLayout: (compareLayout) => set({ compareLayout }),
  setActivePresetId: (activePresetId) => set({ activePresetId }),
  setPromptPreview: (promptPreview) => set({ promptPreview }),
  setTextureTargetingValue: (key, value) =>
    set({
      [key]: value,
    } as unknown as Pick<
      WorkspaceStore,
      | "selectionMode"
      | "targetMaterial"
      | "customMaterialPrompt"
      | "preserveGeometry"
      | "preserveLighting"
      | "preserveSurroundings"
      | "texturePreviewVersionId"
      | "texturePreviewStatus"
    >),
  setSelectionMask: (selectionMask) => set({ selectionMask }),
  setEditorValue: (key, value) =>
    set((state) => ({
      editor: {
        ...state.editor,
        [key]: value,
      },
    })),
  upsertQueueEntry: (entry) =>
    set((state) => ({
      queue: [
        entry,
        ...state.queue.filter((existingEntry) => existingEntry.id !== entry.id),
      ].slice(0, 6),
    })),
}));
