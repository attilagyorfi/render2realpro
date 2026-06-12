"use client";

import { useQuery } from "@tanstack/react-query";
import { Languages } from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchJson } from "@/lib/fetch-json";
import { t, type Language } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

type ProvidersResponse = {
  activeProvider: string;
  providers: Array<{
    name: string;
    label: string;
    configured: boolean;
    statusMessage: string;
  }>;
};

type LogsResponse = {
  logs: Array<{
    id: string;
    providerName: string;
    success: boolean;
    errorMessage?: string | null;
    processingTime: number;
    status: string;
    createdAt: string;
    imageAsset: { originalFileName: string; projectId: string };
  }>;
};

/**
 * Settings is the home of everything that isn't day-to-day project work:
 * language preference (moved here from the header), provider status
 * (formerly its own nav item), and the generation log (formerly the
 * History page). Per user feedback (2026-06-12) none of these carried
 * enough daily-use weight to justify top-level navigation entries.
 */
export function SettingsView() {
  const language = useAppPreferencesStore((state) => state.language);
  const setLanguage = useAppPreferencesStore((state) => state.setLanguage);

  const { data: providerData } = useQuery({
    queryKey: ["providers"],
    queryFn: () => fetchJson<ProvidersResponse>("/api/providers"),
  });
  const { data: logsData } = useQuery({
    queryKey: ["logs"],
    queryFn: () => fetchJson<LogsResponse>("/api/logs"),
  });

  return (
    <AppFrame eyebrow={t("settings.eyebrow", language)} title={t("settings.title", language)}>
      <div className="grid gap-4">
        {/* ── Language ─────────────────────────────────────────────────── */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="size-4 text-blue-400" />
              {t("settings.language", language)}
            </CardTitle>
            <CardDescription>{t("settings.languageDescription", language)}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="hu">Magyar</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* ── Provider status ──────────────────────────────────────────── */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>{t("settings.providerReadiness", language)}</CardTitle>
            <CardDescription>{t("settings.providerDescription", language)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {providerData?.providers.map((provider) => (
              <div
                key={provider.name}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-white/8 bg-white/4 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{provider.label}</span>
                  {provider.name === providerData.activeProvider ? (
                    <Badge variant="secondary">{t("common.activeProvider", language)}</Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={provider.configured ? "secondary" : "outline"}>
                    {provider.configured
                      ? t("common.configured", language)
                      : t("common.needsSetup", language)}
                  </Badge>
                </div>
              </div>
            )) ?? (
              <div className="text-sm text-muted-foreground">
                {t("providers.loading", language)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Generation log ───────────────────────────────────────────── */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>{t("history.title", language)}</CardTitle>
            <CardDescription>{t("history.eyebrow", language)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1.5">
            {logsData?.logs.length ? (
              logsData.logs.slice(0, 50).map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-white/6 bg-white/3 px-3 py-2 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant={log.success ? "secondary" : "outline"}>
                      {t(`status.${log.status}` as Parameters<typeof t>[0], language)}
                    </Badge>
                    <span className="truncate text-foreground">
                      {log.imageAsset.originalFileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{log.providerName}</span>
                    <span className="font-mono">{log.processingTime} ms</span>
                    <span>
                      {new Date(log.createdAt).toLocaleString(
                        language === "hu" ? "hu-HU" : "en-US"
                      )}
                    </span>
                  </div>
                  {log.errorMessage ? (
                    <div className="w-full text-red-300/80">{log.errorMessage}</div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                {t("common.idle", language)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Integrations (unchanged) ─────────────────────────────────── */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>{t("settings.integrations", language)}</CardTitle>
            <CardDescription>{t("settings.integrationsDescription", language)}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-zinc-300">
            {t("settings.integrationsBody", language)}
          </CardContent>
        </Card>
      </div>
    </AppFrame>
  );
}
