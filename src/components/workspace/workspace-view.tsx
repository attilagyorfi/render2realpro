"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Cropper from "react-easy-crop";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Image as ImageIcon,
  PanelRightClose,
  PanelRightOpen,
  ScanSearch,
  SplitSquareVertical,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { AppFrame } from "@/components/layout/app-frame";
import { ComparisonView } from "@/components/comparison/comparison-view";
import { TextureCanvas } from "@/components/workspace/texture-canvas";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/i18n";
import { ApiError, fetchJson } from "@/lib/fetch-json";
import {
  EXPORT_DESTINATIONS,
  getExportDestination,
  normalizeExportDestination,
  type ExportDestinationId,
} from "@/services/export/export-destinations";
import { MATERIAL_PRESETS } from "@/services/texture-targeting/texture-targeting-service";
import { useAppPreferencesStore } from "@/store/app-preferences";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { SelectionMask } from "@/types/domain";

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

const sliderControls = [
  { key: "brightness", labelKey: "workspace.brightness", min: 60, max: 140 },
  { key: "contrast", labelKey: "workspace.contrast", min: 70, max: 140 },
  { key: "highlights", labelKey: "workspace.highlights", min: 60, max: 140 },
  { key: "shadows", labelKey: "workspace.shadows", min: 60, max: 140 },
  { key: "saturation", labelKey: "workspace.saturation", min: 60, max: 140 },
  { key: "temperature", labelKey: "workspace.temperature", min: -30, max: 30 },
  { key: "sharpen", labelKey: "workspace.sharpen", min: 0, max: 40 },
  { key: "dehaze", labelKey: "workspace.dehaze", min: 0, max: 40 },
  { key: "noiseReduction", labelKey: "workspace.noiseReduction", min: 0, max: 40 },
  { key: "vignette", labelKey: "workspace.vignette", min: 0, max: 30 },
] as const;

const textureSelectionModes = [
  { value: "click-select", labelKey: "workspace.textureSelectionModeClick" },
  { value: "brush-mask", labelKey: "workspace.textureSelectionModeBrush" },
] as const;

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
    case "realism_pass":
      return t("versions.realism_pass", language);
    case "texture_pass":
      return t("versions.texture_pass", language);
    case "original":
      return t("versions.original", language);
    case "edited":
      return t("versions.edited", language);
    case "final":
      return t("versions.final", language);
    default:
      return versionType;
  }
}

function formatMaterialLabel(materialPreset: string) {
  return materialPreset.replace(/-/g, " ").replace(/\b\w/g, (value) => value.toUpperCase());
}

export function getControlledSelectValue(value?: string) {
  return value ?? "";
}

function buildSelectionInputFromMask(mask: SelectionMask) {
  if (mask.selectionMode === "brush-mask" && mask.points?.length) {
    return { points: mask.points };
  }

  if (mask.anchor) {
    return mask.anchor;
  }

  return {
    x: Number((mask.bounds.x + mask.bounds.width / 2).toFixed(3)),
    y: Number((mask.bounds.y + mask.bounds.height / 2).toFixed(3)),
  };
}

function buildBrushSelectionPoints(x: number, y: number) {
  return [
    { x: Math.max(0, x - 0.08), y: Math.max(0, y - 0.07) },
    { x: Math.min(1, x + 0.11), y: Math.max(0, y - 0.04) },
    { x: Math.min(1, x + 0.09), y: Math.min(1, y + 0.09) },
    { x: Math.max(0, x - 0.06), y: Math.min(1, y + 0.1) },
  ];
}

