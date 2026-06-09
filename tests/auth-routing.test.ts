import { describe, expect, it } from "vitest";

import {
  hasLocalProfileSessionCookie,
  resolveAuthRedirect,
} from "@/services/auth/auth-routing";

describe("auth routing", () => {
  it("detects the local profile session cookie from the request header", () => {
    expect(
      hasLocalProfileSessionCookie(
        "foo=bar; render2real_profile_id=profile-1; theme=dark"
      )
    ).toBe(true);
    expect(hasLocalProfileSessionCookie("foo=bar; theme=dark")).toBe(false);
    expect(hasLocalProfileSessionCookie(null)).toBe(false);
  });

  it("redirects unauthenticated app requests to login", () => {
    expect(resolveAuthRedirect("/app", false)).toBe("/login");
    expect(resolveAuthRedirect("/app/projects/demo", false)).toBe("/login");
  });

  it("never redirects /login or /register away — even with a session cookie", () => {
    // Old behaviour bounced signed-in cookies to /app, but the middleware
    // can't verify the HMAC, so a stale cookie produced a redirect trap
    // (audit 8.4.1). The auth pages are now always reachable.
    expect(resolveAuthRedirect("/login", true)).toBeNull();
    expect(resolveAuthRedirect("/register", true)).toBeNull();
    expect(resolveAuthRedirect("/login", false)).toBeNull();
    expect(resolveAuthRedirect("/register", false)).toBeNull();
  });

  it("leaves public and already-correct requests alone", () => {
    expect(resolveAuthRedirect("/", false)).toBeNull();
    expect(resolveAuthRedirect("/preview", false)).toBeNull();
    expect(resolveAuthRedirect("/app", true)).toBeNull();
  });
});
