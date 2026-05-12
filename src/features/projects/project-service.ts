import { ImageVersionType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Returns every project owned by the given profile, newest first. Each
 * project includes its assets and (for the dashboard tile preview) the
 * single most-recent realism_pass version per asset.
 */
export async function listProjects(profileId: string) {
  return prisma.project.findMany({
    where: { userId: profileId },
    orderBy: { updatedAt: "desc" },
    include: {
      imageAssets: {
        include: {
          imageVersions: {
            where: { versionType: ImageVersionType.realism_pass },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Returns a single project's full detail (assets + every version + logs)
 * if and only if the profile owns it. Returns null on miss or ownership
 * mismatch so the caller can map both to a 404.
 */
export async function getProjectDetail(projectId: string, profileId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId: profileId },
    include: {
      imageAssets: {
        include: {
          imageVersions: {
            orderBy: { createdAt: "desc" },
          },
          generationLogs: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Creates a new project owned by the given profile in a single insert.
 * Previously this was a two-phase create-then-assign which could leave
 * the project orphan if the second write failed.
 */
export async function createProject(
  input: { name: string; description?: string; clientName?: string },
  profileId: string
) {
  return prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      clientName: input.clientName,
      userId: profileId,
    },
  });
}
