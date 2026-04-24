import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentProfile } from "@/services/auth/session";
import { profileOwnsProject } from "@/services/auth/profile-store";
import { duplicateGeneratedVersion } from "@/services/storage/storage-service";
import { ImageVersionType } from "@prisma/client";

type Params = { projectId: string; assetId: string; versionId: string };

/**
 * POST /api/projects/:projectId/assets/:assetId/versions/:versionId/restore
 *
 * Duplicates the given version's file as a new realism_pass version so the
 * user can "restore" a previous generation and continue editing from there.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const profile = await requireCurrentProfile();
    const { projectId, assetId, versionId } = await params;

    if (!(await profileOwnsProject(profile.id, projectId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const version = await prisma.imageVersion.findFirst({
      where: { id: versionId, imageAssetId: assetId },
    });

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Duplicate the file so the restored version has its own independent copy
    const saved = await duplicateGeneratedVersion({
      projectId,
      sourcePath: version.filePath,
      versionLabel: "restored",
    });

    const newVersion = await prisma.imageVersion.create({
      data: {
        imageAssetId: assetId,
        versionType: ImageVersionType.realism_pass,
        filePath: saved.filePath,
        promptUsed: version.promptUsed ?? "",
        presetUsed: version.presetUsed ?? "",
        settingsJson: version.settingsJson ?? "{}",
        metadataJson: JSON.stringify({ restoredFromVersionId: versionId }),
      },
    });

    return NextResponse.json({ version: newVersion });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[version-restore]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
