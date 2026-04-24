import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { token: string };

/** GET /api/share/:token — public endpoint, no auth required */
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
