"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  PanelRightClose,
  ScanSearch,
  SplitSquareVertical,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { AppFrame } from "@/components/layout/app-frame";
import { ComparisonView } from "@/components/comparison/comparison-view";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
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

// ─── Types ──────────────────────────────────────────────────────────────────

type ProjectDataResponse = {
  project: {
    id: string;
    name: string;
    description?: string | null;
    clientName?: string | null;
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

// ─── Slider controls definition ─────────────────────────────────────────────

const sliderControls = [
  { key: "brightness",    labelKey: "workspace.brightness",    min: 60,  max: 140 },
  { key: "contrast",      labelKey: "workspace.contrast",      min: 70,  max: 140 },
  { key: "highlights",    labelKey: "workspace.highlights",    min: 60,  max: 140 },
  { key: "shadows",       labelKey: "workspace.shadows",       min: 60,  max: 140 },
  { key: "saturation",    labelKey: "workspace.saturation",    min: 60,  max: 140 },
  { key: "temperature",   labelKey: "workspace.temperature",   min: -30, max: 30  },
  { key: "sharpen",       labelKey: "workspace.sharpen",       min: 0,   max: 40  },
  { key: "dehaze",        labelKey: "workspace.dehaze",        min: 0,   max: 40  },
  { key: "noiseReduction",labelKey: "workspace.noiseReduction",min: 0,   max: 40  },
  { key: "vignette",      labelKey: "workspace.vignette",      min: 0,   max: 30  },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyPresetToEditorSliders(
  settings: Record<string, unknown>,
  setEditorValue: (key: string, value: number) => void
) {
  const ri  = typeof settings.realismIntensity    === "number" ? settings.realismIntensity    : 0.85;
  const ss  = typeof settings.shadowStrength      === "number" ? settings.shadowStrength      : 0.5;
  const ao  = typeof settings.ambientOcclusionLevel === "number" ? settings.ambientOcclusionLevel : 0.5;
  const wi  = typeof settings.weatheringIntensity === "number" ? settings.weatheringIntensity : 0.3;
  const ri2 = typeof settings.reflectionIntensity === "number" ? settings.reflectionIntensity : 0.5;
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

function buildCssFilter(editor: ReturnType<typeof useWorkspaceStore.getState>["editor"]) {
  return [
    `brightness(${editor.brightness}%)`,
    `contrast(${editor.contrast}%)`,
    `saturate(${editor.saturation}%)`,
    `sepia(${Math.max(0, editor.temperature)}%)`,
  ].join(" ");
}

function formatVersionLabel(
  versionType: string,
  language: ReturnType<typeof useAppPreferencesStore.getState>["language"]
) {
  switch (versionType) {
    case "realism_pass":  return t("versions.realism_pass", language);
    case "texture_pass":  return t("versions.texture_pass", language);
    case "original":      return t("versions.original", language);
    case "edited":        return t("versions.edited", language);
    case "final":         return t("versions.final", language);
    default:              return versionType;
  }
}

export function getControlledSelectValue(value?: string) {
  return value ?? "";
}

// ─── Zoomable image panel ────────────────────────────────────────────────────

function ZoomableImagePanel({
  src,
  alt,
  label,
  badge,
  emptyText,
}: {
  src?: string;
  alt: string;
  label: string;
  badge?: React.ReactNode;
  emptyText: string;
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

  const resetZoom = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[#0a0d14] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5 shrink-0">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</span>
        <div className="flex items-center gap-2">
          {badge}
          {src && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
                className="flex size-5 items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 transition"
              >
                <ZoomOut className="size-3" />
              </button>
              <span className="font-mono text-[0.6rem] text-zinc-600 w-8 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
                className="flex size-5 items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 transition"
              >
                <ZoomIn className="size-3" />
              </button>
              {zoom > 1 && (
                <button
                  type="button"
                  onClick={resetZoom}
                  className="ml-1 rounded-md px-1.5 py-0.5 text-[0.6rem] text-zinc-500 hover:text-zinc-300 border border-white/10 transition"
                >
                  reset
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Canvas */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{ minHeight: "22rem", cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {src ? (
          <div
            className="absolute inset-0 transition-transform duration-75"
            style={{
              transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
              transformOrigin: "center center",
            }}
          >
            <Image
              src={src}
              alt={alt}
              fill
              unoptimized
              sizes="50vw"
              className="object-contain"
              draggable={false}
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

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkspaceView({ projectId }: { projectId: string }) {
  const language = useAppPreferencesStore((state) => state.language);
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [exportDestination, setExportDestination] = useState<ExportDestinationId>("local");
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [customPromptEnabled, setCustomPromptEnabled] = useState(false);
  const [customPromptText, setCustomPromptText] = useState("");
  const [generationFallback, setGenerationFallback] = useState<{
    message: string;
    retryable: boolean;
    canFallbackToMock: boolean;
    fallbackProvider?: string | null;
  } | null>(null);

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
  const activeProvider = providerData?.providers.find(
    (p) => p.name === providerData.activeProvider
  );
  const effectiveProvider = activeProvider?.configured
    ? activeProvider
    : providerData?.providers.find((p) => p.name === "mock-local");

  const selectedAsset =
    project?.imageAssets.find((a) => a.id === selectedAssetId) ?? project?.imageAssets[0];
  const selectedVersion =
    selectedAsset?.imageVersions.find((v) => v.id === selectedVersionId) ??
    selectedAsset?.imageVersions[0];
  const compareVersion =
    selectedAsset?.imageVersions.find((v) => v.versionType !== "original") ?? selectedVersion;

  useEffect(() => {
    if (!project || project.imageAssets.length === 0) return;
    const firstAsset = project.imageAssets[0];
    const latestVersion = firstAsset.imageVersions[0];
    if (!selectedAssetId) setSelectedAsset(firstAsset.id, latestVersion?.id);
    if (!activePresetId && presets[0]) setActivePresetId(presets[0].id);
  }, [activePresetId, presets, project, selectedAssetId, setActivePresetId, setSelectedAsset]);

  // Sync preset → slider values
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
        message: `${effectiveProvider ? t(`provider.${effectiveProvider.name}.label`, language) : t("workspace.provider", language)} ${t("workspace.generationRunning", language)}`,
      });
    },
    onSuccess: () => {
      if (selectedAsset) {
        upsertQueueEntry({
          id: selectedAsset.id,
          label: selectedAsset.originalFileName,
          progress: 100,
          status: "completed",
          message: t("workspace.generationSaved", language),
        });
      }
      toast.success(t("workspace.generationCompleted", language));
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setGenerationFallback({
          message: error.message,
          retryable: Boolean(error.retryable),
          canFallbackToMock: Boolean(error.canFallbackToMock),
          fallbackProvider: error.fallbackProvider,
        });
      }
      if (selectedAsset) {
        upsertQueueEntry({
          id: selectedAsset.id,
          label: selectedAsset.originalFileName,
          progress: 100,
          status: "failed",
          message: error instanceof Error ? error.message : t("workspace.generationFailed", language),
        });
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
          format: "png",
          quality: 95,
          filenameSuffix: "final",
          retainMetadata: true,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? t("workspace.exportFailed", language));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${selectedAsset?.originalFileName ?? "render"}-final.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success(t("workspace.exportPrepared", language)),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("workspace.exportFailed", language)),
  });

  const latestLog = selectedAsset?.generationLogs[0];
  const previewSource = selectedVersion?.fileUrl ?? selectedAsset?.storedFileUrl;
  const generatedSource = compareVersion?.fileUrl ?? previewSource;
  const hasGeneratedVersion = Boolean(compareVersion) && compareVersion?.versionType !== "original";

  // CSS filter applied to the live result panel
  const cssFilter = useMemo(() => buildCssFilter(editor), [editor]);

  // Comparison panel
  const comparisonPanel = useMemo(() => {
    if (!previewSource || !generatedSource) return null;
    return (
      <ComparisonView
        before={selectedAsset?.storedFileUrl ?? previewSource}
        after={generatedSource}
        mode="slider"
        beforeLabel={language === "hu" ? "Eredeti render" : "Original render"}
        afterLabel={language === "hu" ? "AI-javított eredmény" : "AI-enhanced result"}
      />
    );
  }, [generatedSource, previewSource, selectedAsset?.storedFileUrl, language]);

  return (
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
            <CardTitle className="text-sm">{t("workspace.projectFiles", language)}</CardTitle>
            <CardDescription className="text-xs">
              {project?.clientName || t("common.localFirstWorkspace", language)}
            </CardDescription>
          </CardHeader>
          <div className="shrink-0 px-4 pb-3">
            <UploadDropzone projectId={projectId} compact />
          </div>
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
                {project?.imageAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAsset(asset.id, asset.imageVersions[0]?.id)}
                    className={`w-full overflow-hidden rounded-[20px] border text-left transition ${
                      asset.id === selectedAsset?.id
                        ? "surface-accent border-[color:var(--border-accent)]"
                        : "surface-subtle hover:border-[color:var(--border-default)]"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-28 w-full bg-black/30">
                      <Image
                        src={asset.previewUrl}
                        alt={asset.originalFileName}
                        fill
                        unoptimized
                        sizes="240px"
                        className="object-cover"
                      />
                    </div>
                    {/* Meta */}
                    <div className="px-3 py-2.5">
                      <div className="truncate text-sm font-medium text-white leading-tight">
                        {asset.originalFileName}
                      </div>
                      <div className="mt-1.5 text-xs text-muted-foreground">
                        {asset.width} × {asset.height}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[0.6rem] px-1.5 py-0">
                          {asset.imageVersions.length} {t("common.versions", language)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[0.6rem] px-1.5 py-0 flex items-center gap-1 ${
                            asset.status === "ready"
                              ? "border-emerald-500/30 text-emerald-400"
                              : "border-zinc-600 text-zinc-500"
                          }`}
                        >
                          <div className={`size-1 rounded-full ${asset.status === "ready" ? "bg-emerald-400" : "bg-zinc-500"}`} />
                          {asset.status}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
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

            <Button
              size="sm"
              onClick={() => generateMutation.mutate(undefined)}
              disabled={
                !selectedAsset ||
                (!customPromptEnabled && !activePresetId) ||
                (customPromptEnabled && !customPromptText.trim()) ||
                generateMutation.isPending
              }
            >
              <ScanSearch data-icon="inline-start" />
              {generateMutation.isPending ? t("common.loading", language) : t("workspace.generate", language)}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => startTransition(() => setCompareEnabled(!compareEnabled))}
              disabled={!compareVersion || !hasGeneratedVersion}
              className={compareEnabled ? "border-blue-500/40 bg-blue-500/10 text-blue-300" : ""}
            >
              <SplitSquareVertical data-icon="inline-start" />
              {compareEnabled ? t("workspace.hideCompare", language) : t("common.compare", language)}
            </Button>

            {/* Provider pill — no label, just model */}
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

            {/* Export — destination dropdown + download button */}
            <div className="flex items-center gap-1">
              <Select
                value={exportDestination}
                onValueChange={(value) => setExportDestination(normalizeExportDestination(value))}
              >
                <SelectTrigger size="sm" className="h-8 min-w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    {EXPORT_DESTINATIONS.map((dest) => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {t(dest.labelKey, language)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportMutation.mutate()}
                disabled={!selectedVersion || exportMutation.isPending}
                className="h-8"
              >
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
            {/* Generation fallback banner */}
            {generationFallback ? (
              <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 px-4 py-4">
                <div className="text-sm font-medium text-amber-100">
                  {t("workspace.generationUnavailableTitle", language)}
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-50/85">{generationFallback.message}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {generationFallback.retryable && (
                    <Button variant="outline" size="sm" onClick={() => generateMutation.mutate(undefined)} disabled={generateMutation.isPending}>
                      {t("workspace.retryWithOpenAi", language)}
                    </Button>
                  )}
                  {generationFallback.canFallbackToMock && (
                    <Button size="sm" onClick={() => generateMutation.mutate(generationFallback.fallbackProvider ?? "mock-local")} disabled={generateMutation.isPending}>
                      {t("workspace.runWithMock", language)}
                    </Button>
                  )}
                </div>
              </div>
            ) : null}

            {/* ── LIVE RESULT / COMPARISON — TOP (full width) ─────────────── */}
            <div className="relative min-h-[22rem] flex-1">
              {isLoading ? (
                <div className="h-full rounded-[28px] bg-white/5 animate-pulse" />
              ) : compareEnabled && hasGeneratedVersion ? (
                comparisonPanel
              ) : (
                /* Live result with CSS filter applied */
                <div className="relative h-full overflow-hidden rounded-[28px] border border-white/8 bg-[#0a0d14]">
                  <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                      {language === "hu" ? "Élő előnézet" : "Live preview"}
                    </span>
                    {hasGeneratedVersion && compareVersion && (
                      <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-300 text-[0.65rem]">
                        {formatVersionLabel(compareVersion.versionType, language)}
                      </Badge>
                    )}
                  </div>
                  <div className="relative h-[calc(100%-2.5rem)]">
                    {previewSource ? (
                      <Image
                        src={hasGeneratedVersion && generatedSource ? generatedSource : previewSource}
                        alt="live preview"
                        fill
                        unoptimized
                        sizes="100vw"
                        className="object-contain"
                        style={{ filter: cssFilter }}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-[18px] border border-white/8 bg-white/4">
                          <ImageIcon className="size-5 text-zinc-600" />
                        </div>
                        <p className="text-xs text-zinc-600">{t("workspace.generate", language)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── ORIGINAL + LATEST GENERATED — BOTTOM (two columns) ──────── */}
            <div className="grid gap-4 lg:grid-cols-2">
              <ZoomableImagePanel
                src={selectedAsset?.storedFileUrl}
                alt={t("workspace.originalReference", language)}
                label={t("workspace.originalReference", language)}
                emptyText={t("workspace.projectFiles", language)}
              />
              <ZoomableImagePanel
                src={hasGeneratedVersion && generatedSource ? generatedSource : previewSource}
                alt={t("workspace.latestOutput", language)}
                label={t("workspace.latestOutput", language)}
                badge={
                  compareVersion && hasGeneratedVersion ? (
                    <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-300 text-[0.65rem]">
                      {formatVersionLabel(compareVersion.versionType, language)}
                    </Badge>
                  ) : undefined
                }
                emptyText={t("workspace.generate", language)}
              />
            </div>

            {/* Queue status bar */}
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
              <ProgressMeter
                value={queue[0]?.progress ?? (generateMutation.isPending ? 55 : 0)}
                className="mt-2"
              />
              {latestLog ? (
                <div className="mt-2 flex items-center justify-between font-mono text-[0.65rem] text-zinc-600">
                  <span>{latestLog.processingTime} ms</span>
                  <span>
                    {latestLog.success ? "✓" : latestLog.errorMessage || t("common.retryNeeded", language)}
                  </span>
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
                          onClick={() => setSelectedAsset(selectedAsset.id, version.id)}
                          className={`flex items-center justify-between rounded-[18px] border px-3 py-2.5 text-left transition ${
                            isActive
                              ? "border-blue-500/40 bg-blue-500/10"
                              : "border-white/8 bg-white/3 hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`flex size-8 items-center justify-center rounded-[12px] border ${
                              isActive ? "border-blue-500/30 bg-blue-500/15" : "border-white/10 bg-white/5"
                            }`}>
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
                          <Badge
                            variant={isGenerated ? "secondary" : "outline"}
                            className={isGenerated
                              ? "border-violet-500/30 bg-violet-500/10 text-violet-300 text-[0.6rem]"
                              : "border-white/10 text-zinc-500 text-[0.6rem]"}
                          >
                            {isGenerated ? t("common.generated", language) : t("common.saved", language)}
                          </Badge>
                        </button>
                      );
                    })}
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
                        <SelectValue placeholder={t("workspace.selectPreset", language)} />
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

                  {/* ── SLIDERS (hidden when custom prompt is on) ─────────── */}
                  {!customPromptEnabled && (
                    <div className="flex flex-col gap-3">
                      {sliderControls.map((control) => (
                        <div key={control.key} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-sm text-zinc-200">
                            <span>{t(control.labelKey, language)}</span>
                            <span className="text-zinc-500">
                              {String(editor[control.key as keyof typeof editor])}
                            </span>
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
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={customPromptEnabled}
                          onChange={(e) => setCustomPromptEnabled(e.target.checked)}
                        />
                        <div className={`h-5 w-9 rounded-full border transition-colors ${
                          customPromptEnabled
                            ? "border-blue-500/50 bg-blue-500"
                            : "border-white/20 bg-white/10"
                        }`} />
                        <div className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                          customPromptEnabled ? "translate-x-4" : "translate-x-0.5"
                        }`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-200">
                          {language === "hu" ? "Saját prompt" : "Custom prompt"}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {language === "hu"
                            ? "A preset és a sliderek helyett saját utasítást adok meg"
                            : "Override preset and sliders with your own instruction"}
                        </div>
                      </div>
                    </label>

                    {customPromptEnabled && (
                      <div className="flex flex-col gap-2">
                        <Textarea
                          value={customPromptText}
                          onChange={(e) => setCustomPromptText(e.target.value)}
                          placeholder={
                            language === "hu"
                              ? "Pl. Tedd fotórealisztikussá az épületet, tartsd meg a geometriát, adj hozzá természetes fényt és fákat..."
                              : "E.g. Make the building photorealistic, preserve geometry, add natural lighting and trees..."
                          }
                          className="min-h-[100px] resize-none text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => generateMutation.mutate(undefined)}
                          disabled={!selectedAsset || !customPromptText.trim() || generateMutation.isPending}
                          className="w-full"
                        >
                          <ScanSearch data-icon="inline-start" />
                          {generateMutation.isPending
                            ? t("common.loading", language)
                            : (language === "hu" ? "Generálás saját prompttal" : "Generate with custom prompt")}
                        </Button>
                      </div>
                    )}
                  </div>

                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppFrame>
  );
}
