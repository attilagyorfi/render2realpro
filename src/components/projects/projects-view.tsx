"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  FolderKanban,
  Pencil,
  Plus,
  Clock,
  FileImage,
  Layers,
} from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { fetchJson } from "@/lib/fetch-json";
import { useAppPreferencesStore } from "@/store/app-preferences";

type ProjectSummary = {
  id: string;
  name: string;
  description?: string | null;
  clientName?: string | null;
  imageAssets: Array<{
    id: string;
    generatedVersions?: Array<{ id: string; createdAt: string; versionType: string }>;
  }>;
  updatedAt: string;
};

type ProjectsResponse = {
  projects: ProjectSummary[];
};

export function formatProjectAssetCount(count: number) {
  return `${count} ${count === 1 ? "file" : "files"}`;
}

const stagger = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export function ProjectsView() {
  const language = useAppPreferencesStore((state) => state.language);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  // Rename modal state — projects are created with default names now
  // (zero-friction create), so renaming from the list is the expected
  // second step of the flow.
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchJson<ProjectsResponse>("/api/projects"),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      fetchJson(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      toast.success(t("project.renamed", language));
      setRenameTarget(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("project.createError", language)),
  });

  const projects = data?.projects ?? [];

  return (
    <AppFrame eyebrow={t("common.appEyebrow", language)} title={t("dashboard.projects", language)}>
      <div className="flex flex-col gap-6">

        {/* ── NEW PROJECT ───────────────────────────────────────────────────── */}
        <motion.div {...stagger} transition={{ duration: 0.4, delay: 0 }}>
          <div className="relative isolate overflow-hidden rounded-[32px] border border-white/8 bg-gradient-to-br from-[#0e1829] via-[#0c1520] to-[#090c14] p-7">
            {/* Glow + grid */}
            <div className="pointer-events-none absolute -left-16 -top-16 size-72 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />

            <div className="relative grid gap-8 xl:grid-cols-[1fr_1fr]">
              {/* Left — illustration + text */}
              <div className="flex flex-col gap-5">
                {/* Architectural grid illustration */}
                <div className="flex h-32 items-center justify-start">
                  <svg width="220" height="110" viewBox="0 0 220 110" fill="none" className="opacity-60">
                    <rect x="20" y="30" width="80" height="70" stroke="#3b82f6" strokeWidth="1.5" fill="none" />
                    <rect x="30" y="45" width="15" height="20" stroke="#3b82f6" strokeWidth="1" fill="rgba(59,130,246,0.08)" />
                    <rect x="55" y="45" width="15" height="20" stroke="#3b82f6" strokeWidth="1" fill="rgba(59,130,246,0.08)" />
                    <rect x="30" y="75" width="15" height="25" stroke="#3b82f6" strokeWidth="1" fill="rgba(59,130,246,0.08)" />
                    <rect x="55" y="75" width="25" height="25" stroke="#3b82f6" strokeWidth="1" fill="rgba(59,130,246,0.08)" />
                    <line x1="10" y1="30" x2="110" y2="30" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 3" />
                    <line x1="115" y1="65" x2="145" y2="65" stroke="#60a5fa" strokeWidth="2" />
                    <path d="M140 60 L148 65 L140 70" stroke="#60a5fa" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <rect x="150" y="30" width="60" height="70" rx="6" stroke="#818cf8" strokeWidth="1.5" fill="rgba(129,140,248,0.06)" />
                    <rect x="158" y="40" width="12" height="15" rx="2" stroke="#818cf8" strokeWidth="1" fill="rgba(129,140,248,0.12)" />
                    <rect x="176" y="40" width="12" height="15" rx="2" stroke="#818cf8" strokeWidth="1" fill="rgba(129,140,248,0.12)" />
                    <rect x="158" y="62" width="12" height="22" rx="2" stroke="#818cf8" strokeWidth="1" fill="rgba(129,140,248,0.12)" />
                    <rect x="176" y="62" width="20" height="22" rx="2" stroke="#818cf8" strokeWidth="1" fill="rgba(129,140,248,0.12)" />
                    <line x1="10" y1="100" x2="210" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <circle cx="20" cy="30" r="2.5" fill="#3b82f6" />
                    <circle cx="100" cy="30" r="2.5" fill="#3b82f6" />
                    <circle cx="150" cy="30" r="2.5" fill="#818cf8" />
                    <circle cx="210" cy="30" r="2.5" fill="#818cf8" />
                  </svg>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    {/* Clickable + button to open/close create form */}
                    <button
                      type="button"
                      onClick={() => setCreateOpen((o) => !o)}
                      title={language === "hu" ? "Új projekt létrehozása" : "Create new project"}
                      className="flex size-8 items-center justify-center rounded-[12px] border border-blue-500/30 bg-blue-500/10 transition hover:bg-blue-500/20 hover:border-blue-400/50 hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                    >
                      <motion.div animate={{ rotate: createOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                        <Plus className="size-4 text-blue-400" />
                      </motion.div>
                    </button>
                    <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {language === "hu" ? "Új projekt" : "New project"}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-zinc-400 max-w-xs">
                    {language === "hu"
                      ? "Hozz létre egy új munkaterületet, és töltsd fel az építészeti renderképeket."
                      : "Create a new workspace and upload your architectural render images."}
                  </p>
                </div>
              </div>

              {/* Right — form (animated, opens on + click) */}
              <AnimatePresence>
                {createOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 24, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 24, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-start"
                  >
                    <ProjectCreateForm
                      onCreated={(projectId) => {
                        setCreateOpen(false);
                        if (projectId) router.push(`/app/projects/${projectId}`);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* ── SAVED PROJECTS ────────────────────────────────────────────────── */}
        <motion.div {...stagger} transition={{ duration: 0.4, delay: 0.15 }}>
          <Card className="surface-panel rounded-[28px]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-[14px] border border-blue-500/20 bg-blue-500/10">
                  <FolderKanban className="size-4 text-blue-400" />
                </div>
                <div>
                  <CardDescription className="text-[0.68rem] uppercase tracking-[0.18em]">
                    {t("project.archiveEyebrow", language)}
                  </CardDescription>
                  <CardTitle className="mt-0.5">{t("project.archiveTitle", language)}</CardTitle>
                </div>
              </div>
              <CardDescription className="mt-1">{t("project.archiveDescription", language)}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="surface-subtle h-32 rounded-[22px] animate-pulse" />
                  ))
                : null}

              {!isLoading && projects.length === 0 ? (
                <div className="surface-subtle rounded-[22px] px-5 py-8 text-center">
                  <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/5">
                    <FolderKanban className="size-6 text-zinc-500" />
                  </div>
                  <div className="text-base font-medium text-foreground">
                    {t("project.emptyTitle", language)}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t("project.emptyBody", language)}
                  </div>
                </div>
              ) : null}

              {!isLoading
                ? projects.map((project, i) => {
                    const allVersions = project.imageAssets.flatMap(
                      (asset) => asset.generatedVersions ?? []
                    );
                    const versionCount = allVersions.length;

                    return (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.06 }}
                        role="link"
                        tabIndex={0}
                        aria-label={project.name}
                        onClick={() => router.push(`/app/projects/${project.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") router.push(`/app/projects/${project.id}`);
                        }}
                        className="surface-subtle flex cursor-pointer flex-col gap-4 rounded-[24px] border border-transparent p-5 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/8 hover:shadow-lg lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/5">
                              <Layers className="size-4 text-zinc-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-base font-semibold text-foreground">
                                {project.name}
                              </div>
                              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                {project.clientName || t("common.internalProject", language)}
                              </div>
                            </div>
                            <Badge variant="outline" className="surface-chip border-0 shrink-0">
                              {formatProjectAssetCount(project.imageAssets.length)}
                            </Badge>
                            {versionCount > 0 && (
                              <Badge variant="outline" className="shrink-0 border-blue-500/20 bg-blue-500/10 text-blue-300">
                                {versionCount} {language === "hu" ? "verzió" : "versions"}
                              </Badge>
                            )}
                          </div>

                          {project.description && (
                            <div className="mt-3 text-sm leading-6 text-muted-foreground">
                              {project.description}
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-600">
                            <Clock className="size-3" />
                            <span className="uppercase tracking-[0.1em]">
                              {t("project.updatedLabel", language)} ·{" "}
                              {new Date(project.updatedAt).toLocaleDateString(
                                language === "hu" ? "hu-HU" : "en-US"
                              )}
                            </span>
                          </div>
                        </div>

                        {versionCount > 0 && (
                          <div className="flex flex-wrap gap-1.5 lg:max-w-[200px]">
                            {allVersions.slice(0, 4).map((v) => {
                              const vLabel = v.versionType === "realism_pass" ? (language === "hu" ? "Realizmus-passz" : "Realism pass")
                                : v.versionType === "texture_pass" ? (language === "hu" ? "Textúra-passz" : "Texture pass")
                                : v.versionType === "original" ? (language === "hu" ? "Eredeti" : "Original")
                                : v.versionType ?? "v";
                              return (
                                <div
                                  key={v.id}
                                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.65rem] text-zinc-400"
                                >
                                  <FileImage className="size-2.5" />
                                  {vLabel}
                                </div>
                              );
                            })}
                            {versionCount > 4 && (
                              <div className="flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.65rem] text-zinc-500">
                                +{versionCount - 4}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            type="button"
                            aria-label={t("project.rename", language)}
                            title={t("project.rename", language)}
                            onClick={(event) => {
                              event.stopPropagation();
                              setRenameTarget({ id: project.id, name: project.name });
                              setRenameValue(project.name);
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Link
                            href={`/app/projects/${project.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className={buttonVariants({ variant: "default", size: "default" })}
                          >
                            {t("project.open", language)}
                            <ArrowRight data-icon="inline-end" />
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })
                : null}
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* ── Rename modal ─────────────────────────────────────────────────── */}
      {renameTarget ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setRenameTarget(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setRenameTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("project.rename", language)}
            className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#0c1018] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-foreground">
              {t("project.rename", language)}
            </h2>
            <Input
              autoFocus
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && renameValue.trim()) {
                  renameMutation.mutate({ id: renameTarget.id, name: renameValue.trim() });
                }
              }}
              className="mt-4"
              placeholder={t("project.namePlaceholder", language)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setRenameTarget(null)}>
                {t("common.cancel", language)}
              </Button>
              <Button
                size="sm"
                type="button"
                disabled={!renameValue.trim() || renameMutation.isPending}
                onClick={() =>
                  renameMutation.mutate({ id: renameTarget.id, name: renameValue.trim() })
                }
              >
                {t("common.save", language)}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppFrame>
  );
}
