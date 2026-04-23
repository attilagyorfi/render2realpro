"use client";

/**
 * ComparisonView
 * ─────────────────────────────────────────────────────────────────────────────
 * Polished before/after image comparison component with two modes:
 *   • "slider"       – drag handle with glow line, keyboard accessible
 *   • "side-by-side" – two panels with labels
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface ComparisonViewProps {
  before: string;
  after: string;
  mode: "slider" | "side-by-side";
  beforeLabel?: string;
  afterLabel?: string;
}

export function ComparisonView({
  before,
  after,
  mode,
  beforeLabel = "Original",
  afterLabel = "Generated",
}: ComparisonViewProps) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - bounds.left) / bounds.width) * 100));
    setPosition(pct);
  }, []);

  const handleMouseDown = useCallback(() => setIsDragging(true), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => { if (isDragging) updatePosition(event.clientX); },
    [isDragging, updatePosition]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => { if (event.touches[0]) updatePosition(event.touches[0].clientX); },
    [updatePosition]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 2));
    if (event.key === "ArrowRight") setPosition((p) => Math.min(100, p + 2));
  }, []);

  // ── Side-by-side mode ────────────────────────────────────────────────────
  if (mode === "side-by-side") {
    return (
      <div className="grid h-full gap-3 lg:grid-cols-2">
        {[
          { src: before, label: beforeLabel },
          { src: after, label: afterLabel, accent: true },
        ].map(({ src, label, accent }) => (
          <div
            key={src}
            className="relative overflow-hidden rounded-[24px] border border-white/8 bg-[#0a0d14]"
          >
            <Image
              src={src}
              alt={label}
              fill
              unoptimized
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain"
              draggable={false}
            />
            <div className={`absolute bottom-3 left-3 rounded-full border px-2.5 py-0.5 text-[0.65rem] backdrop-blur-sm ${
              accent
                ? "border-sky-500/20 bg-sky-500/10 text-sky-400"
                : "border-white/10 bg-black/60 text-zinc-400"
            }`}>
              {label}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Slider mode ───────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-hidden rounded-[24px] border border-white/8 bg-[#0a0d14] select-none"
      style={{ cursor: isDragging ? "ew-resize" : "default" }}
      onClick={(e) => updatePosition(e.clientX)}
    >
      {/* Before image */}
      <Image src={before} alt={beforeLabel} fill unoptimized sizes="100vw" className="object-contain" draggable={false} />

      {/* After image — clipped */}
      <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}>
        <Image src={after} alt={afterLabel} fill unoptimized sizes="100vw" className="object-contain" draggable={false} />
      </div>

      {/* Glow divider line */}
      <div
        className="pointer-events-none absolute inset-y-0 w-[2px]"
        style={{
          left: `${position}%`,
          transform: "translateX(-50%)",
          background: "linear-gradient(to bottom, transparent 0%, rgba(56,189,248,0.8) 15%, rgba(56,189,248,1) 50%, rgba(56,189,248,0.8) 85%, transparent 100%)",
          boxShadow: "0 0 12px rgba(56,189,248,0.5), 0 0 4px rgba(56,189,248,0.8)",
        }}
      />

      {/* Drag handle */}
      <motion.div
        className="absolute top-1/2 z-10 flex -translate-y-1/2 -translate-x-1/2 cursor-ew-resize items-center justify-center"
        style={{ left: `${position}%` }}
        animate={{ scale: isDragging ? 1.12 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-label="Comparison slider"
      >
        {/* Glow halo */}
        <div
          className={`absolute size-14 rounded-full transition-opacity duration-200 ${isDragging ? "opacity-100" : "opacity-0"}`}
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.2) 0%, transparent 70%)" }}
        />
        {/* Handle */}
        <div className={`relative flex size-9 items-center justify-center rounded-full border-2 transition-all duration-150 backdrop-blur-sm ${
          isDragging
            ? "border-sky-400 bg-sky-400/20 shadow-[0_0_16px_rgba(56,189,248,0.6)]"
            : "border-white/40 bg-black/70 shadow-[0_0_8px_rgba(0,0,0,0.5)] hover:border-sky-400/70 hover:shadow-[0_0_12px_rgba(56,189,248,0.3)]"
        }`}>
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
            <path d="M5 6L2 3M5 6L2 9" stroke={isDragging ? "rgb(56,189,248)" : "rgba(255,255,255,0.7)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 6L16 3M13 6L16 9" stroke={isDragging ? "rgb(56,189,248)" : "rgba(255,255,255,0.7)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="5" y1="6" x2="13" y2="6" stroke={isDragging ? "rgb(56,189,248)" : "rgba(255,255,255,0.4)"} strokeWidth="1" strokeDasharray="2 1"/>
          </svg>
        </div>
      </motion.div>

      {/* Corner labels */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/60 px-2.5 py-0.5 text-[0.65rem] text-zinc-400 backdrop-blur-sm">{beforeLabel}</div>
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[0.65rem] text-sky-400 backdrop-blur-sm">{afterLabel}</div>

      {/* Position indicator */}
      <div
        className="pointer-events-none absolute top-3 rounded-full border border-white/10 bg-black/60 px-2 py-0.5 font-mono text-[0.6rem] text-zinc-500 backdrop-blur-sm"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        {Math.round(position)}%
      </div>
    </div>
  );
}
