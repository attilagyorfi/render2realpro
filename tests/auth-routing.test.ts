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

  it("redirects authenticated auth-page requests into the app", () => {
    expect(resolveAuthRedirect("/login", true)).toBe("/app");
    expect(resolveAuthRedirect("/register", true)).toBe("/app");
  });

  it("leaves public and already-correct requests alone", () => {
    expect(resolveAuthRedirect("/", false)).toBeNull();
    expect(resolveAuthRedirect("/preview", false)).toBeNull();
    expect(resolveAuthRedirect("/app", true)).toBeNull();
    expect(resolveAuthRedirect("/login", false)).toBeNull();
  });
});
