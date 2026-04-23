"use client";

import { useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderOpen, Plus, UploadCloud } from "lucide-react";

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
  const folderInputRef = useRef<HTMLInputElement>(null);

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
    onSuccess: (_, files) => {
      toast.success(
        files.length > 1
          ? `${files.length} ${language === "hu" ? "fájl feltöltve" : "files uploaded"}`
          : t("upload.success", language)
      );
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

  const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      ["image/png", "image/jpeg", "image/webp"].includes(file.type)
    );
    if (files.length > 0) {
      uploadMutation.mutate(files);
    }
    // Reset so same folder can be re-selected
    event.target.value = "";
  };

  if (compact) {
    return (
      <div className="flex w-full gap-2">
        {/* Drag-drop / file picker */}
        <button
          type="button"
          className={`flex flex-1 h-12 items-center gap-3 rounded-[18px] border border-dashed px-4 text-left transition ${
            isDragActive
              ? "border-white/40 bg-white/10"
              : "border-white/15 bg-black/20 hover:border-white/30 hover:bg-white/5"
          }`}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          <div className="flex size-7 items-center justify-center rounded-xl bg-white/10">
            <Plus className="size-3.5 text-white" />
          </div>
          <span className="text-sm font-medium text-white">
            {uploadMutation.isPending ? t("upload.uploading", language) : t("upload.drop", language)}
          </span>
          <span className="ml-auto text-xs text-zinc-500">PNG / JPG</span>
        </button>

        {/* Folder picker */}
        <button
          type="button"
          title={language === "hu" ? "Mappa feltöltése" : "Upload folder"}
          onClick={() => folderInputRef.current?.click()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/15 bg-black/20 transition hover:border-white/30 hover:bg-white/5"
        >
          <FolderOpen className="size-4 text-zinc-400" />
        </button>

        {/* Hidden folder input */}
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          multiple
          // @ts-expect-error – non-standard but widely supported
          webkitdirectory=""
          directory=""
          accept=".png,.jpg,.jpeg,.webp"
          onChange={handleFolderChange}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        className={`flex w-full h-40 flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed px-6 text-center transition ${
          isDragActive
            ? "border-white/40 bg-white/10"
            : "border-white/15 bg-black/20 hover:border-white/30 hover:bg-white/5"
        }`}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10">
          <UploadCloud className="size-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-medium text-white">
            {uploadMutation.isPending ? t("upload.uploading", language) : t("upload.drop", language)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">{t("upload.help", language)}</div>
        </div>
      </button>

      {/* Folder upload button */}
      <button
        type="button"
        onClick={() => folderInputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/4 py-2.5 text-xs text-zinc-400 transition hover:border-white/20 hover:bg-white/6 hover:text-zinc-200"
      >
        <FolderOpen className="size-3.5" />
        {language === "hu" ? "Mappa feltöltése" : "Upload entire folder"}
      </button>

      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        multiple
        // @ts-expect-error – non-standard but widely supported
        webkitdirectory=""
        directory=""
        accept=".png,.jpg,.jpeg,.webp"
        onChange={handleFolderChange}
      />
    </div>
  );
}
