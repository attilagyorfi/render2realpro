"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FolderKanban, Image as ImageIcon, Layers3 } from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { AppFrame } from "@/components/layout/app-frame";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

export function DashboardView() {
  const language = useAppPreferencesStore((state) => state.language);

  return (
    <AppFrame eyebrow={t("common.appEyebrow", language)} title="Render2Real Pro">
      <div className="grid gap-4">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="surface-accent overflow-hidden rounded-[32px] p-6 md:p-8"
        >
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-5">
              <Badge variant="secondary" className="surface-chip w-fit text-foreground">
                {t("dashboard.heroBadge", language)}
              </Badge>
              <div className="max-w-3xl">
                <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  {t("dashboard.heroTitle", language)}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                  {t("dashboard.heroBody", language)}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/app/projects"
                  className={buttonVariants({ variant: "default", size: "lg" })}
                >
                  {t("dashboard.openProjects", language)}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </div>
            </div>
            <ProjectCreateForm />
          </div>
        </motion.section>

        <section className="grid gap-4 lg:grid-cols-3">
          <MetricCard
            label={t("dashboard.metricLiveProjects", language)}
            value="Projects"
            meta={t("dashboard.metricLiveProjectsMeta", language)}
          />
          <MetricCard
            label={t("dashboard.metricGenerationReadiness", language)}
            value="OpenAI / Mock"
            meta={t("dashboard.metricGenerationReadinessMeta", language)}
          />
          <MetricCard
            label={t("dashboard.metricExportTargets", language)}
            value="PNG · JPG · WEBP"
            meta={t("dashboard.metricExportTargetsMeta", language)}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="surface-panel rounded-[28px]">
            <CardHeader>
              <CardTitle>{t("dashboard.phaseCoverage", language)}</CardTitle>
              <CardDescription>{t("dashboard.phaseDescription", language)}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                { icon: FolderKanban, label: t("dashboard.coverageProjects", language) },
                { icon: Layers3, label: t("dashboard.coveragePrompt", language) },
                { icon: ImageIcon, label: t("dashboard.coverageExport", language) },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="surface-subtle flex items-center gap-3 rounded-[22px] px-4 py-4"
                  >
                    <div className="surface-chip flex size-11 items-center justify-center rounded-[18px]">
                      <Icon className="size-4 text-foreground" />
                    </div>
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="surface-panel rounded-[28px]">
            <CardHeader>
              <CardTitle>{t("dashboard.activityTitle", language)}</CardTitle>
              <CardDescription>{t("dashboard.activityDescription", language)}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              {[
                t("dashboard.activityProjects", language),
                t("dashboard.activityGeneration", language),
                t("dashboard.activityExport", language),
              ].map((item) => (
                <div key={item} className="surface-subtle rounded-[20px] px-4 py-4 leading-6">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppFrame>
  );
}
