"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ComparisonView } from "@/components/comparison/comparison-view";

type SharedVersion = {
  id: string;
  versionType: string;
  fileUrl: string;
  createdAt: string;
};

type SharedAsset = {
  id: string;
  originalFileName: string;
  width: number;
  height: number;
  imageVersions: SharedVersion[];
};

type SharedProject = {
  id: string;
  name: string;
  description?: string | null;
  clientName?: string | null;
  createdAt: string;
  imageAssets: SharedAsset[];
};

function formatVersionLabel(versionType: string) {
  switch (versionType) {
    case "original": return "Eredeti";
    case "realism_pass": return "Realizmus-passz";
    case "texture_pass": return "Textúra-passz";
    case "edited": return "Szerkesztett";
    case "final": return "Végleges";
    default: return versionType;
  }
}

export function ShareView({ token }: { token: string }) {
  const { data, isLoading, isError } = useQuery<{ project: SharedProject }>({
    queryKey: ["share", token],
    queryFn: () => fetch(`/api/share/${token}`).then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] p-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data?.project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0d14] text-zinc-400">
        <div className="text-center">
          <p className="text-lg font-medium text-zinc-200">A projekt nem található</p>
          <p className="mt-2 text-sm">Ez a megosztási link lejárt vagy visszavonásra került.</p>
        </div>
      </div>
    );
  }

  const project = data.project;

  return (
    <div className="min-h-screen bg-[#0a0d14] text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0d14]/80 backdrop-blur-xl px-6 py-4">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">Render2Real Pro · Megosztott projekt</p>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{project.name}</h1>
            {project.clientName && (
              <p className="text-xs text-zinc-500">{project.clientName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/10 text-zinc-500 text-xs">
              {project.imageAssets.length} kép
            </Badge>
            <Badge variant="outline" className="border-white/10 text-zinc-500 text-xs">
              {new Date(project.createdAt).toLocaleDateString("hu-HU")}
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        {project.description && (
          <p className="mb-8 max-w-2xl text-sm text-zinc-400">{project.description}</p>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          {project.imageAssets.map((asset) => {
            const originalVersion = asset.imageVersions.find((v) => v.versionType === "original");
            const generatedVersion = asset.imageVersions
              .filter((v) => v.versionType !== "original")
              .at(-1);

            return (
              <div key={asset.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-300">{asset.originalFileName}</p>
                  <p className="text-xs text-zinc-600">{asset.width} × {asset.height}</p>
                </div>

                {originalVersion && generatedVersion ? (
                  <div className="overflow-hidden rounded-[20px] border border-white/8">
                    <ComparisonView
                      before={originalVersion.fileUrl}
                      after={generatedVersion.fileUrl}
                      className="aspect-video"
                    />
                  </div>
                ) : originalVersion ? (
                  <div className="overflow-hidden rounded-[20px] border border-white/8">
                    <div className="relative aspect-video w-full bg-black">
                      <Image
                        src={originalVersion.fileUrl}
                        alt={asset.originalFileName}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                ) : null}

                {/* Version badges */}
                <div className="flex flex-wrap gap-1.5">
                  {asset.imageVersions.map((v) => (
                    <Badge
                      key={v.id}
                      variant="outline"
                      className={
                        v.versionType === "original"
                          ? "border-white/10 text-zinc-500 text-[0.6rem]"
                          : "border-violet-500/30 bg-violet-500/10 text-violet-300 text-[0.6rem]"
                      }
                    >
                      {formatVersionLabel(v.versionType)}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {project.imageAssets.length === 0 && (
          <div className="flex items-center justify-center rounded-[24px] border border-white/8 bg-white/3 py-20 text-zinc-600">
            Ehhez a projekthez még nincsenek képek.
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-white/8 px-6 py-6 text-center text-xs text-zinc-700">
        Render2Real Pro · Automatikus fotorealisztikus megjelenítés AI segítségével
      </footer>
    </div>
  );
}
