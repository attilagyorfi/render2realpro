"use client";

/**
 * ComparisonView — Overlay/Reveal slider
 * ─────────────────────────────────────────────────────────────────────────────
 * Both images are stacked at identical size/position.
 * The "before" image sits on top and is clipped to the LEFT of the slider.
 * The "after" image is always fully visible underneath.
 * This ensures pixel-perfect alignment regardless of image dimensions.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface ComparisonViewProps {
  before: string;
  after: string;
  mode?: "slider" | "side-by-side";
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  afterFilterStyle?: string;
}

export function ComparisonView({
  before,
  after,
  beforeLabel = "Original render",
  afterLabel = "AI-enhanced result",
  className = "",
  afterFilterStyle,
}: ComparisonViewProps) {
  const [position, setPosition] = useState(50); // 0–100 %
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const clamp = (v: number) => Math.min(100, Math.max(0, v));

  const posFromX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return 50;
    const r = el.getBoundingClientRect();
    return clamp(((clientX - r.left) / r.width) * 100);
  }, []);

  /* ── Mouse ── */
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setPosition(posFromX(e.clientX));
    },
    [posFromX]
  );

  useEffect(() => {
    if (!isDragging) return;
    const move = (e: MouseEvent) => setPosition(posFromX(e.clientX));
    const up = () => setIsDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [isDragging, posFromX]);

  /* ── Touch ── */
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      setPosition(posFromX(e.touches[0].clientX));
    },
    [posFromX]
  );

  useEffect(() => {
    if (!isDragging) return;
    const move = (e: TouchEvent) => setPosition(posFromX(e.touches[0].clientX));
    const end = () => setIsDragging(false);
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);
    return () => {
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };
  }, [isDragging, posFromX]);

  /* ── Keyboard ── */
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPosition((p) => clamp(p - 2));
    if (e.key === "ArrowRight") setPosition((p) => clamp(p + 2));
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden rounded-[28px] bg-[#0a0d14] ${className}`}
      style={{ cursor: isDragging ? "col-resize" : "default" }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* ── AFTER image: full size, bottom layer, always fully visible ─── */}
      <div className="absolute inset-0">
        {after ? (
          <Image
            src={after}
            alt={afterLabel}
            fill
            unoptimized
            sizes="100vw"
            className="object-contain"
            draggable={false}
            priority
            style={afterFilterStyle ? { filter: afterFilterStyle } : undefined}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-zinc-600">{afterLabel}</span>
          </div>
        )}
      </div>

      {/* ── BEFORE image: full size, top layer, clipped to LEFT of slider ── */}
      {before && (
        <div
          className="absolute inset-0"
          style={{
            /* Clip everything to the RIGHT of the slider position */
            clipPath: `inset(0 ${100 - position}% 0 0)`,
          }}
        >
          <Image
            src={before}
            alt={beforeLabel}
            fill
            unoptimized
            sizes="100vw"
            className="object-contain"
            draggable={false}
            priority
          />
        </div>
      )}

      {/* ── DIVIDER LINE ─────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-y-0 z-20 w-[2px]"
        style={{
          left: `${position}%`,
          transform: "translateX(-50%)",
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(13,140,240,0.9) 10%, #0d8cf0 50%, rgba(13,140,240,0.9) 90%, transparent 100%)",
          boxShadow: "0 0 14px 2px rgba(13,140,240,0.6)",
        }}
      />

      {/* ── DRAG HANDLE ──────────────────────────────────────────────────── */}
      <motion.div
        className="absolute top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position}%`, cursor: "col-resize" }}
        animate={{ scale: isDragging ? 1.15 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="Comparison slider"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Glow halo */}
        <div
          className={`absolute inset-0 -m-3 rounded-full transition-opacity duration-200 ${isDragging ? "opacity-100" : "opacity-0"}`}
          style={{ background: "radial-gradient(circle, rgba(13,140,240,0.25) 0%, transparent 70%)" }}
        />
        {/* Circle */}
        <div
          className={`relative flex size-10 items-center justify-center rounded-full border-2 backdrop-blur-sm transition-all duration-150 ${
            isDragging
              ? "border-[#0d8cf0] bg-[#0d8cf0]/30 shadow-[0_0_20px_rgba(13,140,240,0.7)]"
              : "border-white/30 bg-black/70 shadow-[0_0_10px_rgba(0,0,0,0.6)] hover:border-[#0d8cf0]/70 hover:shadow-[0_0_14px_rgba(13,140,240,0.4)]"
          }`}
        >
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
            <path
              d="M5 6L2 3M5 6L2 9"
              stroke={isDragging ? "#0d8cf0" : "rgba(255,255,255,0.75)"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13 6L16 3M13 6L16 9"
              stroke={isDragging ? "#0d8cf0" : "rgba(255,255,255,0.75)"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="5" y1="6" x2="13" y2="6"
              stroke={isDragging ? "#0d8cf0" : "rgba(255,255,255,0.35)"}
              strokeWidth="1"
              strokeDasharray="2 1"
            />
          </svg>
        </div>
      </motion.div>

      {/* ── CORNER LABELS ────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-30">
        <span className="rounded-full border border-white/10 bg-black/65 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-zinc-300 backdrop-blur-sm">
          {beforeLabel}
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-30">
        <span className="rounded-full border border-[#0d8cf0]/30 bg-[#0d8cf0]/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-sky-300 backdrop-blur-sm">
          {afterLabel}
        </span>
      </div>

      {/* ── HINT ─────────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
          <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[0.6rem] text-zinc-500 backdrop-blur-sm">
          <span className="size-1.5 animate-pulse rounded-full bg-[#0d8cf0]" />
          Húzd az összehasonlításhoz · Drag to compare
        </span>
      </div>
    </div>
  );
}
