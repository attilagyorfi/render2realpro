"use client";

import { useQuery } from "@tanstack/react-query";

import { AppFrame } from "@/components/layout/app-frame";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchJson } from "@/lib/fetch-json";
import { t } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

type LogsResponse = {
  logs: Array<{
    id: string;
    providerName: string;
    promptVersion: string;
    success: boolean;
    errorMessage?: string | null;
    processingTime: number;
    status: string;
    createdAt: string;
    imageAsset: {
      originalFileName: string;
      projectId: string;
    };
  }>;
};

export function HistoryView() {
  const language = useAppPreferencesStore((state) => state.language);
  const { data } = useQuery({
    queryKey: ["logs"],
    queryFn: () => fetchJson<LogsResponse>("/api/logs"),
  });

  return (
    <AppFrame eyebrow={t("history.eyebrow", language)} title={t("history.title", language)}>
      <div className="grid gap-4">
        {data?.logs.map((log) => (
          <Card key={log.id} className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>{log.imageAsset.originalFileName}</span>
                <Badge variant={log.success ? "secondary" : "outline"}>{log.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-zinc-300">
              <div>{t("history.provider", language)}: {log.providerName}</div>
              <div>{t("history.promptVersion", language)}: {log.promptVersion}</div>
              <div>{t("history.processingTime", language)}: {log.processingTime} ms</div>
              <div>{t("history.created", language)}: {new Date(log.createdAt).toLocaleString()}</div>
              {log.errorMessage ? <div className="text-red-300">{log.errorMessage}</div> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppFrame>
  );
}
