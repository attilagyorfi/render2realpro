import { NextResponse } from "next/server";

import { serializeProject } from "@/features/projects/project-serializer";
import { getProjectDetail } from "@/features/projects/project-service";
import { getPresets } from "@/features/presets/preset-service";
import { requireCurrentProfile } from "@/services/auth/session";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

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
