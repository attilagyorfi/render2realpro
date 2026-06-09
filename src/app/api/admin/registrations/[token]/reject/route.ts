import { NextResponse } from "next/server";

import { rejectByToken } from "@/services/auth/registration-approval";
import { approvalResponseHtml } from "@/services/auth/approval-response-html";

type Params = { token: string };

/**
 * GET /api/admin/registrations/[token]/reject — see ./approve/route.ts
 * for the design rationale. Same token, same one-shot single-use
 * semantics, just the opposite state transition.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  const { token } = await params;
  const result = await rejectByToken(token);

  if (result.ok) {
    return new NextResponse(
      approvalResponseHtml({ variant: "rejected", applicantName: result.name }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const variant =
    result.reason === "expired"
      ? "expired"
      : result.reason === "already_resolved"
        ? "already-resolved"
        : "not-found";
  const httpStatus = result.reason === "expired" ? 410 : 404;
  return new NextResponse(approvalResponseHtml({ variant }), {
    status: httpStatus,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
