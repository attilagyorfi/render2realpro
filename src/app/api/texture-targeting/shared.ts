import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { profileOwnsProject } from "@/services/auth/profile-store";
import { requireCurrentProfile } from "@/services/auth/session";

export async function getAuthorizedTextureAsset(imageAssetId: string) {
  let profileId: string;

  try {
    const profile = await requireCurrentProfile();
    profileId = profile.id;
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const imageAsset = await prisma.imageAsset.findUnique({
    where: { id: imageAssetId },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!imageAsset) {
    return { error: NextResponse.json({ error: "Image asset not found." }, { status: 404 }) };
  }

  const canAccess = await profileOwnsProject(profileId, imageAsset.projectId);

  if (!canAccess) {
    return { error: NextResponse.json({ error: "Project not found." }, { status: 404 }) };
  }

  return { imageAsset };
}
