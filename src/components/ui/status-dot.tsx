import type { SemanticTone } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

const toneClasses: Record<SemanticTone, string> = {
  neutral: "bg-muted-foreground/70",
  info: "bg-[var(--accent-primary)] shadow-[0_0_16px_rgba(13,140,240,0.35)]",
  success: "bg-[var(--accent-green)] shadow-[0_0_16px_rgba(0,229,160,0.3)]",
  warning: "bg-[var(--accent-amber)] shadow-[0_0_16px_rgba(240,160,32,0.32)]",
  danger: "bg-[var(--accent-red)] shadow-[0_0_16px_rgba(240,64,96,0.32)]",
};

export function StatusDot({
  tone,
  className,
}: {
  tone: SemanticTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex size-2.5 rounded-full", toneClasses[tone], className)}
    />
  );
}
