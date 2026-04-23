"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, UploadCloud } from "lucide-react";

import { t } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

export function UploadDropzone({
  projectId,
  compact = false,
}: {
  projectId: string;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const language = useAppPreferencesStore((state) => state.language);

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? t("upload.failed", language));
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success(t("upload.success", language));
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("upload.failed", language));
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        uploadMutation.mutate(acceptedFiles);
      }
    },
    [uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
  });

  return (
    <button
      type="button"
      className={`flex w-full ${compact ? "h-14 flex-row justify-between rounded-[20px] px-4 text-left" : "h-40 flex-col justify-center rounded-[24px] px-6 text-center"} items-center gap-3 border border-dashed transition ${
        isDragActive
          ? "border-white/40 bg-white/10"
          : "border-white/15 bg-black/20 hover:border-white/30 hover:bg-white/5"
      }`}
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      <div className={`flex ${compact ? "items-center gap-3" : "flex-col items-center"}`}>
        <div className={`flex ${compact ? "size-9 rounded-xl" : "size-12 rounded-2xl"} items-center justify-center bg-white/10`}>
          {compact ? <Plus className="size-4 text-white" /> : <UploadCloud className="size-5 text-white" />}
        </div>
        <div>
          <div className="text-sm font-medium text-white">
            {uploadMutation.isPending ? t("upload.uploading", language) : t("upload.drop", language)}
          </div>
          {!compact ? (
            <div className="mt-1 text-xs text-zinc-400">
              {t("upload.help", language)}
            </div>
          ) : null}
        </div>
      </div>
      {compact ? <div className="text-xs text-zinc-400">PNG / JPG / WEBP</div> : null}
    </button>
  );
}
