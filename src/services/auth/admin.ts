/**
 * admin.ts
 *
 * Role-based authorization gate for /api/admin/* endpoints and any other
 * surface that should be limited to administrators. Built on top of
 * requireCurrentProfile() so the underlying session validation logic
 * stays in a single place.
 *
 * Throws ForbiddenError when an authenticated but non-admin profile is
 * the active session. Throws the same UNAUTHORIZED_PROFILE_SESSION
 * Error as requireCurrentProfile() when there is no session at all,
 * so route handlers can distinguish the two cases cleanly.
 */

import {
  requireCurrentProfile,
  UNAUTHORIZED_PROFILE_SESSION,
} from "@/services/auth/session";
import type { LocalProfile } from "@/services/auth/profile-store";

export const FORBIDDEN_ADMIN_REQUIRED = "FORBIDDEN_ADMIN_REQUIRED";

export class ForbiddenError extends Error {
  constructor(message: string = FORBIDDEN_ADMIN_REQUIRED) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function isAdmin(profile: { role?: string | null } | null | undefined): boolean {
  return profile?.role === "admin";
}

/**
 * Resolve the current profile and refuse if it isn't an admin. Throws
 * ForbiddenError (mapped to HTTP 403 by callers) when the user is
 * authenticated but lacks the role. Lets requireCurrentProfile() throw
 * for the "no session" case so the 401 / 403 distinction is preserved.
 */
export async function requireAdmin(): Promise<LocalProfile> {
  const profile = await requireCurrentProfile();
  if (!isAdmin(profile)) {
    throw new ForbiddenError();
  }
  return profile;
}

export { UNAUTHORIZED_PROFILE_SESSION };
