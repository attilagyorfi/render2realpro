"use client";

/**
 * InpaintingCanvas — Sprint F / Munkacsomag 3.
 *
 * Free-prompt material editor for the workspace. The user paints a
 * mask over the area to change and writes a short instruction
 * ("piros tető", "fa burkolat"). The server runs Fal Flux Fill on
 * the masked region and composites the result back over the source
 * so the unmasked area is byte-for-byte identical.
 *
 * Earlier revisions of this file talked to a Python /api/segment +
 * /api/edit-material service for SAM2 click-segmentation. That path
 * is dropped here — the SAM2 service isn't part of the FormaVeris
 * stack, and the manual brush is sufficient for the MVP.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Loader2, Paintbrush, RotateCcw, Wand2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

type Mode = "paint" | "erase";

type Props = {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  projectId: string;
  assetId: string;
  onResult: (resultVersionId: string) => void;
  onClose: () => void;
  className?: string;
};

const MATERIAL_CHIPS: Array<{ key: string; promptHu: string; promptEn: string }> = [
  { key: "materialEdit.chipRedRoof", promptHu: "piros fémtető", promptEn: "red metal roof" },
  { key: "materialEdit.chipWoodCladding", promptHu: "tölgyfa burkolat", promptEn: "oak wood cladding" },
  { key: "materialEdit.chipGlassFacade", promptHu: "üvegfalas homlokzat", promptEn: "glass curtain wall facade" },
  { key: "materialEdit.chipRedBrick", promptHu: "vörös tégla fal", promptEn: "red brick wall" },
  { key: "materialEdit.chipPolishedConcrete", promptHu: "polírozott beton", promptEn: "polished concrete" },
  { key: "materialEdit.chipMetalSheet", promptHu: "horganyzott fém burkolat", promptEn: "galvanised metal cladding" },
];

export function InpaintingCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  // assetId is used by the new submit path; projectId stays on the
  // public Props contract for symmetry but isn't needed here directly.
  projectId: _projectId,
  assetId,
  onResult,
  onClose,
  className,
}: Props) {
  const language = useAppPreferencesStore((s) => s.language);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>("paint");
  const [brushSize, setBrushSize] = useState(30);
  const [prompt, setPrompt] = useState("");
  const [strength, setStrength] = useState(0.85);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasMask, setHasMask] = useState(false);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  const isPainting = useRef(false);

  // ── Load image onto canvas ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !maskCanvas || !container) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const maxW = container.clientWidth;
      const maxH = container.clientHeight - 220; // leave room for prompt + toolbar
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const dw = Math.round(img.width * scale);
      const dh = Math.round(img.height * scale);

      canvas.width = dw;
      canvas.height = dh;
      maskCanvas.width = dw;
      maskCanvas.height = dh;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, dw, dh);

      setDisplaySize({ w: dw, h: dh });
    };
  }, [imageUrl]);

  // ── Painting ─────────────────────────────────────────────────────────────
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = maskCanvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const paintAt = useCallback(
    (x: number, y: number, erase = false) => {
      const ctx = maskCanvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
      ctx.fillStyle = "rgba(139, 92, 246, 0.6)";
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      setHasMask(true);
    },
    [brushSize]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isPainting.current = true;
    const pos = getCanvasPos(e);
    paintAt(pos.x, pos.y, mode === "erase");
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting.current) return;
    const pos = getCanvasPos(e);
    paintAt(pos.x, pos.y, mode === "erase");
  };
  const handleMouseUp = () => {
    isPainting.current = false;
  };

  const clearMask = () => {
    const ctx = maskCanvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, displaySize.w, displaySize.h);
    setHasMask(false);
    setStatusMessage(null);
  };

  // ── Build a clean black-and-white PNG mask from the display canvas. ──────
  // The display canvas shows the mask as a translucent purple overlay; the
  // model needs a binary white-on-black PNG, sized to the *source* image.
  // Sharp on the server resizes; here we just hand over the display-sized
  // binary version.
  const exportMaskPng = async (): Promise<string> => {
    const display = maskCanvasRef.current!;
    const offscreen = document.createElement("canvas");
    offscreen.width = display.width;
    offscreen.height = display.height;
    const ctx = offscreen.getContext("2d")!;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    const srcCtx = display.getContext("2d")!;
    const imgData = srcCtx.getImageData(0, 0, display.width, display.height);
    const dstData = ctx.getImageData(0, 0, display.width, display.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      // Anything with non-zero alpha in the source overlay becomes white.
      if (imgData.data[i + 3] > 0) {
        dstData.data[i] = 255;
        dstData.data[i + 1] = 255;
        dstData.data[i + 2] = 255;
        dstData.data[i + 3] = 255;
      } else {
        dstData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(dstData, 0, 0);
    return offscreen.toDataURL("image/png");
  };

  const applyMaterial = async () => {
    if (!hasMask) {
      setStatusMessage(t("materialEdit.needMask", language));
      return;
    }
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 2) {
      setStatusMessage(t("materialEdit.needPrompt", language));
      return;
    }

    setIsProcessing(true);
    setStatusMessage(t("materialEdit.applying", language));

    try {
      const maskPng = await exportMaskPng();
      const resp = await fetch("/api/texture-targeting/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageAssetId: assetId,
          mask: maskPng,
          prompt: trimmedPrompt,
          strength,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : t("materialEdit.failed", language)
        );
      }

      const body = (await resp.json()) as {
        textureEdit?: { imageVersionId?: string };
      };
      const newVersionId = body.textureEdit?.imageVersionId;
      if (!newVersionId) throw new Error(t("materialEdit.failed", language));

      setStatusMessage(t("materialEdit.success", language));
      onResult(newVersionId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : t("materialEdit.failed", language));
    } finally {
      setIsProcessing(false);
    }
  };

  // imageWidth/imageHeight come from the parent so the consumer can pre-size
  // the modal even before the image fully loads. We don't read them here
  // because the actual draw uses the loaded <img> dimensions; silence the
  // unused-vars lint without changing the public contract.
  void imageWidth;
  void imageHeight;

  const instructions =
    mode === "paint"
      ? t("materialEdit.instructionsPaint", language)
      : t("materialEdit.instructionsErase", language);

  return (
    <div className={cn("flex flex-col h-full bg-background rounded-lg border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">{t("materialEdit.title", language)}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Toolbar — mode + brush size + clear + apply */}
      <div className="flex items-center gap-2 px-4 py-2 border-b flex-wrap">
        <div className="flex rounded-md border overflow-hidden">
          {(["paint", "erase"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {m === "paint" ? <Paintbrush className="h-3 w-3" /> : <Eraser className="h-3 w-3" />}
              {t(m === "paint" ? "materialEdit.modePaint" : "materialEdit.modeErase", language)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 min-w-[160px]">
          <span className="text-xs text-muted-foreground">
            {t("materialEdit.brushSizeLabel", language)}
          </span>
          <Slider
            value={[brushSize]}
            onValueChange={(vals) => {
              const v = Array.isArray(vals) ? vals[0] : vals;
              setBrushSize(v as number);
            }}
            min={5}
            max={120}
            step={5}
            className="w-24"
          />
          <span className="text-xs font-mono w-6">{brushSize}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={clearMask}
          disabled={!hasMask}
        >
          <RotateCcw className="h-3 w-3" />
          {t("materialEdit.clearMask", language)}
        </Button>

        <Button
          size="sm"
          className="h-8 text-xs gap-1 ml-auto"
          onClick={applyMaterial}
          disabled={!hasMask || isProcessing || prompt.trim().length < 2}
        >
          {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
          {t("materialEdit.apply", language)}
        </Button>
      </div>

      {/* Prompt + quick chips + strength */}
      <div className="grid gap-3 px-4 py-3 border-b sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("materialEdit.promptPlaceholder", language)}
            rows={2}
            className="text-sm resize-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {MATERIAL_CHIPS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setPrompt(language === "hu" ? chip.promptHu : chip.promptEn)}
                className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[0.7rem] text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
              >
                {t(chip.key, language)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-[180px]">
          <span className="text-xs text-muted-foreground">
            {t("materialEdit.strengthLabel", language)}
          </span>
          <Slider
            value={[strength]}
            onValueChange={(vals) => {
              const v = Array.isArray(vals) ? vals[0] : vals;
              setStrength(v as number);
            }}
            min={0.4}
            max={1}
            step={0.05}
          />
          <span className="text-xs font-mono">{strength.toFixed(2)}</span>
        </div>
      </div>

      {/* Status message */}
      {statusMessage ? (
        <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-b">
          {statusMessage}
        </div>
      ) : null}

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden p-4 relative">
        <canvas
          ref={canvasRef}
          className="absolute rounded"
          style={{ imageRendering: "crisp-edges" }}
        />
        <canvas
          ref={maskCanvasRef}
          className="absolute rounded cursor-crosshair"
          style={{ imageRendering: "crisp-edges" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {isProcessing ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="px-4 py-2 border-t text-xs text-muted-foreground">{instructions}</div>
    </div>
  );
}
