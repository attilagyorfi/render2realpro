"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FolderKanban } from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";
import { fetchJson } from "@/lib/fetch-json";
import { useAppPreferencesStore } from "@/store/app-preferences";

type ProjectSummary = {
  id: string;
  name: string;
  description?: string | null;
  clientName?: string | null;
  imageAssets: Array<{ id: string }>;
  updatedAt: string;
};

type ProjectsResponse = {
  projects: ProjectSummary[];
};

export function formatProjectAssetCount(count: number) {
  return `${count} ${count === 1 ? "file" : "files"}`;
}

export function ProjectsView() {
  const language = useAppPreferencesStore((state) => state.language);
  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchJson<ProjectsResponse>("/api/projects"),
  });

  const projects = data?.projects ?? [];

  return (
    <AppFrame eyebrow={t("common.appEyebrow", language)} title={t("dashboard.projects", language)}>
      <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <ProjectCreateForm />

        <Card className="surface-panel rounded-[28px]">
          <CardHeader>
            <CardDescription>{t("project.archiveEyebrow", language)}</CardDescription>
            <CardTitle className="flex items-center gap-3">
              <FolderKanban className="size-5" />
              {t("project.archiveTitle", language)}
            </CardTitle>
            <CardDescription>{t("project.archiveDescription", language)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="surface-subtle h-32 rounded-[22px] animate-pulse"
                  />
                ))
              : null}

            {!isLoading && projects.length === 0 ? (
              <div className="surface-subtle rounded-[22px] px-5 py-6">
                <div className="text-base font-medium text-foreground">
                  {t("project.emptyTitle", language)}
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t("project.emptyBody", language)}
                </div>
              </div>
            ) : null}

            {!isLoading
              ? projects.map((project) => (
                  <div
                    key={project.id}
                    className="surface-subtle flex flex-col gap-4 rounded-[24px] p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="truncate text-lg font-semibold text-foreground">
                          {project.name}
                        </div>
                        <Badge variant="outline" className="surface-chip border-0">
                          {formatProjectAssetCount(project.imageAssets.length)}
                        </Badge>
                      </div>
                      <div className="mt-2 truncate text-sm text-muted-foreground">
                        {project.clientName || t("common.internalProject", language)}
                      </div>
                      <div className="mt-3 text-sm leading-6 text-muted-foreground">
                        {project.description || t("dashboard.noDescription", language)}
                      </div>
                      <div className="mt-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        {t("project.updatedLabel", language)} ·{" "}
                        {new Date(project.updatedAt).toLocaleDateString(
                          language === "hu" ? "hu-HU" : "en-US"
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Link
                        href={`/app/projects/${project.id}`}
                        className={buttonVariants({ variant: "default", size: "default" })}
                      >
                        {t("project.open", language)}
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                    </div>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>
      </div>
    </AppFrame>
  );
}
