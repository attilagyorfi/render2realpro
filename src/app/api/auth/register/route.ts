import { NextResponse } from "next/server";
import { z } from "zod";

import {
  EmailAlreadyTakenError,
  registerLocalProfile,
} from "@/services/auth/profile-store";
import {
  checkRateLimit,
  clientIpFrom,
  registerFailure,
} from "@/services/auth/rate-limit";
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

// Each successful registration fires an email to the platform admin, so
// an unthrottled endpoint is a spam cannon. 3 registrations per IP per
// hour is generous for legitimate use (one office registering a few
// colleagues) while capping abuse.
const MAX_REGISTRATIONS_PER_WINDOW = 3;
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000;

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

    const rateKey = `register:${clientIpFrom(request)}`;
    const verdict = checkRateLimit(
      rateKey,
      MAX_REGISTRATIONS_PER_WINDOW,
      REGISTRATION_WINDOW_MS
    );
    if (!verdict.allowed) {
      return NextResponse.json(
        { error: "AUTH_RATE_LIMITED", retryAfterSeconds: verdict.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } }
      );
    }
    // Every accepted registration consumes one slot in the window —
    // unlike login, where only failures count.
    registerFailure(rateKey, REGISTRATION_WINDOW_MS);

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
