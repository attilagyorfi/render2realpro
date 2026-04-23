"use client";

import { AppFrame } from "@/components/layout/app-frame";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

export function SettingsView() {
  const language = useAppPreferencesStore((state) => state.language);

  return (
    <AppFrame eyebrow={t("settings.eyebrow", language)} title={t("settings.title", language)}>
      <div className="grid gap-4">
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>{t("settings.integrations", language)}</CardTitle>
            <CardDescription>
              {t("settings.integrationsDescription", language)}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-zinc-300">
            {t("settings.integrationsBody", language)}
          </CardContent>
        </Card>
      </div>
    </AppFrame>
  );
}
