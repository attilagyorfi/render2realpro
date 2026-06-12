import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AccountPendingError,
  AccountRejectedError,
  InvalidCredentialsError,
  loginLocalProfile,
  normalizeProfileEmail,
} from "@/services/auth/profile-store";
import {
  checkRateLimit,
  clearFailures,
  clientIpFrom,
  registerFailure,
} from "@/services/auth/rate-limit";
import { attachProfileSession } from "@/services/auth/session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

// 5 failed attempts per (IP, email) pair within 15 minutes → locked out
// for the remainder of the window. Successful sign-in clears the counter.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  let rateKey: string | null = null;
  try {
    const payload = loginSchema.parse(await request.json());
    rateKey = `login:${clientIpFrom(request)}:${normalizeProfileEmail(payload.email)}`;

    const verdict = checkRateLimit(rateKey, MAX_FAILURES, WINDOW_MS);
    if (!verdict.allowed) {
      return NextResponse.json(
        { error: "AUTH_RATE_LIMITED", retryAfterSeconds: verdict.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } }
      );
    }

    const profile = await loginLocalProfile(payload);
    clearFailures(rateKey);
    const response = NextResponse.json({ profile });
    return attachProfileSession(response, profile.id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid login payload." },
        { status: 400 }
      );
    }

    if (error instanceof InvalidCredentialsError) {
      // Only genuine credential failures count toward the lockout —
      // pending/rejected statuses below already require a correct
      // password, so counting them would punish legitimate users.
      if (rateKey) registerFailure(rateKey, WINDOW_MS);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Status-specific 403s. These only ever fire after the password
    // already matched — see loginLocalProfile() for the rationale.
    if (error instanceof AccountPendingError) {
      return NextResponse.json(
        { error: "AUTH_ACCOUNT_PENDING" },
        { status: 403 }
      );
    }
    if (error instanceof AccountRejectedError) {
      return NextResponse.json(
        { error: "AUTH_ACCOUNT_REJECTED" },
        { status: 403 }
      );
    }

    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
