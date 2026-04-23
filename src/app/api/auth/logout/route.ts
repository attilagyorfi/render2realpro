import { NextResponse } from "next/server";

import { clearProfileSession } from "@/services/auth/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearProfileSession(response);
}
