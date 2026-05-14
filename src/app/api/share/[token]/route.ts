import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { token: string };

/**
 * GET /api/share/:token — public endpoint, no auth required.
 *
 * Rejects (404) tokens that:
 *   - don't match any project,
 *   - have shareTokenExpiresAt in the past.
 *
 * On a successful read, atomically increments shareTokenViewCount so the
 * owner can later see how many times the link has been opened.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  const { token } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      name: true,
      description: true,
      clientName: true,
      createdAt: true,
      shareTokenExpiresAt: true,
      imageAssets: {
        select: {
          id: true,
          originalFileName: true,
          width: true,
          height: true,
          imageVersions: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              versionType: true,
              filePath: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    project.shareTokenExpiresAt &&
    project.shareTokenExpiresAt.getTime() <= Date.now()
  ) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // Best-effort view counter; failure should not block serving the page.
  prisma.project
    .update({
      where: { id: project.id },
      data: { shareTokenViewCount: { increment: 1 } },
    })
    .catch((error) => {
      console.warn("[share] failed to increment view count", error);
    });

  // Build public URLs for each version file
  const assetsWithUrls = project.imageAssets.map((asset) => ({
    ...asset,
    imageVersions: asset.imageVersions.map((v) => ({
      ...v,
      fileUrl: `/api/files/${encodeURIComponent(v.filePath)}`,
    })),
  }));

  return NextResponse.json({ project: { ...project, imageAssets: assetsWithUrls } });
}
