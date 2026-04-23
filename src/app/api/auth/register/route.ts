import { NextResponse } from "next/server";
import { z } from "zod";

import { registerLocalProfile } from "@/services/auth/profile-store";
import { attachProfileSession } from "@/services/auth/session";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
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

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed." },
      { status: 400 }
    );
  }
}
