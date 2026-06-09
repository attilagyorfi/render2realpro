import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  FORBIDDEN_ADMIN_REQUIRED,
  ForbiddenError,
  requireAdmin,
} from "@/services/auth/admin";
import { UNAUTHORIZED_PROFILE_SESSION } from "@/services/auth/session";

/**
 * Map auth/authorization failures to the right HTTP status, log unknown
 * server-side failures, and return a generic message to the client so we
 * don't leak stack traces, file paths, or DB internals (see audit 8.2.1
 * for the original info-leak report).
 */
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

export async function GET() {
  try {
    await requireAdmin();
    const presets = await prisma.preset.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ presets });
  } catch (err) {
    return handleRouteError("admin-presets/list", err);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, description, category, settingsJson } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "name and category are required" },
        { status: 400 }
      );
    }

    const preset = await prisma.preset.create({
      data: {
        name,
        description: description ?? null,
        category,
        settingsJson:
          typeof settingsJson === "string"
            ? settingsJson
            : JSON.stringify(settingsJson ?? {}),
      },
    });

    return NextResponse.json({ preset }, { status: 201 });
  } catch (err) {
    return handleRouteError("admin-presets/create", err);
  }
}
