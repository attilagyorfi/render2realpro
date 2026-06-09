import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { appEnv } from "@/config/env";
import { getProfileById } from "@/services/auth/profile-store";
import {
  SESSION_MAX_AGE_SECONDS,
  buildSessionCookieValue,
  verifySessionCookieValue,
} from "@/services/auth/signed-session";

export const AUTH_SESSION_COOKIE = "render2real_profile_id";
export const UNAUTHORIZED_PROFILE_SESSION = "UNAUTHORIZED_PROFILE_SESSION";

function baseCookieOptions() {
  return {
    name: AUTH_SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: appEnv.isProduction,
    path: "/",
  };
}

/**
 * Resolve the current profile from the request's session cookie. The
 * cookie value must carry a valid HMAC and have not yet expired; otherwise
 * we return null so the caller can treat the request as anonymous.
 */
export async function getCurrentProfileFromSession() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const verified = verifySessionCookieValue(cookieValue);

  if (!verified) {
    return null;
  }

  return getProfileById(verified.userId);
}

export async function requireCurrentProfile() {
  const profile = await getCurrentProfileFromSession();

  if (!profile) {
    throw new Error(UNAUTHORIZED_PROFILE_SESSION);
  }

  return profile;
}

/**
 * Issue a signed session cookie for the given profile. The cookie binds
 * userId + expiry under an HMAC so it cannot be forged or extended client
 * side. `secure` is set in production so the cookie never leaves over HTTP.
 */
export function attachProfileSession(response: NextResponse, profileId: string) {
  response.cookies.set({
    ...baseCookieOptions(),
    value: buildSessionCookieValue(profileId),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}

export function clearProfileSession(response: NextResponse) {
  response.cookies.set({
    ...baseCookieOptions(),
    value: "",
    maxAge: 0,
  });

  return response;
}
