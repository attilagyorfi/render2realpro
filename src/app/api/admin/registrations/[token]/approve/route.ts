import { NextResponse } from "next/server";

import { approveByToken } from "@/services/auth/registration-approval";
import { approvalResponseHtml } from "@/services/auth/approval-response-html";

type Params = { token: string };

/**
 * GET /api/admin/registrations/[token]/approve
 *
 * Email-link entry point: the admin clicks the Approve button in the
 * notification email, which links here with the single-use token in
 * the path. Authorization is the token itself — admin-only by virtue
 * of the email landing in the admin's inbox.
 *
 * Returns a tiny standalone HTML page so the admin's browser doesn't
 * land on a raw JSON blob or a fully-loaded Next.js app shell.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  const { token } = await params;
  const result = await approveByToken(token);

  if (result.ok) {
    return new NextResponse(
      approvalResponseHtml({ variant: "approved", applicantName: result.name }),
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
