/**
 * Coarse, header-only check used by the edge middleware to decide whether
 * to redirect. The actual session validity (HMAC + expiry) is enforced
 * server-side in getCurrentProfileFromSession(); this helper only answers
 * "did the user ever sign in here" by looking for a non-empty cookie value.
 */
export function hasLocalProfileSessionCookie(cookieHeader: string | null | undefined) {
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .some((part) => {
      if (!part.startsWith("render2real_profile_id=")) return false;
      const value = part.slice("render2real_profile_id=".length);
      return value.length > 0;
    });
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
