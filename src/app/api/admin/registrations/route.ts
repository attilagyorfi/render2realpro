import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  FORBIDDEN_ADMIN_REQUIRED,
  ForbiddenError,
  requireAdmin,
} from "@/services/auth/admin";
import { UNAUTHORIZED_PROFILE_SESSION } from "@/services/auth/session";

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

/**
 * GET /api/admin/registrations
 *
 * Admin-only list of pending registrations, newest first. Drives the
 * "Függőben lévő regisztrációk" panel in the admin view.
 */
export async function GET() {
  try {
    await requireAdmin();
    const registrations = await prisma.user.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ registrations });
  } catch (err) {
    return handleRouteError("admin-registrations/list", err);
  }
}
