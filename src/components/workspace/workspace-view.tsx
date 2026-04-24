"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  GripVertical,
  Image as ImageIcon,
  Link2,
  Link2Off,
  Maximize2,
  Minimize2,
  Paintbrush,
  PanelRightClose,
  ScanSearch,
  Share2,
  Sparkles,
  SplitSquareVertical,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { AppFrame } from "@/components/layout/app-frame";
import { FidelityBadge, type FidelityScore } from "@/components/workspace/fidelity-badge";
import { InpaintingCanvas } from "@/components/workspace/inpainting-canvas";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { ComparisonView } from "@/components/comparison/comparison-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { StatusDot } from "@/components/ui/status-dot";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/i18n";
import { ApiError, fetchJson } from "@/lib/fetch-json";
import {
  EXPORT_DESTINATIONS,
  getExportDestination,
  normalizeExportDestination,
  type ExportDestinationId,
} from "@/services/export/export-destinations";
import { useAppPreferencesStore } from "@/store/app-preferences";
import { useWorkspaceStore } from "@/store/workspace-store";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProjectDataResponse = {
  project: {
    id: string;
    name: string;
    description?: string | null;
    clientName?: string | null;
    shareToken?: string | null;
    imageAssets: Array<{
      id: string;
      originalFileName: string;
      previewUrl: string;
      storedFileUrl: string;
      width: number;
      height: number;
      status: string;
      imageVersions: Array<{
        id: string;
        versionType: string;
        fileUrl: string;
        createdAt: string;
      }>;
      generationLogs: Array<{
        id: string;
        providerName: string;
        success: boolean;
        errorMessage?: string | null;
        status: string;
        processingTime: number;
        createdAt: string;
      }>;
    }>;
  };
  presets: Array<{
    id: string;
    name: string;
    category: string;
    description?: string | null;
    settings: Record<string, unknown>;
  }>;
};

type ProvidersResponse = {
  activeProvider: string;
  providers: Array<{
    name: string;
    label: string;
    configured: boolean;
    statusMessage: string;
    model?: string;
  }>;
};

// ─── Slider controls ─────────────────────────────────────────────────────────

