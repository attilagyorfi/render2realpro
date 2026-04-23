import { NextResponse } from "next/server";

import { getCurrentProfileFromSession } from "@/services/auth/session";

export async function GET() {
  const profile = await getCurrentProfileFromSession();

  if (!profile) {
    return NextResponse.json({ profile: null }, { status: 401 });
  }

  return NextResponse.json({ profile });
}
