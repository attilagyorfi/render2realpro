"use client";

import { useState } from "react";
import Image from "next/image";

export function ComparisonView({
  before,
  after,
  mode,
}: {
  before: string;
  after: string;
  mode: "slider" | "side-by-side";
}) {
  const [sliderValue, setSliderValue] = useState(50);

  if (mode === "side-by-side") {
    return (
      <div className="grid h-full gap-3 lg:grid-cols-2">
        {[before, after].map((src, index) => (
          <div
            key={src}
            className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/35"
          >
            <Image
              src={src}
              alt={index === 0 ? "Original render" : "Generated realism pass"}
              fill
              unoptimized
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain"
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden rounded-[24px] border border-white/10 bg-black/35">
      <Image
        src={before}
        alt="Original render"
        fill
        unoptimized
        sizes="100vw"
        className="object-contain"
      />
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${sliderValue}%` }}
      >
        <Image
          src={after}
          alt="Generated realism pass"
          fill
          unoptimized
          sizes="100vw"
          className="object-contain"
        />
      </div>
      <div
        className="absolute inset-y-0 w-px bg-white/70"
        style={{ left: `${sliderValue}%` }}
      />
      <input
        type="range"
        min={0}
        max={100}
        value={sliderValue}
        onChange={(event) => setSliderValue(Number(event.target.value))}
        className="absolute bottom-4 left-1/2 w-[60%] -translate-x-1/2 accent-white"
      />
    </div>
  );
}
