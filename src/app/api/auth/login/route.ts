import { NextResponse } from "next/server";
import { z } from "zod";

import {
  InvalidCredentialsError,
  loginLocalProfile,
} from "@/services/auth/profile-store";
import { attachProfileSession } from "@/services/auth/session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const profile = await loginLocalProfile(payload);
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
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Log unexpected errors server-side; return generic to the client
    // so DB internals / stack traces don't leak (see audit 8.2.1).
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
