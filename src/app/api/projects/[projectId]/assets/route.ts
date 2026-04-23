import { NextResponse } from "next/server";
import { ImageVersionType } from "@prisma/client";

import { serializeProject } from "@/features/projects/project-serializer";
import { prisma } from "@/lib/prisma";
import { profileOwnsProject } from "@/services/auth/profile-store";
import { requireCurrentProfile } from "@/services/auth/session";
import { storeUploadedImage } from "@/services/storage/storage-service";
import { assertUploadIsSupported } from "@/features/upload/upload-validation";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  try {
    const profile = await requireCurrentProfile();
    const canAccess = await profileOwnsProject(profile.id, projectId);

    if (!canAccess) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files were uploaded." }, { status: 400 });
  }

  const createdAssets = [];

  for (const file of files) {
    assertUploadIsSupported(file);
    const bytes = Buffer.from(await file.arrayBuffer());
    const stored = await storeUploadedImage({
      projectId,
      originalFileName: file.name,
      bytes,
      mimeType: file.type,
    });

    const asset = await prisma.imageAsset.create({
      data: {
        projectId,
        originalFileName: file.name,
        storedFilePath: stored.storedFilePath,
        previewPath: stored.previewPath,
        imageType: stored.imageType,
        mimeType: stored.mimeType,
        width: stored.width,
        height: stored.height,
        size: stored.size,
        status: "ready",
        imageVersions: {
          create: {
            versionType: ImageVersionType.original,
            filePath: stored.storedFilePath,
            settingsJson: JSON.stringify({}),
            metadataJson: JSON.stringify({
              width: stored.width,
              height: stored.height,
              source: "upload",
            }),
          },
        },
      },
      include: {
        imageVersions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    createdAssets.push(asset);
  }

  return NextResponse.json(
    {
      assets: createdAssets.map((asset) =>
        serializeProject({ imageAssets: [asset] }).imageAssets[0]
      ),
    },
    { status: 201 }
  );
}
