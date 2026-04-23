"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, ServerCog } from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchJson } from "@/lib/fetch-json";
import { t } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

type ProvidersResponse = {
  activeProvider: string;
  providers: Array<{
    name: string;
    label: string;
    description: string;
    configured: boolean;
    supportsRealtimeProgress: boolean;
    requiresApiKey: boolean;
    statusMessage: string;
    model?: string;
  }>;
};

export function ProvidersView() {
  const language = useAppPreferencesStore((state) => state.language);
  const { data } = useQuery({
    queryKey: ["providers"],
    queryFn: () => fetchJson<ProvidersResponse>("/api/providers"),
  });

  return (
    <AppFrame eyebrow={t("providers.eyebrow", language)} title={t("providers.title", language)}>
      <div className="mb-4 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              {t("common.activeProvider", language)}
            </div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {data?.activeProvider ?? t("providers.loading", language)}
            </div>
          </div>
          <Badge variant="secondary" className="w-fit">
            {t("providers.fallbackSafe", language)}
          </Badge>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.providers.map((provider) => (
          <Card key={provider.name} className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardDescription>{provider.name}</CardDescription>
              <CardTitle className="flex items-center gap-3">
                <ServerCog className="size-5 text-zinc-300" />
                {t(`provider.${provider.name}.label`, language)}
                <Badge variant={provider.configured ? "secondary" : "outline"}>
                  {provider.configured ? t("common.configured", language) : t("common.needsSetup", language)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-zinc-300">
              <p>{t(`provider.${provider.name}.description`, language)}</p>
              <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                {provider.configured ? (
                  <CheckCircle2 className="mt-0.5 size-4 text-emerald-300" />
                ) : (
                  <CircleAlert className="mt-0.5 size-4 text-amber-300" />
                )}
                <p>{provider.statusMessage}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>
                  {t("providers.realtimeProgress", language)}:{" "}
                  {provider.supportsRealtimeProgress ? t("common.yes", language) : t("common.no", language)}
                </span>
                <span>
                  {t("providers.apiKey", language)}:{" "}
                  {provider.requiresApiKey ? t("common.required", language) : t("common.notRequired", language)}
                </span>
                {provider.model ? <span>{t("providers.model", language)}: {provider.model}</span> : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppFrame>
  );
}
