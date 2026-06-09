import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  FORBIDDEN_ADMIN_REQUIRED,
  ForbiddenError,
  requireAdmin,
} from "@/services/auth/admin";
import { UNAUTHORIZED_PROFILE_SESSION } from "@/services/auth/session";

type Params = { presetId: string };

function handleRouteError(scope: string, err: unknown): NextResponse {
  if (err instanceof Error) {
    if (err.message === UNAUTHORIZED_PROFILE_SESSION) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof ForbiddenError || err.message === FORBIDDEN_ADMIN_REQUIRED) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  console.error(`[${scope}]`, err);
  return NextResponse.json(
    { error: "The service is temporarily unavailable." },
    { status: 500 }
  );
}

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    await requireAdmin();
    const { presetId } = await params;
    const preset = await prisma.preset.findUnique({ where: { id: presetId } });
    if (!preset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ preset });
  } catch (err) {
    return handleRouteError("admin-presets/get", err);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<Params> }) {
  try {
    await requireAdmin();
    const { presetId } = await params;
    const body = await request.json();
    const { name, description, category, settingsJson } = body;

    const preset = await prisma.preset.update({
      where: { id: presetId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(settingsJson !== undefined && {
          settingsJson:
            typeof settingsJson === "string"
              ? settingsJson
              : JSON.stringify(settingsJson),
        }),
      },
    });

    return NextResponse.json({ preset });
  } catch (err) {
    return handleRouteError("admin-presets/update", err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    await requireAdmin();
    const { presetId } = await params;
    await prisma.preset.delete({ where: { id: presetId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError("admin-presets/delete", err);
  }
}
