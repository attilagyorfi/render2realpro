import { NextResponse } from "next/server";
import { z } from "zod";

import { loginLocalProfile } from "@/services/auth/profile-store";
import { attachProfileSession } from "@/services/auth/session";

const loginSchema = z.object({
  email: z.string().email(),
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

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed." },
      { status: 400 }
    );
  }
}
