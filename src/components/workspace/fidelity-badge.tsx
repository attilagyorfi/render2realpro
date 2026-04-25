"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldAlert, ShieldX, Info } from "lucide-react";

export type FidelityScore = {
  overall: number;
  edge_similarity: number;
  ssim: number;
  dimension_match: number;
  label: "high" | "medium" | "low";
  warnings: string[];
};

type Props = {
  fidelity: FidelityScore;
  className?: string;
};

export function FidelityBadge({ fidelity, className }: Props) {
  const pct = Math.round(fidelity.overall * 100);

  const config =
    fidelity.label === "high"
      ? {
          icon: ShieldCheck,
          color: "text-emerald-400",
          bg: "bg-emerald-400/10 border-emerald-400/30",
          label: "Magas hűség",
        }
      : fidelity.label === "medium"
        ? {
            icon: ShieldAlert,
            color: "text-amber-400",
            bg: "bg-amber-400/10 border-amber-400/30",
            label: "Közepes hűség",
          }
        : {
            icon: ShieldX,
            color: "text-red-400",
            bg: "bg-red-400/10 border-red-400/30",
            label: "Alacsony hűség",
          };

  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium cursor-help",
              config.bg,
              config.color,
              className
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{pct}%</span>
            <span className="opacity-70">{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs space-y-2 p-3">
          <p className="font-semibold text-sm">Szerkezeti hűség részletei</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Él-hasonlóság</span>
            <span className="font-mono">{Math.round(fidelity.edge_similarity * 100)}%</span>
            <span className="text-muted-foreground">SSIM</span>
            <span className="font-mono">{Math.round(fidelity.ssim * 100)}%</span>
            <span className="text-muted-foreground">Arány egyezés</span>
            <span className="font-mono">{Math.round(fidelity.dimension_match * 100)}%</span>
          </div>
          {fidelity.warnings.length > 0 && (
            <div className="space-y-1 border-t pt-2">
              {fidelity.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-400 flex gap-1">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  {w}
                </p>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground border-t pt-2">
            Az él-hasonlóság az eredeti és a generált kép Canny edge map-jének IoU értéke.
            Az SSIM a perceptuális hasonlóságot méri. Magas értékek azt jelzik, hogy
            a geometria és az arányok megmaradtak.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
