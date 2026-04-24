"use client";

/**
 * InpaintingCanvas
 *
 * Allows the user to paint a mask over an architectural image and apply
 * material changes via the render2real-api /api/segment and /api/edit-material endpoints.
 *
 * Usage modes:
 *   - "paint" — freehand brush mask painting
 *   - "click" — click on an element to auto-segment it with SAM2
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Paintbrush, MousePointer, Eraser, RotateCcw, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_RENDER2REAL_API_URL ?? "http://localhost:8000";

const MATERIALS = [
  { id: "concrete", label: "Beton" },
  { id: "glass", label: "Üveg" },
  { id: "wood", label: "Fa" },
  { id: "metal", label: "Fém" },
  { id: "brick", label: "Tégla" },
  { id: "stone", label: "Kő" },
  { id: "asphalt", label: "Aszfalt" },
  { id: "plaster", label: "Vakolat" },
  { id: "corten", label: "Corten acél" },
  { id: "ceramic", label: "Kerámia" },
];

type Mode = "paint" | "click" | "erase";

type Props = {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  projectId: string;
  assetId: string;
  onResult: (resultDataUri: string) => void;
  onClose: () => void;
  className?: string;
};

export function InpaintingCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  projectId,
  assetId,
  onResult,
  onClose,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>("click");
  const [brushSize, setBrushSize] = useState(30);
  const [selectedMaterial, setSelectedMaterial] = useState("concrete");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasMask, setHasMask] = useState(false);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  const isPainting = useRef(false);

  // ── Load image onto canvas ─────────────────────────────────────────────────
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
      const maxH = container.clientHeight - 120; // leave room for toolbar
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

  // ── Painting helpers ───────────────────────────────────────────────────────
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = maskCanvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
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
    if (mode === "click") {
      handleClickSegment(e);
      return;
    }
    isPainting.current = true;
    const pos = getCanvasPos(e);
    paintAt(pos.x, pos.y, mode === "erase");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting.current || mode === "click") return;
    const pos = getCanvasPos(e);
    paintAt(pos.x, pos.y, mode === "erase");
  };

  const handleMouseUp = () => {
    isPainting.current = false;
  };

  // ── SAM2 click segmentation ────────────────────────────────────────────────
  const handleClickSegment = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    setIsProcessing(true);
    setStatusMessage("SAM2 szegmentálás...");

    try {
      // Fetch the original image as bytes
      const imgResp = await fetch(imageUrl);
      const imgBlob = await imgResp.blob();

      const formData = new FormData();
      formData.append("image", imgBlob, "image.png");
      formData.append("x", String(pos.x));
      formData.append("y", String(pos.y));
      formData.append("display_width", String(displaySize.w));
      formData.append("display_height", String(displaySize.h));
      formData.append("original_width", String(imageWidth));
      formData.append("original_height", String(imageHeight));

      const resp = await fetch(`${API_BASE}/api/segment`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail ?? "Szegmentálás sikertelen");
      }

      const result = await resp.json();

      // Draw the mask onto the mask canvas
      const maskCtx = maskCanvasRef.current?.getContext("2d");
      if (maskCtx && result.mask_image) {
        const maskImg = new Image();
        maskImg.src = result.mask_image;
        await new Promise<void>((resolve) => {
          maskImg.onload = () => {
            maskCtx.clearRect(0, 0, displaySize.w, displaySize.h);
            maskCtx.globalAlpha = 0.6;
            maskCtx.globalCompositeOperation = "source-over";
            // Tint the mask purple
            maskCtx.fillStyle = "rgba(139, 92, 246, 0.6)";
            // Draw mask as clip
            maskCtx.save();
            maskCtx.globalCompositeOperation = "source-over";
            maskCtx.drawImage(maskImg, 0, 0, displaySize.w, displaySize.h);
            maskCtx.restore();
            resolve();
          };
        });
        maskCtx.globalAlpha = 1.0;
        setHasMask(true);
      }

      setStatusMessage("Terület kijelölve. Válassz anyagot és kattints az alkalmazásra.");
    } catch (err) {
      setStatusMessage(`Hiba: ${err instanceof Error ? err.message : "Ismeretlen hiba"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Clear mask ─────────────────────────────────────────────────────────────
  const clearMask = () => {
    const ctx = maskCanvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, displaySize.w, displaySize.h);
    setHasMask(false);
    setStatusMessage(null);
  };

  // ── Apply material ─────────────────────────────────────────────────────────
  const applyMaterial = async () => {
    if (!hasMask) {
      setStatusMessage("Először jelölj ki egy területet.");
      return;
    }

    setIsProcessing(true);
    setStatusMessage("Anyagcsere alkalmazása...");

    try {
      // Get original image bytes
      const imgResp = await fetch(imageUrl);
      const imgBlob = await imgResp.blob();

      // Export mask canvas as PNG
      const maskDataUrl = maskCanvasRef.current!.toDataURL("image/png");
      const maskResp = await fetch(maskDataUrl);
      const maskBlob = await maskResp.blob();

      const formData = new FormData();
      formData.append("image", imgBlob, "image.png");
      formData.append("mask", maskBlob, "mask.png");
      formData.append("material_type", selectedMaterial);

      const resp = await fetch(`${API_BASE}/api/edit-material`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail ?? "Anyagcsere sikertelen");
      }

      const result = await resp.json();
      onResult(result.edited_image);
      setStatusMessage("Anyagcsere sikeres!");
    } catch (err) {
      setStatusMessage(`Hiba: ${err instanceof Error ? err.message : "Ismeretlen hiba"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background rounded-lg border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Anyagszerkesztő</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b flex-wrap">
        {/* Mode buttons */}
        <div className="flex rounded-md border overflow-hidden">
          {(["click", "paint", "erase"] as Mode[]).map((m) => (
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
              {m === "click" && <MousePointer className="h-3 w-3" />}
              {m === "paint" && <Paintbrush className="h-3 w-3" />}
              {m === "erase" && <Eraser className="h-3 w-3" />}
              {m === "click" ? "Kattintás" : m === "paint" ? "Ecset" : "Radír"}
            </button>
          ))}
        </div>

        {/* Brush size (only in paint/erase mode) */}
        {mode !== "click" && (
          <div className="flex items-center gap-2 min-w-[120px]">
            <span className="text-xs text-muted-foreground">Méret</span>
            <Slider
              value={[brushSize]}
              onValueChange={(vals) => { const v = Array.isArray(vals) ? vals[0] : vals; setBrushSize(v as number); }}
              min={5}
              max={80}
              step={5}
              className="w-20"
            />
            <span className="text-xs font-mono w-6">{brushSize}</span>
          </div>
        )}

        {/* Material selector */}
        <Select value={selectedMaterial} onValueChange={(v) => setSelectedMaterial(v ?? selectedMaterial)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MATERIALS.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear mask */}
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={clearMask} disabled={!hasMask}>
          <RotateCcw className="h-3 w-3" />
          Törlés
        </Button>

        {/* Apply */}
        <Button
          size="sm"
          className="h-8 text-xs gap-1 ml-auto"
          onClick={applyMaterial}
          disabled={!hasMask || isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Wand2 className="h-3 w-3" />
          )}
          Alkalmazás
        </Button>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-b">
          {statusMessage}
        </div>
      )}

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden p-4 relative">
        {/* Base image canvas */}
        <canvas
          ref={canvasRef}
          className="absolute rounded"
          style={{ imageRendering: "crisp-edges" }}
        />
        {/* Mask overlay canvas */}
        <canvas
          ref={maskCanvasRef}
          className="absolute rounded cursor-crosshair"
          style={{ imageRendering: "crisp-edges" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="px-4 py-2 border-t text-xs text-muted-foreground">
        {mode === "click"
          ? "Kattints egy felületre az automatikus kijelöléshez (SAM2)"
          : mode === "paint"
            ? "Festsd be az átszerkeszteni kívánt területet"
            : "Töröld a felesleges maszkterületet"}
      </div>
    </div>
  );
}
