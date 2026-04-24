"use client";

import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchJson } from "@/lib/fetch-json";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

type ProjectFormValues = {
  name: string;
  description?: string;
  clientName?: string;
};

type Props = {
  onCreated?: (projectId: string) => void;
};

export function ProjectCreateForm({ onCreated }: Props) {
  const queryClient = useQueryClient();
  const language = useAppPreferencesStore((state) => state.language);
  const form = useForm<ProjectFormValues>({
    defaultValues: {
      name: "",
      description: "",
      clientName: "",
    },
  });

  const createProject = useMutation({
    mutationFn: (values: ProjectFormValues) =>
      fetchJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }),
    onSuccess: (data: unknown) => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t("project.created", language));
      const projectId = (data as { project?: { id?: string } })?.project?.id;
      if (projectId) onCreated?.(projectId);
      else onCreated?.("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("project.createError", language));
    },
  });

  return (
    <Card className="surface-panel rounded-[28px]">
      <CardHeader>
        <CardTitle>{t("project.newProject", language)}</CardTitle>
        <CardDescription>
          {t("project.newProjectDescription", language)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-3" onSubmit={form.handleSubmit((values) => createProject.mutate(values))}>
          <Input placeholder={t("project.namePlaceholder", language)} {...form.register("name", { required: true })} />
          <Input placeholder={t("project.clientPlaceholder", language)} {...form.register("clientName")} />
          <Textarea
            placeholder={t("project.descriptionPlaceholder", language)}
            {...form.register("description")}
          />
          <Button type="submit" disabled={createProject.isPending}>
            {t("project.create", language)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
