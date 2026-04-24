import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { profileOwnsProject } from "@/services/auth/profile-store";
import { requireCurrentProfile } from "@/services/auth/session";

type RouteContext = {
  params: Promise<{ projectId: string; assetId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { projectId, assetId } = await context.params;
  try {
    const profile = await requireCurrentProfile();
    const canAccess = await profileOwnsProject(profile.id, projectId);
    if (!canAccess) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Verify the asset belongs to this project
  const asset = await prisma.imageAsset.findFirst({
    where: { id: assetId, projectId },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  // Delete asset (cascade deletes imageVersions and generationLogs via Prisma schema)
  await prisma.imageAsset.delete({ where: { id: assetId } });

  return NextResponse.json({ success: true });
}
