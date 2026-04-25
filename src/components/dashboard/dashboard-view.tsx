"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  GitBranch,
} from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

export function DashboardView() {
  const language = useAppPreferencesStore((state) => state.language);
  const router = useRouter();

  return (
    <AppFrame eyebrow={t("common.appEyebrow", language)} title="FormaReal">
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
              <ProjectCreateForm onCreated={(projectId) => {
                if (projectId) router.push(`/app/projects/${projectId}`);
              }} />
            </div>
          </div>
        </motion.section>

      </div>
    </AppFrame>
  );
}
