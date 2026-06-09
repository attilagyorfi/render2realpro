import { NextResponse } from "next/server";

import {
  FORBIDDEN_ADMIN_REQUIRED,
  ForbiddenError,
  requireAdmin,
} from "@/services/auth/admin";
import { approveByUserId } from "@/services/auth/registration-approval";
import { UNAUTHORIZED_PROFILE_SESSION } from "@/services/auth/session";

type Params = { userId: string };

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
 * POST /api/admin/registrations/by-id/[userId]/approve
 *
 * Companion to the email-link approve endpoint. Same state transition,
 * but addressed by the user's id (admin-only). Drives the
 * "Jóváhagyom" button in the admin pending list.
 *
 * Routed under /by-id/ so the [userId] dynamic segment doesn't collide
 * with [token] under /api/admin/registrations/[token]/approve.
 */
export async function POST(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    await requireAdmin();
    const { userId } = await params;
    const result = await approveByUserId(userId);

    if (result.ok) {
      return NextResponse.json({ ok: true, userId: result.userId });
    }
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Registration already resolved." }, { status: 409 });
  } catch (err) {
    return handleRouteError("admin-registrations/approve", err);
  }
}
