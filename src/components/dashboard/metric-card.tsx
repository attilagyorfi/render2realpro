"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <Card className="surface-panel min-h-32 rounded-[24px]">
      <CardHeader className="gap-2">
        <CardDescription className="text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </CardDescription>
        <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">{meta}</CardContent>
    </Card>
  );
}
