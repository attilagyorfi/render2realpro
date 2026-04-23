"use client";

/**
 * TextureCanvas
 * ─────────────────────────────────────────────────────────────────────────────
 * An interactive canvas overlay for texture-targeting mode.
 * Renders the source image with:
 *   • Animated crosshair cursor on hover
 *   • Ripple animation on click
 *   • Glowing selection mask overlay
 *   • Material label badge on the selected region
 *   • Pulsing "click to select" hint
 */

import { useCallback, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { SelectionMask } from "@/types/domain";

type RipplePoint = { x: number; y: number; id: number };

interface TextureCanvasProps {
  /** Absolute URL of the source image */
  imageUrl: string;
  /** Alt text for the image */
  imageAlt?: string;
  /** Current selection mask (normalised 0–1 coordinates) */
  selectionMask?: SelectionMask;
  /** Material label to show on the selection overlay */
  materialLabel?: string;
  /** Whether the canvas is in active texture-targeting mode */
  active: boolean;
  /** Called with normalised (x, y) coordinates when the user clicks */
  onSelect: (x: number, y: number) => void;
  /** Whether a selection API call is in progress */
  isPending?: boolean;
  /** Hint text shown at the top of the canvas */
  hintText?: string;
}

let rippleCounter = 0;

export function TextureCanvas({
  imageUrl,
  imageAlt = "Render",
  selectionMask,
  materialLabel,
  active,
  onSelect,
  isPending = false,
  hintText,
}: TextureCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [ripples, setRipples] = useState<RipplePoint[]>([]);

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!active) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      setCursor({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    },
    [active]
  );

  const handleMouseLeave = useCallback(() => {
    setCursor(null);
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!active || isPending) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = Number(((event.clientX - bounds.left) / bounds.width).toFixed(3));
      const y = Number(((event.clientY - bounds.top) / bounds.height).toFixed(3));

      // Spawn ripple at pixel coords
      const pixelX = event.clientX - bounds.left;
      const pixelY = event.clientY - bounds.top;
      const id = ++rippleCounter;
      setRipples((prev) => [...prev, { x: pixelX, y: pixelY, id }]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 900);

      onSelect(x, y);
    },
    [active, isPending, onSelect]
  );

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden select-none ${
        active ? "cursor-none" : "cursor-default"
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* ── Source image ─────────────────────────────────────────────── */}
      <Image
        src={imageUrl}
        alt={imageAlt}
        fill
        unoptimized
        sizes="50vw"
        className={`object-contain transition-all duration-300 ${isPending ? "opacity-60 blur-[1px]" : "opacity-100"}`}
        draggable={false}
      />

      {/* ── Scanline overlay (subtle tech feel) ──────────────────────── */}
      {active && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)",
          }}
        />
      )}

      {/* ── Selection mask overlay ────────────────────────────────────── */}
      <AnimatePresence>
        {selectionMask && (
          <motion.div
            key={selectionMask.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-none absolute"
            style={{
              left: `${selectionMask.bounds.x * 100}%`,
              top: `${selectionMask.bounds.y * 100}%`,
              width: `${selectionMask.bounds.width * 100}%`,
              height: `${selectionMask.bounds.height * 100}%`,
            }}
          >
            {/* Glow border */}
            <div className="absolute inset-0 rounded-[14px] border-2 border-sky-400 bg-sky-400/10 shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_0_24px_rgba(56,189,248,0.12)]" />
            {/* Corner accents */}
            {[
              "top-0 left-0 border-t-2 border-l-2 rounded-tl-[14px]",
              "top-0 right-0 border-t-2 border-r-2 rounded-tr-[14px]",
              "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-[14px]",
              "bottom-0 right-0 border-b-2 border-r-2 rounded-br-[14px]",
            ].map((cls, i) => (
              <div
                key={i}
                className={`absolute size-3 border-sky-300 ${cls}`}
                style={{ borderColor: "rgb(125 211 252)" }}
              />
            ))}
            {/* Material label badge */}
            {materialLabel && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-sky-500/40 bg-sky-500/20 px-2.5 py-0.5 text-[0.65rem] font-medium text-sky-300 backdrop-blur-sm">
                {materialLabel}
              </div>
            )}
            {/* Coverage indicator */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[0.6rem] text-sky-400/60">
              {Math.round(selectionMask.coverage * 100)}% coverage
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ripple effects ────────────────────────────────────────────── */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{ width: 0, height: 0, opacity: 0.8 }}
            animate={{ width: 120, height: 120, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-400"
            style={{ left: ripple.x, top: ripple.y }}
          />
        ))}
      </AnimatePresence>

      {/* ── Custom crosshair cursor ───────────────────────────────────── */}
      <AnimatePresence>
        {active && cursor && !isPending && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.1 }}
            className="pointer-events-none absolute"
            style={{ left: cursor.x, top: cursor.y }}
          >
            {/* Outer ring */}
            <div className="absolute -translate-x-1/2 -translate-y-1/2 size-8 rounded-full border border-sky-400/60" />
            {/* Inner dot */}
            <div className="absolute -translate-x-1/2 -translate-y-1/2 size-1.5 rounded-full bg-sky-400" />
            {/* Cross lines */}
            <div className="absolute -translate-x-1/2 -translate-y-px h-px w-5 bg-sky-400/60" />
            <div className="absolute -translate-y-1/2 -translate-x-px w-px h-5 bg-sky-400/60" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pending spinner overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
              <span className="text-[0.65rem] text-sky-400/80">Analysing surface…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hint banner ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {active && hintText && !selectionMask && !isPending && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ delay: 0.3 }}
            className="pointer-events-none absolute inset-x-4 top-4 flex items-center justify-center"
          >
            <div className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-black/60 px-4 py-1.5 text-xs text-sky-300 backdrop-blur-md">
              <div className="size-1.5 animate-pulse rounded-full bg-sky-400" />
              {hintText}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
