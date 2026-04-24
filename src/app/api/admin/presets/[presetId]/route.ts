import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentProfile } from "@/services/auth/session";

type Params = { presetId: string };

async function requireAdmin() {
  const profile = await requireCurrentProfile();
  return profile;
}

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    await requireAdmin();
    const { presetId } = await params;
    const preset = await prisma.preset.findUnique({ where: { id: presetId } });
    if (!preset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ preset });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
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
          settingsJson: typeof settingsJson === "string" ? settingsJson : JSON.stringify(settingsJson),
        }),
      },
    });

    return NextResponse.json({ preset });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    await requireAdmin();
    const { presetId } = await params;
    await prisma.preset.delete({ where: { id: presetId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
