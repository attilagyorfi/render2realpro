import { NextResponse } from "next/server";
import { z } from "zod";

import {
  EmailAlreadyTakenError,
  registerLocalProfile,
} from "@/services/auth/profile-store";
import { attachProfileSession } from "@/services/auth/session";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(request: Request) {
  try {
    const payload = registerSchema.parse(await request.json());
    const profile = await registerLocalProfile(payload);
    const response = NextResponse.json({ profile }, { status: 201 });
    return attachProfileSession(response, profile.id);
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
    // 8.2.1: raw stack traces, file paths, and Prisma internals were
    // appearing in the error toast). Log server-side, return generic.
    console.error("[auth/register]", error);
    return NextResponse.json(
      { error: "Registration is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
