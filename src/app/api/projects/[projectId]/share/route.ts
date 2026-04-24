import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentProfile } from "@/services/auth/session";
import { profileOwnsProject } from "@/services/auth/profile-store";
import crypto from "node:crypto";

type Params = { projectId: string };

/** POST — generate (or regenerate) a share token */
export async function POST(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const profile = await requireCurrentProfile();
    const { projectId } = await params;

    if (!(await profileOwnsProject(profile.id, projectId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { shareToken: token },
      select: { id: true, name: true, shareToken: true },
    });

    return NextResponse.json({ shareToken: project.shareToken });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** DELETE — revoke the share token */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const profile = await requireCurrentProfile();
    const { projectId } = await params;

    if (!(await profileOwnsProject(profile.id, projectId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { shareToken: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
