import { NextResponse } from "next/server";
import { z } from "zod";

import { createProject, listProjects } from "@/features/projects/project-service";
import { ensureDefaultPresets } from "@/features/presets/preset-service";
import { serializeProject } from "@/features/projects/project-serializer";
import { requireCurrentProfile } from "@/services/auth/session";

const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(400).optional(),
  clientName: z.string().max(120).optional(),
});

export async function GET() {
  try {
    await ensureDefaultPresets();
  } catch {
    // Non-fatal: presets may already exist or DB may not be ready yet
  }
  try {
    const profile = await requireCurrentProfile();
    const projects = await listProjects(profile.id);
    return NextResponse.json({ projects: projects.map((project) => serializeProject(project)) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED_PROFILE_SESSION") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    console.error("[GET /api/projects]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireCurrentProfile();
    const payload = createProjectSchema.parse(await request.json());
    const project = await createProject(payload, profile.id);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED_PROFILE_SESSION") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    console.error("[POST /api/projects]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
