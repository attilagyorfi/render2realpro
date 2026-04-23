export function hasLocalProfileSessionCookie(cookieHeader: string | null | undefined) {
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .some((part) => part.startsWith("render2real_profile_id="));
}

export function resolveAuthRedirect(pathname: string, hasSession: boolean) {
  if (pathname.startsWith("/app")) {
    return hasSession ? null : "/login";
  }

  if (pathname === "/login" || pathname === "/register") {
    return hasSession ? "/app" : null;
  }

  return null;
}
