import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentProfile } from "@/services/auth/session";

async function requireAdmin() {
  const profile = await requireCurrentProfile();
  return profile; // In future, check profile.role === "admin"
}

export async function GET() {
  try {
    await requireAdmin();
    const presets = await prisma.preset.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ presets });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, description, category, settingsJson } = body;

    if (!name || !category) {
      return NextResponse.json({ error: "name and category are required" }, { status: 400 });
    }

    const preset = await prisma.preset.create({
      data: {
        name,
        description: description ?? null,
        category,
        settingsJson: typeof settingsJson === "string" ? settingsJson : JSON.stringify(settingsJson ?? {}),
      },
    });

    return NextResponse.json({ preset }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