export function WorkspaceView({ projectId }: { projectId: string }) {
  const language = useAppPreferencesStore((state) => state.language);
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [exportDestination, setExportDestination] = useState<ExportDestinationId>("local");
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [generationFallback, setGenerationFallback] = useState<{
    message: string;
    retryable: boolean;
    canFallbackToMock: boolean;
    fallbackProvider?: string | null;
  } | null>(null);
  const {
    mode,
    selectedAssetId,
    selectedVersionId,
    compareEnabled,
    compareLayout,
    activePresetId,
    queue,
    editor,
    selectionMode,
    selectionMask,
    targetMaterial,
    customMaterialPrompt,
    preserveGeometry,
    preserveLighting,
    preserveSurroundings,
    texturePreviewVersionId,
    texturePreviewStatus,
    setMode,
    setSelectedAsset,
    setCompareEnabled,
    setCompareLayout,
    setActivePresetId,
    setTextureTargetingValue,
    setSelectionMask,
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
    (provider) => provider.name === providerData.activeProvider
  );
  const effectiveProvider = activeProvider?.configured
    ? activeProvider
    : providerData?.providers.find((provider) => provider.name === "mock-local");

  const selectedAsset =
    project?.imageAssets.find((asset) => asset.id === selectedAssetId) ?? project?.imageAssets[0];
  const selectedVersion =
    selectedAsset?.imageVersions.find((version) => version.id === selectedVersionId) ??
    selectedAsset?.imageVersions[0];
  const compareVersion =
    selectedAsset?.imageVersions.find((version) => version.versionType !== "original") ??
    selectedVersion;

  useEffect(() => {
    if (!project || project.imageAssets.length === 0) {
      return;
    }

    const firstAsset = project.imageAssets[0];
    const latestVersion = firstAsset.imageVersions[0];

    if (!selectedAssetId) {
      setSelectedAsset(firstAsset.id, latestVersion?.id);
    }

    if (!activePresetId && presets[0]) {
      setActivePresetId(presets[0].id);
    }
  }, [activePresetId, presets, project, selectedAssetId, setActivePresetId, setSelectedAsset]);

  useEffect(() => {
    setSelectionMask(undefined);
    setTextureTargetingValue("texturePreviewStatus", "idle");
    setTextureTargetingValue("texturePreviewVersionId", undefined);
  }, [selectedAsset?.id, setSelectionMask, setTextureTargetingValue]);

  const generateMutation = useMutation({
    mutationFn: (providerOverride?: string) =>
      fetchJson<{ generation: { generationLogId: string } }>("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageAssetId: selectedAsset?.id,
          presetId: activePresetId,
          providerOverride,
        }),
      }),
    onMutate: () => {
      setGenerationFallback(null);
      if (!selectedAsset) {
        return;
      }

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

      toast.success(
        `${effectiveProvider ? t(`provider.${effectiveProvider.name}.label`, language) : t("workspace.provider", language)} ${t("workspace.generationCompleted", language)}`
      );
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
          message:
            error instanceof Error ? error.message : t("workspace.generationFailed", language),
        });
      }
      toast.error(
        error instanceof Error ? error.message : t("workspace.generationFailed", language)
      );
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVersion) {
        throw new Error(t("workspace.selectVersionToExport", language));
      }

      const destination = getExportDestination(exportDestination);
      if (!destination?.configured) {
        throw new Error(t("workspace.exportSetupRequired", language));
      }

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

  const textureSelectionMutation = useMutation({
    mutationFn: (selectionInput: { x: number; y: number } | { points: Array<{ x: number; y: number }> }) =>
      fetchJson<{
        selection: {
          mask: SelectionMask;
          previewLabel: string;
          message: string;
        };
      }>("/api/texture-targeting/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageAssetId: selectedAsset?.id,
          selectionMode,
          selectionInput,
          materialPreset: targetMaterial,
          customMaterialPrompt,
          preserveGeometry,
          preserveLighting,
          preserveSurroundings,
        }),
      }),
    onSuccess: ({ selection }) => {
      setSelectionMask(selection.mask);
      setTextureTargetingValue("texturePreviewStatus", "idle");
      setTextureTargetingValue("texturePreviewVersionId", undefined);
      toast.success(selection.message);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("workspace.textureSelectionFailed", language)
      );
    },
  });

  const texturePreviewMutation = useMutation({
    mutationFn: () => {
      if (!selectedAsset || !selectionMask) {
        throw new Error(t("workspace.textureSelectionRequired", language));
      }

      return fetchJson<{
        preview: {
          previewVersionId: string;
          previewLabel: string;
          status: "ready";
          message: string;
        };
      }>("/api/texture-targeting/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageAssetId: selectedAsset.id,
          selectionMode,
          selectionInput: buildSelectionInputFromMask(selectionMask),
          materialPreset: targetMaterial,
          customMaterialPrompt,
          preserveGeometry,
          preserveLighting,
          preserveSurroundings,
          selectionMask,
        }),
      });
    },
    onMutate: () => {
      setTextureTargetingValue("texturePreviewStatus", "processing");
    },
    onSuccess: ({ preview }) => {
      setTextureTargetingValue("texturePreviewStatus", "ready");
      setTextureTargetingValue("texturePreviewVersionId", preview.previewVersionId);
      toast.success(preview.message);
    },
    onError: (error) => {
      setTextureTargetingValue("texturePreviewStatus", "failed");
      toast.error(
        error instanceof Error ? error.message : t("workspace.texturePreviewFailed", language)
      );
    },
  });

  const textureApplyMutation = useMutation({
    mutationFn: () => {
      if (!selectedAsset || !selectionMask) {
        throw new Error(t("workspace.textureSelectionRequired", language));
      }

      return fetchJson<{
        texturePass: {
          generationLogId: string;
          imageVersionId: string;
          versionType: "texture_pass";
          status: "completed";
          message: string;
        };
      }>("/api/texture-targeting/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageAssetId: selectedAsset.id,
          selectionMode,
          selectionInput: buildSelectionInputFromMask(selectionMask),
          materialPreset: targetMaterial,
          customMaterialPrompt,
          preserveGeometry,
          preserveLighting,
          preserveSurroundings,
          selectionMask,
        }),
      });
    },
    onMutate: () => {
      if (!selectedAsset) {
        return;
      }

      upsertQueueEntry({
        id: `${selectedAsset.id}-texture`,
        label: selectedAsset.originalFileName,
        progress: 40,
        status: "processing",
        message: t("workspace.textureApplyRunning", language),
      });
    },
    onSuccess: ({ texturePass }) => {
      if (selectedAsset) {
        upsertQueueEntry({
          id: `${selectedAsset.id}-texture`,
          label: selectedAsset.originalFileName,
          progress: 100,
          status: "completed",
          message: texturePass.message,
        });
        setSelectedAsset(selectedAsset.id, texturePass.imageVersionId);
      }

      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success(texturePass.message);
    },
    onError: (error) => {
      if (selectedAsset) {
        upsertQueueEntry({
          id: `${selectedAsset.id}-texture`,
          label: selectedAsset.originalFileName,
          progress: 100,
          status: "failed",
          message:
            error instanceof Error ? error.message : t("workspace.textureApplyFailed", language),
        });
      }

      toast.error(
        error instanceof Error ? error.message : t("workspace.textureApplyFailed", language)
      );
    },
  });

  const latestLog = selectedAsset?.generationLogs[0];
  const previewSource = selectedVersion?.fileUrl ?? selectedAsset?.storedFileUrl;
  const generatedSource = compareVersion?.fileUrl ?? previewSource;
  const hasGeneratedVersion = Boolean(compareVersion) && compareVersion?.versionType !== "original";

  const handleTextureSurfaceSelect = (x: number, y: number) => {
    if (mode !== "texture-targeting" || !selectedAsset) {
      return;
    }

    const selectionInput =
      selectionMode === "click-select"
        ? { x, y }
        : { points: buildBrushSelectionPoints(x, y) };

    textureSelectionMutation.mutate(selectionInput);
  };

  const canvas = useMemo(() => {
    if (!previewSource) {
      return null;
    }

    return compareEnabled && generatedSource ? (
      <ComparisonView
        before={selectedAsset?.storedFileUrl ?? previewSource}
        after={generatedSource}
        mode={compareLayout}
      />
    ) : (
      <div className="relative h-full overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
        <Cropper
          image={previewSource}
          crop={editor.crop}
          zoom={editor.zoom}
          rotation={editor.rotation}
          aspect={16 / 9}
          onCropChange={(value) => setEditorValue("crop", value)}
          onZoomChange={(value) => setEditorValue("zoom", value)}
          onRotationChange={(value) => setEditorValue("rotation", value)}
          objectFit="contain"
          style={{
            mediaStyle: {
              filter: buildCssFilter(editor),
            },
          }}
        />
      </div>
    );
  }, [
    compareEnabled,
    compareLayout,
    editor,
    generatedSource,
    previewSource,
    selectedAsset?.storedFileUrl,
    setEditorValue,
  ]);

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
        <Card className="surface-panel">
          <CardHeader>
            <CardTitle>{t("workspace.projectFiles", language)}</CardTitle>
            <CardDescription>
              {project?.clientName || t("common.localFirstWorkspace", language)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-[calc(100%-5.5rem)] flex-col gap-4">
            <UploadDropzone projectId={projectId} compact />
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-3">
                {project?.imageAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAsset(asset.id, asset.imageVersions[0]?.id)}
                    className={`overflow-hidden rounded-[20px] border text-left transition ${
                      asset.id === selectedAsset?.id
                        ? "surface-accent border-[color:var(--border-accent)]"
                        : "surface-subtle hover:border-[color:var(--border-default)]"
                    }`}
                  >
                    <div className="relative h-28 w-full">
                      <Image
                        src={asset.previewUrl}
                        alt={asset.originalFileName}
                        fill
                        unoptimized
                        sizes="240px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-2 p-3">
                      <div className="truncate text-sm font-medium text-white">
                        {asset.originalFileName}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {asset.width} x {asset.height}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {asset.imageVersions.length} {t("common.versions", language)}
                          </Badge>
                          <Badge variant="outline" className="surface-chip border-0">
                            <StatusDot
                              tone={asset.status === "ready" ? "success" : "neutral"}
                              className="mr-1"
                            />
                            {asset.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-panel flex min-h-0 flex-col rounded-[32px] p-4"
        >
          {/* ── Toolbar ──────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/8 pb-4">
            {/* Auto-saved indicator */}
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-xs text-emerald-400">
              <div className="size-1.5 rounded-full bg-emerald-400" />
              {t("workspace.autoSaved", language)}
            </div>

            <div className="h-4 w-px bg-white/10" />

            {/* Primary action */}
            {mode === "realism-pass" ? (
              <Button
                size="sm"
                onClick={() => generateMutation.mutate(undefined)}
                disabled={!selectedAsset || !activePresetId || generateMutation.isPending}
                className="relative"
              >
                <ScanSearch data-icon="inline-start" />
                {generateMutation.isPending ? t("common.loading", language) : t("workspace.generate", language)}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => texturePreviewMutation.mutate()}
                disabled={!selectedAsset || !selectionMask || texturePreviewMutation.isPending}
              >
                <ScanSearch data-icon="inline-start" />
                {t("workspace.texturePreviewAction", language)}
              </Button>
            )}

            {/* Secondary actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => startTransition(() => setCompareEnabled(!compareEnabled))}
              disabled={!compareVersion}
              className={compareEnabled ? "border-blue-500/40 bg-blue-500/10 text-blue-300" : ""}
            >
              <SplitSquareVertical data-icon="inline-start" />
              {compareEnabled ? t("workspace.hideCompare", language) : t("common.compare", language)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMutation.mutate()}
              disabled={!selectedVersion}
            >
              <Download data-icon="inline-start" />
              {t("common.export", language)}
            </Button>

            <div className="h-4 w-px bg-white/10" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setControlsCollapsed((current) => !current)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              {controlsCollapsed ? (
                <PanelRightOpen data-icon="inline-start" />
              ) : (
                <PanelRightClose data-icon="inline-start" />
              )}
              {controlsCollapsed
                ? t("workspace.showControls", language)
                : t("workspace.hideControls", language)}
            </Button>

            {/* Provider status pill */}
            <div className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs text-zinc-400">
              <div className="size-1.5 rounded-full bg-blue-400" />
              <span className="truncate">
                {effectiveProvider
                  ? t(`provider.${effectiveProvider.name}.label`, language)
                  : t("common.loading", language)}
              </span>
              {effectiveProvider?.model ? <Badge variant="outline" className="text-[0.65rem]">{effectiveProvider.model}</Badge> : null}
              {activeProvider && !activeProvider.configured ? (
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[0.65rem]">{t("workspace.fallback", language)}</Badge>
              ) : null}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 pt-4">
            {generationFallback ? (
              <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 px-4 py-4">
                <div className="text-sm font-medium text-amber-100">
                  {t("workspace.generationUnavailableTitle", language)}
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-50/85">
                  {generationFallback.message}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {generationFallback.retryable ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateMutation.mutate(undefined)}
                      disabled={generateMutation.isPending}
                    >
                      {t("workspace.retryWithOpenAi", language)}
                    </Button>
                  ) : null}
                  {generationFallback.canFallbackToMock ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        generateMutation.mutate(generationFallback.fallbackProvider ?? "mock-local")
                      }
                      disabled={generateMutation.isPending}
                    >
                      {t("workspace.runWithMock", language)}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Original Reference Panel — TextureCanvas */}
              <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[#0a0d14]">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    {t("workspace.originalReference", language)}
                  </span>
                  {mode === "texture-targeting" && (
                    <span className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[0.65rem] text-sky-400">
                      <div className="size-1 rounded-full bg-sky-400 animate-pulse" />
                      {t("workspace.textureSelectionClickHint", language)}
                    </span>
                  )}
                </div>
                <div className="relative h-[22rem]">
                  {selectedAsset?.storedFileUrl ? (
                    <TextureCanvas
                      imageUrl={selectedAsset.storedFileUrl}
                      imageAlt={t("workspace.originalReference", language)}
                      selectionMask={selectionMask}
                      materialLabel={targetMaterial ? targetMaterial.replace(/-/g, " ") : undefined}
                      active={mode === "texture-targeting"}
                      onSelect={handleTextureSurfaceSelect}
                      isPending={textureSelectionMutation.isPending}
                      hintText={t("workspace.textureSelectionClickHint", language)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-xs text-zinc-600">{t("workspace.projectFiles", language)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Output Panel */}
              <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[#0a0d14]">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    {t("workspace.latestOutput", language)}
                  </span>
                  {compareVersion && (
                    <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-300 text-[0.65rem]">
                      {formatVersionLabel(compareVersion.versionType, language)}
                    </Badge>
                  )}
                </div>
                <div className="relative h-[22rem]">
                  {hasGeneratedVersion && generatedSource ? (
                    <Image
                      src={generatedSource}
                      alt={t("workspace.latestOutput", language)}
                      fill
                      unoptimized
                      sizes="50vw"
                      className="object-contain"
                    />
                  ) : previewSource ? (
                    <Image
                      src={previewSource}
                      alt={t("workspace.latestOutput", language)}
                      fill
                      unoptimized
                      sizes="50vw"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-[18px] border border-white/8 bg-white/4">
                        <ImageIcon className="size-5 text-zinc-600" />
                      </div>
                      <p className="text-xs text-zinc-600">{t("workspace.generate", language)}</p>
                    </div>
                  )}
                  {selectionMask && mode === "texture-targeting" ? (
                    <div
                      className="pointer-events-none absolute rounded-[16px] border-2 border-amber-400/70 bg-amber-400/8"
                      style={{
                        left: `${selectionMask.bounds.x * 100}%`,
                        top: `${selectionMask.bounds.y * 100}%`,
                        width: `${selectionMask.bounds.width * 100}%`,
                        height: `${selectionMask.bounds.height * 100}%`,
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              {isLoading ? <div className="h-full rounded-[28px] bg-white/5" /> : canvas}
            </div>

            <div className="rounded-[20px] border border-white/8 bg-[#0a0d14] px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <StatusDot
                    tone={
                      queue[0]?.status === "completed"
                        ? "success"
                        : queue[0]?.status === "failed"
                          ? "danger"
                          : queue[0]?.status === "queued"
                            ? "warning"
                            : queue[0]?.status === "processing"
                              ? "info"
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
                  <span>{latestLog.providerName}</span>
                  <span>
                    {latestLog.success
                      ? `${latestLog.processingTime} ms`
                      : latestLog.errorMessage || t("common.retryNeeded", language)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </motion.section>

        {!controlsCollapsed ? (
          <Card className="surface-panel min-h-0">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-[10px] border border-blue-500/20 bg-blue-500/10">
                  <ScanSearch className="size-3.5 text-blue-400" />
                </div>
                <CardTitle className="text-sm">{t("workspace.controls", language)}</CardTitle>
              </div>
              <CardDescription className="text-xs">{t("workspace.controlsDescription", language)}</CardDescription>
            </CardHeader>
            <CardContent className="flex h-[calc(100%-5.5rem)] flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="text-[0.65rem] uppercase tracking-[0.24em] text-zinc-600">
                  {t("workspace.modeSwitcher", language)}
                </div>
                <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="realism-pass">
                      {t("workspace.modeRealismPass", language)}
                    </TabsTrigger>
                    <TabsTrigger value="texture-targeting">
                      {t("workspace.modeTextureTargeting", language)}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <Tabs
                value={compareLayout}
                onValueChange={(value) => setCompareLayout(value as "slider" | "side-by-side")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="slider">{t("workspace.slider", language)}</TabsTrigger>
                  <TabsTrigger value="side-by-side">{t("workspace.sideBySide", language)}</TabsTrigger>
                </TabsList>
              </Tabs>

              {mode === "realism-pass" ? (
                <div className="flex flex-col gap-2">
                  <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    {t("workspace.preset", language)}
                  </div>
                  <Select
                    value={getControlledSelectValue(activePresetId)}
                    onValueChange={(value) => setActivePresetId(value || undefined)}
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
              ) : null}

              <ScrollArea className="min-h-0 flex-1 pr-4">
                <div className="flex flex-col gap-5">
                  {mode === "realism-pass" ? (
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
                  ) : (
                    <div className="flex flex-col gap-5">
                      <div className="rounded-[24px] border border-[color:var(--border-subtle)] bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                          {t("workspace.textureSelectionMode", language)}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {textureSelectionModes.map((selectionOption) => (
                            <Button
                              key={selectionOption.value}
                              type="button"
                              variant={selectionMode === selectionOption.value ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                setTextureTargetingValue("selectionMode", selectionOption.value)
                              }
                            >
                              {t(selectionOption.labelKey, language)}
                            </Button>
                          ))}
                        </div>
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-zinc-300">
                          {selectionMask ? (
                            <div className="space-y-1">
                              <div>{t("workspace.textureSelectionReady", language)}</div>
                              <div className="text-xs text-zinc-500">
                                {Math.round(selectionMask.coverage * 100)}% coverage
                              </div>
                            </div>
                          ) : (
                            <div className="text-zinc-500">
                              {t("workspace.textureSelectionRequired", language)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                          {t("workspace.textureTargetMaterial", language)}
                        </div>
                        <Select
                          value={targetMaterial}
                          onValueChange={(value) =>
                            setTextureTargetingValue("targetMaterial", value as typeof targetMaterial)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {MATERIAL_PRESETS.map((materialPreset) => (
                                <SelectItem key={materialPreset} value={materialPreset}>
                                  {formatMaterialLabel(materialPreset)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                          {t("workspace.textureCustomPrompt", language)}
                        </div>
                        <Textarea
                          value={customMaterialPrompt}
                          onChange={(event) =>
                            setTextureTargetingValue("customMaterialPrompt", event.target.value)
                          }
                          placeholder={t("workspace.textureCustomPromptPlaceholder", language)}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                          {t("workspace.textureLocks", language)}
                        </div>
                        <div className="grid gap-2">
                          <Button type="button" variant="outline" size="sm" disabled>
                            {t("workspace.textureLockGeometry", language)}
                          </Button>
                          <Button
                            type="button"
                            variant={preserveLighting ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              setTextureTargetingValue("preserveLighting", !preserveLighting)
                            }
                          >
                            {t("workspace.textureLockLighting", language)}
                          </Button>
                          <Button
                            type="button"
                            variant={preserveSurroundings ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              setTextureTargetingValue("preserveSurroundings", !preserveSurroundings)
                            }
                          >
                            {t("workspace.textureLockSurroundings", language)}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[color:var(--border-subtle)] bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                          {t("workspace.texturePreviewStatus", language)}
                        </div>
                        <div className="mt-3 text-sm text-zinc-200">
                          {texturePreviewStatus === "ready"
                            ? t("workspace.texturePreviewReady", language)
                            : texturePreviewStatus === "processing"
                              ? t("workspace.texturePreviewProcessing", language)
                              : texturePreviewStatus === "failed"
                                ? t("workspace.texturePreviewFailed", language)
                                : t("workspace.texturePreviewIdle", language)}
                        </div>
                        {texturePreviewVersionId ? (
                          <div className="mt-2 text-xs text-zinc-500">
                            {texturePreviewVersionId}
                          </div>
                        ) : null}
                        <div className="mt-4 grid gap-2">
                          <Button
                            type="button"
                            onClick={() => texturePreviewMutation.mutate()}
                            disabled={!selectionMask || texturePreviewMutation.isPending}
                          >
                            {t("workspace.texturePreviewAction", language)}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => textureApplyMutation.mutate()}
                            disabled={!selectionMask || textureApplyMutation.isPending}
                          >
                            {t("workspace.textureApplyAction", language)}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex flex-col gap-2">
                    <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                      {t("workspace.exportDestination", language)}
                    </div>
                    <Select
                      value={exportDestination}
                      onValueChange={(value) =>
                        setExportDestination(normalizeExportDestination(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {EXPORT_DESTINATIONS.map((destination) => (
                            <SelectItem key={destination.id} value={destination.id}>
                              {t(destination.labelKey, language)}
                              {destination.setupRequired
                                ? ` - ${t("workspace.setupRequired", language)}`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <p className="text-xs leading-5 text-zinc-500">
                      {t("workspace.exportDestinationHelp", language)}
                    </p>
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-2">
                    <div className="text-[0.65rem] uppercase tracking-[0.24em] text-zinc-600">
                      {t("workspace.versionHistory", language)}
                    </div>
                    {selectedAsset?.imageVersions.map((version) => {
                      const isGeneratedVersion =
                        version.versionType === "realism_pass" || version.versionType === "texture_pass";
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
                              isActive
                                ? "border-blue-500/30 bg-blue-500/15"
                                : "border-white/10 bg-white/5"
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
                            variant={isGeneratedVersion ? "secondary" : "outline"}
                            className={isGeneratedVersion
                              ? "border-violet-500/30 bg-violet-500/10 text-violet-300 text-[0.6rem]"
                              : "border-white/10 text-zinc-500 text-[0.6rem]"}
                          >
                            {isGeneratedVersion
                              ? t("common.generated", language)
                              : t("common.saved", language)}
                          </Badge>
                        </button>
                      );
                    })}
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
