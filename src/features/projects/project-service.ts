import { ImageVersionType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  assignProjectToProfile,
  listProjectIdsForProfile,
  profileOwnsProject,
} from "@/services/auth/profile-store";

export async function listProjects(profileId: string) {
  const projectIds = await listProjectIdsForProfile(profileId);

  if (projectIds.length === 0) {
    return [];
  }

  return prisma.project.findMany({
    where: { id: { in: projectIds } },
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

export async function getProjectDetail(projectId: string, profileId: string) {
  const canAccess = await profileOwnsProject(profileId, projectId);

  if (!canAccess) {
    return null;
  }

  return prisma.project.findUnique({
    where: { id: projectId },
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

export async function createProject(input: {
  name: string;
  description?: string;
  clientName?: string;
}, profileId: string) {
  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      clientName: input.clientName,
    },
  });

  await assignProjectToProfile({ profileId, projectId: project.id });
  return project;
}
