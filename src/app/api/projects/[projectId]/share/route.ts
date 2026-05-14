import crypto from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { profileOwnsProject } from "@/services/auth/profile-store";
import { requireCurrentProfile } from "@/services/auth/session";

type Params = { projectId: string };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const shareCreateSchema = z.object({
  // Days until the link expires. Omit (or null) for "never expires".
  expiresInDays: z.number().int().positive().max(365).optional(),
});

/**
 * POST /api/projects/:projectId/share — generate or regenerate the share
 * token. Resets the view counter to 0 because previous URLs are no longer
 * valid, and (optionally) sets an expiry window.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const profile = await requireCurrentProfile();
    const { projectId } = await params;

    if (!(await profileOwnsProject(profile.id, projectId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Body is optional; accept an empty request.
    let parsed: z.infer<typeof shareCreateSchema> = {};
    try {
      const body = await request.json();
      parsed = shareCreateSchema.parse(body ?? {});
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: error.issues[0]?.message ?? "Invalid payload" },
          { status: 400 }
        );
      }
      // Empty / non-JSON body is fine.
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = parsed.expiresInDays
      ? new Date(Date.now() + parsed.expiresInDays * MS_PER_DAY)
      : null;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        shareToken: token,
        shareTokenExpiresAt: expiresAt,
        shareTokenViewCount: 0,
      },
      select: {
        id: true,
        name: true,
        shareToken: true,
        shareTokenExpiresAt: true,
        shareTokenViewCount: true,
      },
    });

    return NextResponse.json({
      shareToken: project.shareToken,
      shareTokenExpiresAt: project.shareTokenExpiresAt,
      shareTokenViewCount: project.shareTokenViewCount,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED_PROFILE_SESSION") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[share-create]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/:projectId/share — revoke the share token by clearing
 * all share-related fields. The next public request with the old token will
 * see no project under that shareToken and 404 out.
 */
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
      data: {
        shareToken: null,
        shareTokenExpiresAt: null,
        shareTokenViewCount: 0,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED_PROFILE_SESSION") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[share-revoke]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
