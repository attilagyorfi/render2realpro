"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FolderKanban,
  Image as ImageIcon,
  Layers3,
  Cpu,
  Zap,
  GitBranch,
  Download,
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
  Package,
} from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

const stagger = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export function DashboardView() {
  const language = useAppPreferencesStore((state) => state.language);

  const metrics = [
    {
      icon: FolderKanban,
      label: t("dashboard.metricLiveProjects", language),
      value: "Projects",
      meta: t("dashboard.metricLiveProjectsMeta", language),
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      icon: Cpu,
      label: t("dashboard.metricGenerationReadiness", language),
      value: "OpenAI / Mock",
      meta: t("dashboard.metricGenerationReadinessMeta", language),
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
    },
    {
      icon: Download,
      label: t("dashboard.metricExportTargets", language),
      value: "PNG · JPG · WEBP",
      meta: t("dashboard.metricExportTargetsMeta", language),
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  const phases = [
    { icon: FolderKanban, label: t("dashboard.coverageProjects", language) },
    { icon: Layers3, label: t("dashboard.coveragePrompt", language) },
    { icon: ImageIcon, label: t("dashboard.coverageExport", language) },
  ];

  const activityItems = [
    { icon: Activity, label: t("dashboard.activityProjects", language), tone: "blue" },
    { icon: Zap, label: t("dashboard.activityGeneration", language), tone: "violet" },
    { icon: Download, label: t("dashboard.activityExport", language), tone: "emerald" },
  ];

  return (
    <AppFrame eyebrow={t("common.appEyebrow", language)} title="Render2Real Pro">
      <div className="grid gap-5">

        {/* ── HERO BANNER ──────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative isolate overflow-hidden rounded-[32px] border border-white/8 bg-gradient-to-br from-[#0e1829] via-[#0c1520] to-[#090c14] p-7 md:p-9"
        >
          {/* Glow orbs */}
          <div className="pointer-events-none absolute -left-16 -top-16 size-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 right-0 size-56 rounded-full bg-violet-500/8 blur-3xl" />
          {/* Grid pattern */}
          <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />

          <div className="relative grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-300 text-[0.7rem] tracking-[0.12em] uppercase">
                  {t("dashboard.heroBadge", language)}
                </Badge>
                <Badge variant="outline" className="border-white/12 text-zinc-500 text-[0.7rem]">
                  Local-first · Review-safe
                </Badge>
              </div>

              <div>
                <h2 className="text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
                  {t("dashboard.heroTitle", language)}
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-zinc-400">
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

              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { icon: CheckCircle2, label: t("dashboard.coverageProjects", language) },
                  { icon: Zap, label: t("dashboard.coveragePrompt", language) },
                  { icon: GitBranch, label: t("dashboard.coverageExport", language) },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400"
                  >
                    <Icon className="size-3 text-blue-400" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start">
              <ProjectCreateForm />
            </div>
          </div>
        </motion.section>

        {/* ── METRICS ROW ──────────────────────────────────────────────────── */}
        <section className="grid gap-4 lg:grid-cols-3">
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                {...stagger}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <Card className="surface-panel min-h-32 rounded-[24px]">
                  <CardHeader className="gap-3 pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`flex size-9 items-center justify-center rounded-[14px] border ${metric.bg}`}>
                        <Icon className={`size-4 ${metric.color}`} />
                      </div>
                      <TrendingUp className="size-3.5 text-zinc-600" />
                    </div>
                    <div>
                      <CardDescription className="text-[0.68rem] uppercase tracking-[0.18em] text-zinc-500">
                        {metric.label}
                      </CardDescription>
                      <CardTitle className={`mt-1 font-mono text-2xl font-semibold tracking-tight ${metric.color}`}>
                        {metric.value}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs text-zinc-500">{metric.meta}</CardContent>
                </Card>
              </motion.div>
            );
          })}
        </section>

        {/* ── PHASE COVERAGE + ACTIVITY ────────────────────────────────────── */}
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">

          <motion.div {...stagger} transition={{ duration: 0.4, delay: 0.25 }}>
            <Card className="surface-panel rounded-[28px]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-blue-400" />
                  <CardTitle>{t("dashboard.phaseCoverage", language)}</CardTitle>
                </div>
                <CardDescription>{t("dashboard.phaseDescription", language)}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {phases.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-white/3 px-4 py-3.5 transition hover:bg-white/5"
                    >
                      <div className="flex size-10 items-center justify-center rounded-[16px] border border-blue-500/20 bg-blue-500/10">
                        <Icon className="size-4 text-blue-400" />
                      </div>
                      <span className="flex-1 text-sm text-zinc-200">{item.label}</span>
                      <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15">
                        <CheckCircle2 className="size-3 text-emerald-400" />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...stagger} transition={{ duration: 0.4, delay: 0.32 }}>
            <Card className="surface-panel rounded-[28px]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-zinc-400" />
                  <CardTitle>{t("dashboard.activityTitle", language)}</CardTitle>
                </div>
                <CardDescription>{t("dashboard.activityDescription", language)}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {activityItems.map((item) => {
                  const Icon = item.icon;
                  const colorMap: Record<string, string> = {
                    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
                    violet: "bg-violet-500/10 border-violet-500/20 text-violet-400",
                    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                  };
                  const colors = colorMap[item.tone] ?? colorMap.blue;
                  return (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 rounded-[20px] border border-white/8 bg-white/3 px-4 py-3.5"
                    >
                      <div className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[10px] border ${colors}`}>
                        <Icon className="size-3.5" />
                      </div>
                      <p className="text-sm leading-6 text-zinc-300">{item.label}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        </section>
      </div>
    </AppFrame>
  );
}
