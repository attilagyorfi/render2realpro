import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  hasLocalProfileSessionCookie,
  resolveAuthRedirect,
} from "@/services/auth/auth-routing";

export function proxy(request: NextRequest) {
  const hasSession = hasLocalProfileSessionCookie(
    request.headers.get("cookie")
  );
  const redirectPath = resolveAuthRedirect(request.nextUrl.pathname, hasSession);

  if (!redirectPath) {
    return NextResponse.next();
  }

  const redirectUrl = new URL(redirectPath, request.url);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/app/:path*", "/login", "/register"],
};
