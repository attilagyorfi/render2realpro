import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/features/projects/project-serializer";
import { getProjectDetail } from "@/features/projects/project-service";
import { getPresets } from "@/features/presets/preset-service";
import { profileOwnsProject } from "@/services/auth/profile-store";
import { requireCurrentProfile } from "@/services/auth/session";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  clientName: z.string().max(160).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export async function GET(_: Request, context: RouteContext) {
  const { projectId } = await context.params;
  let profileId: string;

  try {
    const profile = await requireCurrentProfile();
    profileId = profile.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [project, presets] = await Promise.all([getProjectDetail(projectId, profileId), getPresets()]);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project: serializeProject(project), presets });
}

/**
 * PATCH /api/projects/:projectId — rename / re-describe a project.
 * Added for the projects-list rename flow (2026-06-12): projects are now
 * created with default names and renamed afterwards, so this endpoint is
 * the second half of that contract.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { projectId } = await context.params;

  let profileId: string;
  try {
    const profile = await requireCurrentProfile();
    profileId = profile.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!(await profileOwnsProject(profileId, projectId))) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const payload = patchSchema.parse(await request.json());
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(payload.name !== undefined && { name: payload.name.trim() }),
        ...(payload.clientName !== undefined && { clientName: payload.clientName }),
        ...(payload.description !== undefined && { description: payload.description }),
      },
      select: { id: true, name: true, clientName: true, description: true },
    });
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payload." },
        { status: 400 }
      );
    }
    console.error("[projects/patch]", error);
    return NextResponse.json(
      { error: "The service is temporarily unavailable." },
      { status: 500 }
    );
  }
}