const sliderControls = [
  { key: "brightness",     labelKey: "workspace.brightness",     min: 60,  max: 140 },
  { key: "contrast",       labelKey: "workspace.contrast",       min: 70,  max: 140 },
  { key: "highlights",     labelKey: "workspace.highlights",     min: 60,  max: 140 },
  { key: "shadows",        labelKey: "workspace.shadows",        min: 60,  max: 140 },
  { key: "saturation",     labelKey: "workspace.saturation",     min: 60,  max: 140 },
  { key: "temperature",    labelKey: "workspace.temperature",    min: -30, max: 30  },
  { key: "sharpen",        labelKey: "workspace.sharpen",        min: 0,   max: 40  },
  { key: "dehaze",         labelKey: "workspace.dehaze",         min: 0,   max: 40  },
  { key: "noiseReduction", labelKey: "workspace.noiseReduction", min: 0,   max: 40  },
  { key: "vignette",       labelKey: "workspace.vignette",       min: 0,   max: 30  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyPresetToEditorSliders(
  settings: Record<string, unknown>,
  setEditorValue: (key: string, value: number) => void
) {
  const ri  = typeof settings.realismIntensity      === "number" ? settings.realismIntensity      : 0.85;
  const ss  = typeof settings.shadowStrength        === "number" ? settings.shadowStrength        : 0.5;
  const ao  = typeof settings.ambientOcclusionLevel === "number" ? settings.ambientOcclusionLevel : 0.5;
  const wi  = typeof settings.weatheringIntensity   === "number" ? settings.weatheringIntensity   : 0.3;
  const ri2 = typeof settings.reflectionIntensity   === "number" ? settings.reflectionIntensity   : 0.5;
  const vn  = typeof settings.vegetationNaturalness === "number" ? settings.vegetationNaturalness : 0.4;
  setEditorValue("brightness",    Math.round(90 + ri  * 20));
  setEditorValue("contrast",      Math.round(85 + ss  * 30));
  setEditorValue("shadows",       Math.round(70 + ao  * 40));
  setEditorValue("highlights",    Math.round(80 + ri2 * 30));
  setEditorValue("saturation",    Math.round(80 + vn  * 30));
  setEditorValue("temperature",   Math.round(-10 + wi * 20));
  setEditorValue("sharpen",       Math.round(ri  * 18));
  setEditorValue("dehaze",        Math.round(ao  * 20));
}

function formatVersionLabel(
  versionType: string,
  language: ReturnType<typeof useAppPreferencesStore.getState>["language"]
) {
  switch (versionType) {
    case "realism_pass": return t("versions.realism_pass", language);
    case "texture_pass": return t("versions.texture_pass", language);
    case "original":     return t("versions.original", language);
    case "edited":       return t("versions.edited", language);
    case "final":        return t("versions.final", language);
    default:             return versionType;
  }
}

export function getControlledSelectValue(value?: string) {
  return value ?? "";
}

// ─── Zoomable image panel ─────────────────────────────────────────────────────

function ZoomableImagePanel({
  src,
  alt,
  label,
  badge,
  emptyText,
  className = "",
  filterStyle,
  onFullscreen,
}: {
  src?: string;
  alt: string;
  label: string;
  badge?: React.ReactNode;
  emptyText: string;
  className?: string;
  filterStyle?: string;
  onFullscreen?: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(5, Math.max(1, z - e.deltaY * 0.001)));
  }, []);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  }, [zoom, offset]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
      y: dragStart.current.oy + (e.clientY - dragStart.current.my),
    });
  }, [dragging]);
  const handleMouseUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);
  const resetZoom = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, []);

  return (
    <div className={`overflow-hidden rounded-[28px] border border-white/8 bg-[#0a0d14] flex flex-col ${className}`}>
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5 shrink-0">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</span>
        <div className="flex items-center gap-2">
          {badge}
          {src && (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="flex size-5 items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 transition">
                <ZoomOut className="size-3" />
              </button>
              <span className="font-mono text-[0.6rem] text-zinc-600 w-8 text-center">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(5, z + 0.25))} className="flex size-5 items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 transition">
                <ZoomIn className="size-3" />
              </button>
              {zoom > 1 && (
                <button type="button" onClick={resetZoom} className="ml-1 rounded-md px-1.5 py-0.5 text-[0.6rem] text-zinc-500 hover:text-zinc-300 border border-white/10 transition">reset</button>
              )}
              {onFullscreen && (
                <button
                  type="button"
                  onClick={onFullscreen}
                  title="Teljes képernyő"
                  className="ml-1 flex size-5 items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 transition border border-white/10"
                >
                  <Maximize2 className="size-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div
        className="relative flex-1 overflow-hidden"
        style={{ minHeight: "18rem", cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {src ? (
          <div
            className="absolute inset-0"
            style={{ transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`, transformOrigin: "center center" }}
          >
            <Image
              src={src}
              alt={alt}
              fill
              unoptimized
              sizes="50vw"
              className="object-contain"
              draggable={false}
              style={filterStyle ? { filter: filterStyle } : undefined}
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-[18px] border border-white/8 bg-white/4">
              <ImageIcon className="size-5 text-zinc-600" />
            </div>
            <p className="text-xs text-zinc-600">{emptyText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading overlay ──────────────────────────────────────────────────────────

function GeneratingOverlay({ language }: { language: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 rounded-[28px] bg-[#080b12]/92 backdrop-blur-sm"
    >
      {/* Animated rings */}
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute size-24 rounded-full border border-blue-500/20"
          style={{ borderTopColor: "rgba(59,130,246,0.7)" }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute size-16 rounded-full border border-violet-500/20"
          style={{ borderTopColor: "rgba(139,92,246,0.6)" }}
        />
        <div className="flex size-10 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10">
          <Sparkles className="size-5 text-blue-400" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-zinc-200">
          {language === "hu" ? "Generálás folyamatban…" : "Generation in progress…"}
        </p>
        <p className="text-xs text-zinc-500">
          {language === "hu" ? "Ez 30–90 másodpercet vehet igénybe" : "This may take 30–90 seconds"}
        </p>
      </div>
      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
            className="size-1.5 rounded-full bg-blue-400"
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Sortable asset card ────────────────────────────────────────────────────────────────────────────────────

function SortableAssetCard({
  asset,
  isSelected,
  language,
  onSelect,
  onDelete,
  isDeleting,
}: {
  asset: {
    id: string;
    originalFileName: string;
    previewUrl: string;
    width: number;
    height: number;
    status: string;
    imageVersions: Array<{ id: string; versionType: string; fileUrl: string; createdAt: string }>;
  };
  isSelected: boolean;
  language: string;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: asset.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        onClick={onSelect}
        className={`w-full overflow-hidden rounded-[20px] border text-left transition ${
          isSelected
            ? "surface-accent border-[color:var(--border-accent)]"
            : "surface-subtle hover:border-[color:var(--border-default)]"
        }`}
      >
        <div className="relative h-28 w-full bg-black/30">
          <Image src={asset.previewUrl} alt={asset.originalFileName} fill unoptimized sizes="240px" className="object-cover" />
          {/* Drag handle overlay */}
          <div
            {...attributes}
            {...listeners}
            className="absolute left-2 top-2 flex size-6 cursor-grab items-center justify-center rounded-[8px] border border-white/10 bg-black/60 text-zinc-400 backdrop-blur-sm hover:text-zinc-200 active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-3" />
          </div>
        </div>
        <div className="px-3 py-2.5">
          <div className="truncate text-sm font-medium text-white leading-tight">{asset.originalFileName}</div>
          <div className="mt-1 text-xs text-muted-foreground">{asset.width} × {asset.height}</div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[0.6rem] px-1.5 py-0">
              {asset.imageVersions.length} {language === "hu" ? "verzió" : "versions"}
            </Badge>
            <Badge variant="outline" className={`text-[0.6rem] px-1.5 py-0 flex items-center gap-1 ${asset.status === "ready" ? "border-emerald-500/30 text-emerald-400" : "border-zinc-600 text-zinc-500"}`}>
              <div className={`size-1 rounded-full ${asset.status === "ready" ? "bg-emerald-400" : "bg-zinc-500"}`} />
              {asset.status}
            </Badge>
          </div>
        </div>
      </button>
      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        disabled={isDeleting}
        title={language === "hu" ? "Törlés" : "Delete"}
        className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-[8px] border border-red-500/20 bg-black/60 text-red-400/70 backdrop-blur-sm transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────────────────────────────

export function WorkspaceView({ projectId }: { projectId: string }) {
  const language = useAppPreferencesStore((state) => state.language);
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [exportDestination, setExportDestination] = useState<ExportDestinationId>("local");
  const [exportFormat, setExportFormat] = useState<"png" | "jpg" | "webp">("png");
  const [exportQuality, setExportQuality] = useState(92);
  const [exportScale, setExportScale] = useState<1 | 2 | 4>(1);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [customPromptEnabled, setCustomPromptEnabled] = useState(false);
  const [customPromptText, setCustomPromptText] = useState("");
  const [generationFallback, setGenerationFallback] = useState<{
    message: string;
    retryable: boolean;
    canFallbackToMock: boolean;
    fallbackProvider?: string | null;
  } | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  // Local asset ordering (drag-to-reorder, client-side only)
  const [assetOrder, setAssetOrder] = useState<string[]>([]);
  // Batch generation state
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  // Fidelity score from last Fal.ai generation
  const [lastFidelityScore, setLastFidelityScore] = useState<FidelityScore | null>(null);
  // Inpainting canvas open state
  const [inpaintingOpen, setInpaintingOpen] = useState(false);

  // ESC key to close fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreenOpen) setFullscreenOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenOpen]);

  const {
    selectedAssetId,
    selectedVersionId,
    compareEnabled,
    activePresetId,
    queue,
    editor,
    setSelectedAsset,
    setCompareEnabled,
    setActivePresetId,
    setEditorValue,
    upsertQueueEntry,
  } = useWorkspaceStore();

  const { data, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchJson<ProjectDataResponse>(`/api/projects/${projectId}`),
  });
  const { data: providerData } = useQuery({
    queryKey: ["providers"],
    queryFn: () => fetchJson<ProvidersResponse>("/api/providers"),
  });

  const project = data?.project;
  const presets = useMemo(() => data?.presets ?? [], [data?.presets]);

  // Sync asset order when project data loads
  useEffect(() => {
    if (!project) return;
    const ids = project.imageAssets.map((a) => a.id);
    setAssetOrder((prev) => {
      if (prev.length === 0) return ids;
      // Merge: keep existing order, append new ones
      const existing = prev.filter((id) => ids.includes(id));
      const newOnes = ids.filter((id) => !prev.includes(id));
      return [...existing, ...newOnes];
    });
  }, [project]);

  // Sorted assets based on local assetOrder
  const sortedAssets = useMemo(() => {
    if (!project) return [];
    if (assetOrder.length === 0) return project.imageAssets;
    return [...project.imageAssets].sort((a, b) => {
      const ai = assetOrder.indexOf(a.id);
      const bi = assetOrder.indexOf(b.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [project, assetOrder]);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setAssetOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);
  const activeProvider = providerData?.providers.find((p) => p.name === providerData.activeProvider);
  const effectiveProvider = activeProvider?.configured
    ? activeProvider
    : providerData?.providers.find((p) => p.name === "mock-local");

  // Selected asset and version
  const selectedAsset =
    project?.imageAssets.find((a) => a.id === selectedAssetId) ?? project?.imageAssets[0];

  // Version selection: selectedVersionId from store, or first version
  const selectedVersion = useMemo(() => {
    if (!selectedAsset) return undefined;
    if (selectedVersionId) {
      const found = selectedAsset.imageVersions.find((v) => v.id === selectedVersionId);
      if (found) return found;
    }
    return selectedAsset.imageVersions[0];
  }, [selectedAsset, selectedVersionId]);

  // For comparison: original vs selected version (or latest generated)
  const originalVersion = selectedAsset?.imageVersions.find((v) => v.versionType === "original");
  const compareVersion = selectedVersion ?? selectedAsset?.imageVersions[0];
  const hasGeneratedVersion = Boolean(compareVersion) && compareVersion?.versionType !== "original";

  useEffect(() => {
    if (!project || project.imageAssets.length === 0) return;
    const firstAsset = project.imageAssets[0];
    const latestVersion = firstAsset.imageVersions[0];
    if (!selectedAssetId) setSelectedAsset(firstAsset.id, latestVersion?.id);
    if (!activePresetId && presets[0]) setActivePresetId(presets[0].id);
  }, [activePresetId, presets, project, selectedAssetId, setActivePresetId, setSelectedAsset]);

  // Sync preset → sliders
  useEffect(() => {
    if (!activePresetId || customPromptEnabled) return;
    const preset = presets.find((p) => p.id === activePresetId);
    if (!preset) return;
    applyPresetToEditorSliders(preset.settings, (key, value) =>
      setEditorValue(key as Parameters<typeof setEditorValue>[0], value as never)
    );
  }, [activePresetId, presets, setEditorValue, customPromptEnabled]);

  const generateMutation = useMutation({
    mutationFn: (providerOverride?: string) =>
      fetchJson<{ generation: { generationLogId: string } }>("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageAssetId: selectedAsset?.id,
          presetId: customPromptEnabled ? undefined : activePresetId,
          customPrompt: customPromptEnabled ? customPromptText : undefined,
          providerOverride,
        }),
      }),
    onMutate: () => {
      setGenerationFallback(null);
      if (!selectedAsset) return;
      upsertQueueEntry({
        id: selectedAsset.id,
        label: selectedAsset.originalFileName,
        progress: 35,
        status: "processing",
        message: `${effectiveProvider ? effectiveProvider.model ?? effectiveProvider.name : "AI"} — ${language === "hu" ? "generálás folyamatban" : "generating"}`,
      });
    },
    onSuccess: (data) => {
      if (selectedAsset) {
        upsertQueueEntry({ id: selectedAsset.id, label: selectedAsset.originalFileName, progress: 100, status: "completed", message: t("workspace.generationSaved", language) });
      }
      toast.success(t("workspace.generationCompleted", language));
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      // Auto-enable comparison so user immediately sees before/after result
      setCompareEnabled(true);
      // Extract fidelity score if Fal.ai provider was used
      const fidelity = (data as { generation?: { fidelity?: FidelityScore } })?.generation?.fidelity;
      if (fidelity) setLastFidelityScore(fidelity);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setGenerationFallback({ message: error.message, retryable: Boolean(error.retryable), canFallbackToMock: Boolean(error.canFallbackToMock), fallbackProvider: error.fallbackProvider });
      }
      if (selectedAsset) {
        upsertQueueEntry({ id: selectedAsset.id, label: selectedAsset.originalFileName, progress: 100, status: "failed", message: error instanceof Error ? error.message : t("workspace.generationFailed", language) });
      }
      toast.error(error instanceof Error ? error.message : t("workspace.generationFailed", language));
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVersion) throw new Error(t("workspace.selectVersionToExport", language));
      const destination = getExportDestination(exportDestination);
      if (!destination?.configured) throw new Error(t("workspace.exportSetupRequired", language));
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageVersionId: selectedVersion.id,
          format: exportFormat,
          quality: exportQuality,
          width: exportScale > 1 ? (selectedAsset?.width ?? undefined) ? (selectedAsset as { width?: number }).width! * exportScale : undefined : undefined,
          height: exportScale > 1 ? (selectedAsset?.height ?? undefined) ? (selectedAsset as { height?: number }).height! * exportScale : undefined : undefined,
          filenameSuffix: "final",
          retainMetadata: true,
        }),
      });
      if (!response.ok) { const b = await response.json().catch(() => ({})); throw new Error(b.error ?? t("workspace.exportFailed", language)); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = exportFormat === "jpg" ? "jpg" : exportFormat === "webp" ? "webp" : "png";
      a.href = url; a.download = `${selectedAsset?.originalFileName?.replace(/\.[^.]+$/, "") ?? "render"}-final.${ext}`; a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success(t("workspace.exportPrepared", language)),
    onError: (err) => toast.error(err instanceof Error ? err.message : t("workspace.exportFailed", language)),
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) =>
      fetchJson(`/api/projects/${projectId}/assets/${assetId}`, { method: "DELETE" }),
    onSuccess: (_, assetId) => {
      toast.success(language === "hu" ? "Fájl törölve" : "File deleted");
      // If deleted asset was selected, clear selection
      if (selectedAssetId === assetId) setSelectedAsset(undefined, undefined);
      setAssetOrder((prev) => prev.filter((id) => id !== assetId));
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  // Restore a previous version (duplicate it as a new realism_pass version)
  const restoreVersionMutation = useMutation({
    mutationFn: ({ assetId, versionId }: { assetId: string; versionId: string }) =>
      fetchJson<{ version: { id: string } }>(`/api/projects/${projectId}/assets/${assetId}/versions/${versionId}/restore`, { method: "POST" }),
    onSuccess: (data, { assetId }) => {
      toast.success(language === "hu" ? "Verzió visszaallítva" : "Version restored");
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      // Select the newly created version
      setSelectedAsset(assetId, data.version.id);
      setCompareEnabled(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Restore failed"),
  });

  // Share project mutations
  const shareToken = project?.shareToken;
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const generateShareMutation = useMutation({
    mutationFn: () => fetchJson<{ shareToken: string }>(`/api/projects/${projectId}/share`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success(language === "hu" ? "Megosztási link létrehozva" : "Share link created");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Share failed"),
  });

  const revokeShareMutation = useMutation({
    mutationFn: () => fetchJson(`/api/projects/${projectId}/share`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success(language === "hu" ? "Megosztási link visszavonva" : "Share link revoked");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Revoke failed"),
  });

  const handleBatchGenerate = useCallback(async () => {
    if (!sortedAssets.length || !activePresetId || batchGenerating) return;
    setBatchGenerating(true);
    setBatchProgress({ done: 0, total: sortedAssets.length });
    setGenerationFallback(null);
    const providerName = effectiveProvider?.name;
    for (let i = 0; i < sortedAssets.length; i++) {
      const asset = sortedAssets[i];
      upsertQueueEntry({
        id: asset.id,
        label: asset.originalFileName,
        progress: 10,
        status: "queued",
        message: language === "hu" ? `Várakozás… (${i + 1}/${sortedAssets.length})` : `Queued… (${i + 1}/${sortedAssets.length})`,
      });
    }
    for (let i = 0; i < sortedAssets.length; i++) {
      const asset = sortedAssets[i];
      upsertQueueEntry({
        id: asset.id,
        label: asset.originalFileName,
        progress: 35,
        status: "processing",
        message: `${providerName ?? "AI"} — ${language === "hu" ? "generálás folyamatban" : "generating"} (${i + 1}/${sortedAssets.length})`,
      });
      try {
        await fetchJson("/api/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageAssetId: asset.id,
            presetId: customPromptEnabled ? undefined : activePresetId,
            customPrompt: customPromptEnabled ? customPromptText : undefined,
          }),
        });
        upsertQueueEntry({
          id: asset.id,
          label: asset.originalFileName,
          progress: 100,
          status: "completed",
          message: language === "hu" ? "Mentve" : "Saved",
        });
        setBatchProgress({ done: i + 1, total: sortedAssets.length });
        await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      } catch (err) {
        upsertQueueEntry({
          id: asset.id,
          label: asset.originalFileName,
          progress: 100,
          status: "failed",
          message: err instanceof Error ? err.message : (language === "hu" ? "Hiba" : "Failed"),
        });
        setBatchProgress({ done: i + 1, total: sortedAssets.length });
      }
    }
    setBatchGenerating(false);
    toast.success(language === "hu" ? "Batch generálás kész" : "Batch generation complete");
    setCompareEnabled(true);
  }, [sortedAssets, activePresetId, batchGenerating, effectiveProvider, upsertQueueEntry, language, customPromptEnabled, customPromptText, queryClient, projectId, setCompareEnabled]);

  const latestLog = selectedAsset?.generationLogs[0];
  const referenceUrl = selectedAsset?.storedFileUrl;
  const displayUrl = selectedVersion?.fileUrl ?? referenceUrl;
  const isGenerating = generateMutation.isPending;

  // Compute CSS filter string from editor values for live preview
  const filterStyle = useMemo(() => {
    const b = editor.brightness ?? 100;
    const c = editor.contrast ?? 100;
    const s = editor.saturation ?? 100;
    const sh = editor.sharpen ?? 0;
    const haze = editor.dehaze ?? 0;
    const temp = editor.temperature ?? 0;
    const vignette = editor.vignette ?? 0;
    const parts: string[] = [];
    if (b !== 100) parts.push(`brightness(${b / 100})`);
    if (c !== 100) parts.push(`contrast(${c / 100})`);
    if (s !== 100) parts.push(`saturate(${s / 100})`);
    if (sh > 0) parts.push(`contrast(${1 + sh * 0.003})`);
    if (haze > 0) parts.push(`blur(${haze * 0.02}px)`);
    if (temp > 0) parts.push(`sepia(${temp * 0.003})`);
    else if (temp < 0) parts.push(`hue-rotate(${temp * 0.2}deg)`);
    if (vignette > 0) parts.push(`brightness(${1 - vignette * 0.002})`);
    return parts.length > 0 ? parts.join(" ") : undefined;
  }, [editor]);

  // Comparison: show original vs selected version
  const comparisonPanel = useMemo(() => {
    if (!referenceUrl) return null;
    const afterUrl = hasGeneratedVersion && compareVersion?.fileUrl ? compareVersion.fileUrl : displayUrl;
    return (
      <ComparisonView
        before={originalVersion?.fileUrl ?? referenceUrl}
        after={afterUrl ?? referenceUrl}
        mode="slider"
        beforeLabel={language === "hu" ? "Eredeti render" : "Original render"}
        afterLabel={language === "hu" ? "AI-javított eredmény" : "AI-enhanced result"}
        afterFilterStyle={filterStyle}
      />
    );
  }, [referenceUrl, hasGeneratedVersion, compareVersion, displayUrl, originalVersion, language, filterStyle]);

  return (
    <>
      {/* ── FULLSCREEN OVERLAY ───────────────────────────────────────────── */}
      <AnimatePresence>
        {fullscreenOpen && (
          <motion.div
            key="fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-[#07090e]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-6 py-3">
              <span className="text-sm font-medium text-zinc-300">
                {language === "hu" ? "Teljes képernyős nézet" : "Fullscreen view"}
              </span>
              <div className="flex items-center gap-3">
                {/* Mini controls in fullscreen */}
                {!customPromptEnabled && (
                  <div
                    className="flex items-center gap-3"
                    style={{ pointerEvents: "auto", position: "relative", zIndex: 60 }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {sliderControls.slice(0, 3).map((ctrl) => (
                      <div key={ctrl.key} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 whitespace-nowrap">{t(ctrl.labelKey, language)}</span>
                        <div
                          style={{ pointerEvents: "auto", position: "relative", zIndex: 60 }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <Slider
                            value={[Number(editor[ctrl.key as keyof typeof editor])]}
                            min={ctrl.min}
                            max={ctrl.max}
                            step={1}
                            className="w-24"
                            onValueChange={(v) => setEditorValue(ctrl.key as keyof typeof editor, (Array.isArray(v) ? v[0] : v) as never)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Compare toggle in fullscreen */}
                {hasGeneratedVersion && (
                  <button
                    type="button"
                    onClick={() => setCompareEnabled(!compareEnabled)}
                    className={`flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs transition ${
                      compareEnabled
                        ? "border-blue-500/40 bg-blue-500/15 text-blue-300"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                    }`}
                  >
                    <SplitSquareVertical className="size-3.5" />
                    {compareEnabled
                      ? (language === "hu" ? "Összehasonlítás ki" : "Hide compare")
                      : (language === "hu" ? "Összehasonlítás" : "Compare")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFullscreenOpen(false)}
                  className="flex size-8 items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200"
                >
                  <Minimize2 className="size-4" />
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="min-h-0 flex-1 p-4 flex gap-4 overflow-hidden">
              {/* Main image area */}
              <div className="min-h-0 flex-1 flex flex-col">
                {compareEnabled && hasGeneratedVersion ? (
                  <ComparisonView
                    before={originalVersion?.fileUrl ?? referenceUrl ?? ""}
                    after={compareVersion?.fileUrl ?? displayUrl ?? ""}
                    mode="slider"
                    beforeLabel={language === "hu" ? "Eredeti render" : "Original render"}
                    afterLabel={language === "hu" ? "AI-javított eredmény" : "AI-enhanced result"}
                    afterFilterStyle={filterStyle}
                    className="h-full"
                  />
                ) : (
                  <ZoomableImagePanel
                    src={displayUrl}
                    alt={language === "hu" ? "Előnézet" : "Preview"}
                    label={language === "hu" ? "Előnézet" : "Preview"}
                    emptyText={language === "hu" ? "Tölts fel egy képet" : "Upload an image"}
                    filterStyle={filterStyle}
                    className="h-full"
                  />
                )}
              </div>

              {/* Right panel: version picker + sliders — always visible when compare is OFF */}
              {!compareEnabled && selectedAsset && (
                <div
                  className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto rounded-[20px] border border-white/8 bg-[#0a0d14] p-4"
                  style={{ pointerEvents: "auto" }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Version picker */}
                  {selectedAsset.imageVersions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-zinc-600">
                        {language === "hu" ? "Verziók" : "Versions"}
                      </div>
                      {selectedAsset.imageVersions.map((version) => {
                        const isActive = version.id === selectedVersion?.id;
                        const isGenerated = version.versionType !== "original";
                        return (
                          <button
                            key={version.id}
                            type="button"
                            onClick={() => setSelectedAsset(selectedAsset.id, version.id)}
                            className={`flex items-center gap-2 rounded-[14px] border px-3 py-2 text-left text-xs transition ${
                              isActive
                                ? "border-blue-500/40 bg-blue-500/10 text-blue-200"
                                : "border-white/8 bg-white/3 text-zinc-400 hover:bg-white/5"
                            }`}
                          >
                            <ImageIcon className={`size-3 shrink-0 ${isActive ? "text-blue-400" : isGenerated ? "text-violet-400" : "text-zinc-600"}`} />
                            <span className="truncate">{formatVersionLabel(version.versionType, language)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Divider */}
                  {selectedAsset.imageVersions.length > 0 && <div className="border-t border-white/8" />}

                  {/* Full slider panel */}
                  {!customPromptEnabled && (
                    <div className="flex flex-col gap-3">
                      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-zinc-600">
                        {language === "hu" ? "Színek & fény" : "Color & Light"}
                      </div>
                      {sliderControls.map((ctrl) => (
                        <div key={ctrl.key} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span>{t(ctrl.labelKey, language)}</span>
                            <span className="font-mono text-zinc-600">{String(editor[ctrl.key as keyof typeof editor])}</span>
                          </div>
                          <div
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Slider
                              value={[Number(editor[ctrl.key as keyof typeof editor])]}
                              min={ctrl.min}
                              max={ctrl.max}
                              step={1}
                              onValueChange={(v) => setEditorValue(ctrl.key as keyof typeof editor, (Array.isArray(v) ? v[0] : v) as never)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    <AppFrame
      eyebrow={t("workspace.eyebrow", language)}
      title={project?.name ?? t("workspace.loadingTitle", language)}
    >
      <div
        className={`grid h-[calc(100vh-9rem)] gap-4 ${
          controlsCollapsed
            ? "xl:grid-cols-[240px_minmax(0,1fr)]"
            : "xl:grid-cols-[240px_minmax(0,1fr)_340px]"
        }`}
      >
        {/* ── LEFT: Asset list ─────────────────────────────────────────────── */}
        <Card className="surface-panel flex flex-col overflow-hidden">
          <CardHeader className="shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{t("workspace.projectFiles", language)}</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {project?.clientName || t("common.localFirstWorkspace", language)}
            </CardDescription>
            {/* Stacked upload buttons */}
            <div className="mt-2">
              <UploadDropzone projectId={projectId} />
            </div>
          </CardHeader>
          <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-2 pr-1">
                {isLoading && (
                  <div className="flex flex-col gap-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-36 animate-pulse rounded-[20px] bg-white/5" />
                    ))}
                  </div>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={sortedAssets.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                    {sortedAssets.map((asset) => (
                      <SortableAssetCard
                        key={asset.id}
                        asset={asset}
                        isSelected={asset.id === selectedAsset?.id}
                        language={language}
                        onSelect={() => setSelectedAsset(asset.id, asset.imageVersions[0]?.id)}
                        onDelete={() => {
                          if (confirm(language === "hu" ? `Töröljük a(z) "${asset.originalFileName}" fájlt?` : `Delete "${asset.originalFileName}"?`)) {
                            deleteAssetMutation.mutate(asset.id);
                          }
                        }}
                        isDeleting={deleteAssetMutation.isPending && deleteAssetMutation.variables === asset.id}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </ScrollArea>
          </div>
        </Card>

        {/* ── CENTER: Canvas ────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-panel flex min-h-0 flex-col rounded-[32px] p-4"
        >
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/8 pb-4">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-xs text-emerald-400">
              <div className="size-1.5 rounded-full bg-emerald-400" />
              {t("workspace.autoSaved", language)}
            </div>

            <div className="h-4 w-px bg-white/10" />

            {/* Compare toggle — opens fullscreen comparison */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (compareEnabled) {
                  // If already enabled, toggle off
                  startTransition(() => setCompareEnabled(false));
                } else {
                  // Enable compare and open fullscreen
                  startTransition(() => {
                    setCompareEnabled(true);
                    setFullscreenOpen(true);
                  });
                }
              }}
              disabled={!hasGeneratedVersion}
              className={compareEnabled ? "border-blue-500/40 bg-blue-500/10 text-blue-300" : ""}
            >
              <SplitSquareVertical data-icon="inline-start" />
              {compareEnabled ? t("workspace.hideCompare", language) : t("common.compare", language)}
            </Button>

            {/* Share button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShareDialogOpen((o) => !o)}
              className={shareToken ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : ""}
              title={language === "hu" ? "Projekt megosztása" : "Share project"}
            >
              <Share2 className="size-3.5 mr-1.5" />
              {shareToken
                ? (language === "hu" ? "Megosztva" : "Shared")
                : (language === "hu" ? "Megosztás" : "Share")}
            </Button>

            {/* Share dialog */}
            {shareDialogOpen && (
              <div className="absolute top-14 left-1/2 z-50 -translate-x-1/2 w-[420px] rounded-[20px] border border-white/10 bg-[#0d1117] p-5 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-100">{language === "hu" ? "Projekt megosztása" : "Share project"}</h3>
                  <button type="button" onClick={() => setShareDialogOpen(false)} className="text-zinc-500 hover:text-zinc-200">
                    <X className="size-4" />
                  </button>
                </div>
                {shareToken ? (
                  <>
                    <p className="text-xs text-zinc-500 mb-2">{language === "hu" ? "Nyilvános megosztási link:" : "Public share link:"}</p>
                    <div className="flex items-center gap-2 rounded-[12px] border border-white/10 bg-white/4 px-3 py-2">
                      <span className="flex-1 truncate font-mono text-xs text-zinc-300">
                        {typeof window !== "undefined" ? `${window.location.origin}/share/${shareToken}` : `/share/${shareToken}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/share/${shareToken}`;
                          navigator.clipboard.writeText(url);
                          toast.success(language === "hu" ? "Link másolva" : "Link copied");
                        }}
                        className="text-zinc-500 hover:text-zinc-200 transition"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 border-white/10 text-zinc-400"
                        onClick={() => revokeShareMutation.mutate()}
                        disabled={revokeShareMutation.isPending}
                      >
                        <Link2Off className="size-3.5 mr-1.5" />
                        {language === "hu" ? "Link visszavonása" : "Revoke link"}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-white/10 text-zinc-400"
                        onClick={() => generateShareMutation.mutate()}
                        disabled={generateShareMutation.isPending}
                      >
                        <Link2 className="size-3.5 mr-1.5" />
                        {language === "hu" ? "Új link" : "New link"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-500 mb-3">{language === "hu" ? "Hozz létre egy nyilvános linket, amelyen keresztül bárki megtekintheti a projekt eredményeit." : "Create a public link so anyone can view the project results."}</p>
                    <Button size="sm" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0"
                      onClick={() => generateShareMutation.mutate()}
                      disabled={generateShareMutation.isPending}
                    >
                      <Link2 className="size-3.5 mr-1.5" />
                      {language === "hu" ? "Megosztási link létrehozása" : "Create share link"}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Provider pill */}
            <div className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs text-zinc-400">
              <div className="size-1.5 rounded-full bg-blue-400" />
              {effectiveProvider?.model ? (
                <span className="font-mono text-[0.7rem]">{effectiveProvider.model}</span>
              ) : (
                <span>{t("common.loading", language)}</span>
              )}
              {activeProvider && !activeProvider.configured ? (
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[0.65rem]">
                  {t("workspace.fallback", language)}
                </Badge>
              ) : null}
            </div>

            {/* Export */}
            <div className="flex items-center gap-1">
              <Select value={exportDestination} onValueChange={(v) => setExportDestination(normalizeExportDestination(v))}>
                <SelectTrigger size="sm" className="h-8 min-w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    {EXPORT_DESTINATIONS.map((dest) => (
                      <SelectItem key={dest.id} value={dest.id}>{t(dest.labelKey, language)}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {/* Format selector */}
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "png" | "jpg" | "webp")}>
                <SelectTrigger size="sm" className="h-8 w-20 text-xs uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpg">JPG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {/* Scale selector */}
              <Select value={String(exportScale)} onValueChange={(v) => setExportScale(Number(v) as 1 | 2 | 4)}>
                <SelectTrigger size="sm" className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                    <SelectItem value="4">4x</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => exportMutation.mutate()} disabled={!selectedVersion || exportMutation.isPending} className="h-8" title={language === "hu" ? "Export" : "Export"}>
                <Download className="size-3.5" />
              </Button>
            </div>

            {/* Collapse icon */}
            <button
              type="button"
              onClick={() => setControlsCollapsed((c) => !c)}
              title={controlsCollapsed ? t("workspace.showControls", language) : t("workspace.hideControls", language)}
              className="flex size-8 items-center justify-center rounded-[10px] border border-white/10 bg-white/4 text-zinc-400 transition hover:bg-white/8 hover:text-zinc-200"
            >
              {controlsCollapsed ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
            {/* Fallback banner */}
            {generationFallback ? (
              <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 px-4 py-4">
                <div className="text-sm font-medium text-amber-100">{t("workspace.generationUnavailableTitle", language)}</div>
                <p className="mt-2 text-sm leading-6 text-amber-50/85">{generationFallback.message}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {generationFallback.retryable && (
                    <Button variant="outline" size="sm" onClick={() => generateMutation.mutate(undefined)} disabled={isGenerating}>{t("workspace.retryWithOpenAi", language)}</Button>
                  )}
                  {generationFallback.canFallbackToMock && (
                    <Button size="sm" onClick={() => generateMutation.mutate(generationFallback.fallbackProvider ?? "mock-local")} disabled={isGenerating}>{t("workspace.runWithMock", language)}</Button>
                  )}
                </div>
              </div>
            ) : null}

            {/* ── Fidelity badge + Inpainting button ─────────────────────── */}
            {(lastFidelityScore || hasGeneratedVersion) && (
              <div className="flex items-center gap-2 mb-2">
                {lastFidelityScore && (
                  <FidelityBadge fidelity={lastFidelityScore} />
                )}
                {hasGeneratedVersion && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
                    onClick={() => setInpaintingOpen(true)}
                  >
                    <Paintbrush className="h-3 w-3" />
                    {language === "hu" ? "Anyagszerkesztő" : "Material editor"}
                  </Button>
                )}
              </div>
            )}

            {/* ── MAIN CANVAS: comparison slider OR original reference ─────── */}
            <div className="relative min-h-0 flex-1">
              <AnimatePresence>
                {isGenerating && <GeneratingOverlay language={language} />}
              </AnimatePresence>
              {isLoading ? (
                <div className="h-full rounded-[28px] bg-white/5 animate-pulse" />
              ) : compareEnabled && hasGeneratedVersion ? (
                comparisonPanel
              ) : (
                <ZoomableImagePanel
                  src={displayUrl}
                  alt={language === "hu" ? "Előnézet" : "Preview"}
                  label={language === "hu" ? "Előnézet" : "Preview"}
                  badge={
                    selectedVersion && hasGeneratedVersion ? (
                      <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-300 text-[0.65rem]">
                        {formatVersionLabel(selectedVersion.versionType, language)}
                      </Badge>
                    ) : undefined
                  }
                  emptyText={language === "hu" ? "Tölts fel egy képet" : "Upload an image"}
                  filterStyle={filterStyle}
                  onFullscreen={() => setFullscreenOpen(true)}
                  className="h-full"
                />
              )}
            </div>
            {/* ── PREVIEW IMAGE (bottom) ─────────────────────────────────────────────────── */}
            <ZoomableImagePanel
              src={displayUrl}
              alt={language === "hu" ? "Előnézeti kép" : "Preview image"}
              label={language === "hu" ? "Előnézeti kép" : "Preview image"}
              badge={
                selectedVersion ? (
                  <Badge variant="outline" className={`text-[0.6rem] px-1.5 py-0 ${
                    selectedVersion.versionType !== "original"
                      ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                      : "border-white/10 text-zinc-500"
                  }`}>
                    {formatVersionLabel(selectedVersion.versionType, language)}
                  </Badge>
                ) : undefined
              }
              emptyText={t("workspace.projectFiles", language)}
              filterStyle={filterStyle}
              onFullscreen={() => setFullscreenOpen(true)}
              className="shrink-0"
            />         {/* Queue status bar */}
            <div className="rounded-[20px] border border-white/8 bg-[#0a0d14] px-4 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <StatusDot
                    tone={
                      queue[0]?.status === "completed" ? "success"
                        : queue[0]?.status === "failed" ? "danger"
                        : queue[0]?.status === "queued" ? "warning"
                        : queue[0]?.status === "processing" ? "info"
                        : "neutral"
                    }
                  />
                  <span className="uppercase tracking-[0.14em]">{t("workspace.queueStatus", language)}</span>
                </div>
                <span className="font-mono text-xs text-zinc-400">
                  {queue[0]?.message || latestLog?.status || t("common.idle", language)}
                </span>
              </div>
              <ProgressMeter value={queue[0]?.progress ?? (isGenerating ? 55 : 0)} className="mt-2" />
              {latestLog ? (
                <div className="mt-2 flex items-center justify-between font-mono text-[0.65rem] text-zinc-600">
                  <span>{latestLog.processingTime} ms</span>
                  <span>{latestLog.success ? "✓" : latestLog.errorMessage || t("common.retryNeeded", language)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </motion.section>

        {/* ── RIGHT: Controls panel ─────────────────────────────────────────── */}
        {!controlsCollapsed ? (
          <Card className="surface-panel min-h-0">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-[10px] border border-blue-500/20 bg-blue-500/10">
                    <ScanSearch className="size-3.5 text-blue-400" />
                  </div>
                  <CardTitle className="text-sm">{t("workspace.controls", language)}</CardTitle>
                </div>
                <button
                  type="button"
                  onClick={() => setControlsCollapsed(true)}
                  title={t("workspace.hideControls", language)}
                  className="flex size-7 items-center justify-center rounded-[8px] border border-white/10 bg-white/4 text-zinc-500 transition hover:bg-white/8 hover:text-zinc-200"
                >
                  <PanelRightClose className="size-3.5" />
                </button>
              </div>
              <CardDescription className="text-xs">{t("workspace.controlsDescription", language)}</CardDescription>
            </CardHeader>

            <CardContent className="flex h-[calc(100%-5.5rem)] flex-col gap-4">
              <ScrollArea className="min-h-0 flex-1 pr-4">
                <div className="flex flex-col gap-5">

                  {/* ── VERSION HISTORY ───────────────────────────────────── */}
                  <div className="flex flex-col gap-2">
                    <div className="text-[0.65rem] uppercase tracking-[0.24em] text-zinc-600">
                      {t("workspace.versionHistory", language)}
                    </div>
                    {(!selectedAsset || selectedAsset.imageVersions.length === 0) && (
                      <div className="rounded-[16px] border border-white/8 bg-white/3 px-3 py-3 text-xs text-zinc-600">
                        {language === "hu" ? "Még nincs verzió" : "No versions yet"}
                      </div>
                    )}
                    {selectedAsset?.imageVersions.map((version) => {
                      const isGenerated = version.versionType === "realism_pass" || version.versionType === "texture_pass";
                      const isActive = version.id === selectedVersion?.id;
                      return (
                        <button
                          key={version.id}
                          type="button"
                          onClick={() => {
                            // Select the version and disable compare so the selected image is shown
                            setSelectedAsset(selectedAsset.id, version.id);
                            setCompareEnabled(false);
                          }}
                          className={`flex items-center justify-between rounded-[18px] border px-3 py-2.5 text-left transition ${
                            isActive
                              ? "border-blue-500/40 bg-blue-500/10"
                              : "border-white/8 bg-white/3 hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`flex size-8 items-center justify-center rounded-[12px] border ${isActive ? "border-blue-500/30 bg-blue-500/15" : "border-white/10 bg-white/5"}`}>
                              <ImageIcon className={`size-3.5 ${isActive ? "text-blue-400" : "text-zinc-500"}`} />
                            </div>
                            <div>
                              <div className={`text-xs font-medium ${isActive ? "text-blue-200" : "text-zinc-300"}`}>
                                {formatVersionLabel(version.versionType, language)}
                              </div>
                              <div className="font-mono text-[0.6rem] text-zinc-600">
                                {new Date(version.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isGenerated && !isActive && (
                              <button
                                type="button"
                                title={language === "hu" ? "Visszaallítás" : "Restore"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  restoreVersionMutation.mutate({ assetId: selectedAsset.id, versionId: version.id });
                                }}
                                className="flex size-6 items-center justify-center rounded-[8px] border border-white/10 bg-white/4 text-zinc-500 transition hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-400"
                              >
                                <ChevronLeft className="size-3" />
                              </button>
                            )}
                            <Badge
                              variant={isGenerated ? "secondary" : "outline"}
                              className={isGenerated
                                ? "border-violet-500/30 bg-violet-500/10 text-violet-300 text-[0.6rem]"
                                : "border-white/10 text-zinc-500 text-[0.6rem]"}
                            >
                              {isGenerated ? t("common.generated", language) : t("common.saved", language)}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <Separator />

                  {/* ── AUTO ENHANCE BUTTON ───────────────────────────────── */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="default"
                      onClick={() => generateMutation.mutate(undefined)}
                      disabled={!selectedAsset || !activePresetId || isGenerating || batchGenerating || customPromptEnabled}
                      className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-blue-500/20 border-0 h-11"
                    >
                      <Sparkles className="size-4 mr-2" />
                      {isGenerating
                        ? (language === "hu" ? "Generálás…" : "Generating…")
                        : (language === "hu" ? "Automatikus javítás" : "Auto enhance")}
                    </Button>
                    {/* Batch generate — only shown when multiple assets exist */}
                    {sortedAssets.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBatchGenerate}
                        disabled={!activePresetId || isGenerating || batchGenerating || customPromptEnabled}
                        className="w-full border-white/10 text-zinc-300 hover:bg-white/5"
                      >
                        <Sparkles className="size-3.5 mr-1.5" />
                        {batchGenerating
                          ? (language === "hu"
                              ? `Batch: ${batchProgress.done}/${batchProgress.total}…`
                              : `Batch: ${batchProgress.done}/${batchProgress.total}…`)
                          : (language === "hu"
                              ? `Összes generálása (${sortedAssets.length} kép)`
                              : `Generate all (${sortedAssets.length} images)`)}
                      </Button>
                    )}
                    <p className="text-[0.65rem] text-zinc-600 text-center">
                      {language === "hu"
                        ? "Az aktív preset és beállítások alapján"
                        : "Based on active preset and settings"}
                    </p>
                  </div>

                  <Separator />

                  {/* ── PRESET ────────────────────────────────────────────── */}
                  <div className="flex flex-col gap-2">
                    <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                      {t("workspace.preset", language)}
                    </div>
                    <Select
                      value={getControlledSelectValue(activePresetId)}
                      onValueChange={(value) => setActivePresetId(value || undefined)}
                      disabled={customPromptEnabled}
                    >
                      <SelectTrigger>
                        {/* Show human-readable preset name instead of raw ID */}
                        <span className="truncate text-sm">
                          {activePresetId
                            ? t(`preset.${presets.find((p) => p.id === activePresetId)?.name ?? ""}` as Parameters<typeof t>[0], language) || presets.find((p) => p.id === activePresetId)?.name
                            : t("workspace.selectPreset", language)}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {presets.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              {t(`preset.${preset.name}`, language)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ── SLIDERS ───────────────────────────────────────────── */}
                  {!customPromptEnabled && (
                    <div className="flex flex-col gap-3">
                      {sliderControls.map((control) => (
                        <div key={control.key} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-sm text-zinc-200">
                            <span>{t(control.labelKey, language)}</span>
                            <span className="text-zinc-500">{String(editor[control.key as keyof typeof editor])}</span>
                          </div>
                          <Slider
                            value={[Number(editor[control.key as keyof typeof editor])]}
                            min={control.min}
                            max={control.max}
                            step={1}
                            onValueChange={(nextValue) => {
                              const value = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                              setEditorValue(control.key as keyof typeof editor, value as never);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <Separator />

                  {/* ── CUSTOM PROMPT TOGGLE ──────────────────────────────── */}
                  <div className="flex flex-col gap-3">
                    <label className="flex cursor-pointer items-center gap-3">
                      <div className="relative shrink-0">
                        <input type="checkbox" className="sr-only" checked={customPromptEnabled} onChange={(e) => setCustomPromptEnabled(e.target.checked)} />
                        <div className={`h-5 w-9 rounded-full border transition-colors ${customPromptEnabled ? "border-blue-500/50 bg-blue-500" : "border-white/20 bg-white/10"}`} />
                        <div className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${customPromptEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-200">
                          {language === "hu" ? "Saját prompt" : "Custom prompt"}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {language === "hu" ? "Preset és sliderek helyett saját utasítás" : "Override preset and sliders"}
                        </div>
                      </div>
                    </label>

                    {customPromptEnabled && (
                      <div className="flex flex-col gap-2">
                        <Textarea
                          value={customPromptText}
                          onChange={(e) => setCustomPromptText(e.target.value)}
                          placeholder={language === "hu"
                            ? "Pl. Tedd fotórealisztikussá az épületet, tartsd meg a geometriát, adj hozzá természetes fényt és fákat..."
                            : "E.g. Make the building photorealistic, preserve geometry, add natural lighting and trees..."}
                          className="min-h-[100px] resize-none text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => generateMutation.mutate(undefined)}
                          disabled={!selectedAsset || !customPromptText.trim() || isGenerating}
                          className="w-full"
                        >
                          <ScanSearch data-icon="inline-start" />
                          {isGenerating
                            ? t("common.loading", language)
                            : (language === "hu" ? "Generálás saját prompttal" : "Generate with custom prompt")}
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* ── GENERATION HISTORY ───────────────────────────────── */}
                  {selectedAsset && selectedAsset.generationLogs.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="text-[0.65rem] uppercase tracking-[0.24em] text-zinc-600">
                        {language === "hu" ? "Generálási előzmények" : "Generation history"}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {selectedAsset.generationLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center gap-2 rounded-[12px] border border-white/8 bg-white/3 px-3 py-2"
                          >
                            <div className={`size-1.5 rounded-full shrink-0 ${
                              log.success ? "bg-emerald-400" : "bg-red-400"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs text-zinc-300 truncate">{log.providerName}</span>
                                <span className="text-[0.6rem] text-zinc-600 shrink-0">
                                  {log.processingTime > 0 ? `${(log.processingTime / 1000).toFixed(1)}s` : ""}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1 mt-0.5">
                                <span className="text-[0.6rem] text-zinc-600 truncate">
                                  {new Date(log.createdAt).toLocaleString(language === "hu" ? "hu-HU" : "en-US", {
                                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                  })}
                                </span>
                                {!log.success && log.errorMessage && (
                                  <span className="text-[0.6rem] text-red-400 truncate max-w-[100px]" title={log.errorMessage}>
                                    {log.errorMessage.slice(0, 24)}…
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── IMAGE METADATA ───────────────────────────────────── */}
                  {selectedAsset && (
                    <div className="flex flex-col gap-2">
                      <div className="text-[0.65rem] uppercase tracking-[0.24em] text-zinc-600">
                        {language === "hu" ? "Kép adatok" : "Image metadata"}
                      </div>
                      <div className="rounded-[12px] border border-white/8 bg-white/3 px-3 py-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.65rem] text-zinc-600">{language === "hu" ? "Fájlnév" : "Filename"}</span>
                          <span className="text-[0.65rem] text-zinc-400 truncate max-w-[140px]" title={selectedAsset.originalFileName}>
                            {selectedAsset.originalFileName}
                          </span>
                        </div>
                        {selectedAsset.width && selectedAsset.height && (
                          <div className="flex items-center justify-between">
                            <span className="text-[0.65rem] text-zinc-600">{language === "hu" ? "Felbontás" : "Resolution"}</span>
                            <span className="text-[0.65rem] text-zinc-400">{selectedAsset.width} × {selectedAsset.height}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[0.65rem] text-zinc-600">{language === "hu" ? "Verziók" : "Versions"}</span>
                          <span className="text-[0.65rem] text-zinc-400">{selectedAsset.imageVersions.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[0.65rem] text-zinc-600">{language === "hu" ? "Generálások" : "Generations"}</span>
                          <span className="text-[0.65rem] text-zinc-400">{selectedAsset.generationLogs.length}</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppFrame>
    <OnboardingTour language={language} />

    {/* ── Inpainting Canvas Overlay ────────────────────────────────── */}
    {inpaintingOpen && selectedAsset && displayUrl && (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
        <InpaintingCanvas
          imageUrl={displayUrl}
          imageWidth={selectedAsset.width ?? 1024}
          imageHeight={selectedAsset.height ?? 768}
          projectId={projectId}
          assetId={selectedAsset.id}
          onResult={(resultDataUri) => {
            toast.success(language === "hu" ? "Anyagcsere alkalmazva!" : "Material applied!");
            setInpaintingOpen(false);
            // Refresh project data to pick up any saved version
            queryClient.invalidateQueries({ queryKey: ["project", projectId] });
          }}
          onClose={() => setInpaintingOpen(false)}
          className="w-full max-w-5xl h-[80vh]"
        />
      </div>
    )}
    </>
  );
}
