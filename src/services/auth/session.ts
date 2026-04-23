import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getProfileById } from "@/services/auth/profile-store";

export const AUTH_SESSION_COOKIE = "render2real_profile_id";

export async function getCurrentProfileFromSession() {
  const cookieStore = await cookies();
  const profileId = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  if (!profileId) {
    return null;
  }

  return getProfileById(profileId);
}

export async function requireCurrentProfile() {
  const profile = await getCurrentProfileFromSession();

  if (!profile) {
    throw new Error("UNAUTHORIZED_PROFILE_SESSION");
  }

  return profile;
}

export function attachProfileSession(response: NextResponse, profileId: string) {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: profileId,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export function clearProfileSession(response: NextResponse) {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
