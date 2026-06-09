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

/**
 * Decide whether the middleware should redirect this request. Two rules:
 *
 *   - On any /app/* route with no session cookie at all → send to /login.
 *     A stale/invalid cookie is allowed through; the server-side guard
 *     in AppFrame validates the HMAC and shows the sign-in card if the
 *     session is rejected.
 *
 *   - On /login or /register → always allow. The previous behaviour
 *     ("if the user has a session cookie, send them to /app") created
 *     an infinite redirect trap for anyone with a stale cookie, because
 *     the cookie was never validated at the middleware level (audit
 *     8.4.1). Letting the auth pages render unconditionally is safer:
 *     a genuinely signed-in user can still sign in again harmlessly,
 *     and a user with an expired cookie can recover the flow.
 */
export function resolveAuthRedirect(pathname: string, hasSession: boolean) {
  if (pathname.startsWith("/app")) {
    return hasSession ? null : "/login";
  }

  // /login and /register are always reachable. No more
  // "you-have-a-cookie-so-you-go-to-/app" forced redirect.
  return null;
}
