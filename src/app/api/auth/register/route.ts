import { NextResponse } from "next/server";
import { z } from "zod";

import {
  EmailAlreadyTakenError,
  registerLocalProfile,
} from "@/services/auth/profile-store";
import { sendEmail } from "@/services/email/email-service";
import {
  buildAdminNotification,
  buildApplicantConfirmation,
} from "@/services/email/email-templates";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

/**
 * POST /api/auth/register
 *
 * Sprint E / Munkacsomag 2: registration is now a two-step process. We
 * create the user as `pending`, mint a single-use approval token, and
 * send two emails (one to the admin with approve/reject links, one to
 * the applicant confirming we got their request). The applicant cannot
 * sign in until an admin clicks Approve.
 *
 * The route deliberately does NOT attach a session on success — the
 * pending status would refuse the next /api/auth/session check anyway,
 * and the client UI explicitly renders a "we'll be in touch" panel.
 */
export async function POST(request: Request) {
  try {
    const payload = registerSchema.parse(await request.json());
    const { profile, approvalToken } = await registerLocalProfile(payload);

    // Fire both emails in parallel. Failures are logged but don't fail
    // the registration — the pending row is in the DB and the admin
    // can find it via /app/admin even if SMTP is down.
    await Promise.all([
      sendEmail(
        buildAdminNotification({
          applicantName: profile.name,
          applicantEmail: profile.email,
          approvalToken,
        })
      ),
      sendEmail(
        buildApplicantConfirmation({
          applicantName: profile.name,
          applicantEmail: profile.email,
        })
      ),
    ]);

    // Strip the token from the response — the client never needs it.
    return NextResponse.json({ profile, pending: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid registration payload." },
        { status: 400 }
      );
    }

    if (error instanceof EmailAlreadyTakenError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    // Anything else — DB connection failure, Prisma errors, unexpected
    // exceptions — must not leak its message to the client (see audit
    // 8.2.1). Log server-side, return generic.
    console.error("[auth/register]", error);
    return NextResponse.json(
      { error: "Registration is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
