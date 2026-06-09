/**
 * profile-store.ts
 *
 * Profile persistence has moved from a JSON file under
 * `<storageRoot>/system/profiles.json` to the SQLite database (User table)
 * so that ownership and project records share a single source of truth and
 * benefit from foreign-key constraints.
 *
 * The pure helper functions at the top of this file (createProfileState,
 * findProfileByEmail, assignProjectToProfileState, profileOwnsProjectState,
 * normalizeProfileEmail) are retained so their unit tests still run and so
 * any code that wants to reason about a state snapshot in memory still can.
 *
 * The public I/O surface (registerLocalProfile, loginLocalProfile,
 * getProfileById, assignProjectToProfile, listProjectIdsForProfile,
 * profileOwnsProject) keeps its function names so existing route handlers
 * don't need to migrate together with this module — but registerLocalProfile
 * and loginLocalProfile now require a password argument (bcrypt-hashed at
 * rest).
 */

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Generic credential-failure error. Identical message for "user not found"
 * and "wrong password" so the API doesn't leak whether an email is
 * registered.
 */
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

/**
 * Thrown when registration is attempted with an email that already has
 * a profile. The message is intentionally safe to surface back to the
 * caller — no stack frames, no DB internals.
 */
export class EmailAlreadyTakenError extends Error {
  constructor() {
    super("A profile already exists with this email.");
    this.name = "EmailAlreadyTakenError";
  }
}

function assertPasswordPolicy(password: string): void {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

export async function hashPassword(plain: string): Promise<string> {
  assertPasswordPolicy(plain);
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  if (typeof plain !== "string" || typeof hash !== "string" || !hash) return false;
  return bcrypt.compare(plain, hash);
}

export type LocalProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
};

export type ProjectOwnership = {
  profileId: string;
  projectId: string;
};

/**
 * In-memory snapshot of profiles + project ownership. Retained for the
 * pure-function unit tests; not used by the application's hot path.
 */
export type ProfileStoreState = {
  profiles: LocalProfile[];
  projectOwnerships: ProjectOwnership[];
};

// ─── Pure helpers (unit-testable, no I/O) ──────────────────────────────────

export function createProfileState(
  overrides?: Partial<ProfileStoreState>
): ProfileStoreState {
  return {
    profiles: overrides?.profiles ?? [],
    projectOwnerships: overrides?.projectOwnerships ?? [],
  };
}

export function normalizeProfileEmail(email: string) {
  return email.trim().toLowerCase();
}

export function findProfileByEmail(state: ProfileStoreState, email: string) {
  const normalizedEmail = normalizeProfileEmail(email);
  return state.profiles.find((profile) => profile.email === normalizedEmail);
}

export function assignProjectToProfileState(
  state: ProfileStoreState,
  input: ProjectOwnership
) {
  const projectOwnerships = [
    ...state.projectOwnerships.filter(
      (ownership) => ownership.projectId !== input.projectId
    ),
    input,
  ];

  return {
    ...state,
    projectOwnerships,
  };
}

export function profileOwnsProjectState(
  state: ProfileStoreState,
  profileId: string,
  projectId: string
) {
  return state.projectOwnerships.some(
    (ownership) =>
      ownership.profileId === profileId && ownership.projectId === projectId
  );
}

// ─── DB-backed implementations ─────────────────────────────────────────────

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

function userRowToProfile(row: UserRow): LocalProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastLoginAt: (row.lastLoginAt ?? row.updatedAt).toISOString(),
  };
}

export async function registerLocalProfile(input: {
  email: string;
  name: string;
  password: string;
}): Promise<LocalProfile> {
  assertPasswordPolicy(input.password);
  const email = normalizeProfileEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new EmailAlreadyTakenError();
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const created = await prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      passwordHash,
      lastLoginAt: now,
    },
  });

  return userRowToProfile(created);
}

/**
 * Sign in by email + password. Returns the profile on success, throws
 * InvalidCredentialsError on either unknown email or wrong password.
 *
 * Users migrated from the legacy JSON profile store have passwordHash =
 * null. We treat the *first* login as a password-setup step for that
 * user: the supplied password is hashed and stored, then the user is
 * signed in. Subsequent logins go through the usual compare path.
 */
export async function loginLocalProfile(input: {
  email: string;
  password: string;
}): Promise<LocalProfile> {
  assertPasswordPolicy(input.password);
  const email = normalizeProfileEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    throw new InvalidCredentialsError();
  }

  let passwordHash = existing.passwordHash;

  if (passwordHash === null) {
    // Legacy migration: set the password on first login.
    passwordHash = await hashPassword(input.password);
  } else {
    const ok = await verifyPassword(input.password, passwordHash);
    if (!ok) throw new InvalidCredentialsError();
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: { passwordHash, lastLoginAt: new Date() },
  });

  return userRowToProfile(updated);
}

export async function getProfileById(
  profileId: string
): Promise<LocalProfile | undefined> {
  const row = await prisma.user.findUnique({ where: { id: profileId } });
  return row ? userRowToProfile(row) : undefined;
}

export async function assignProjectToProfile(
  input: ProjectOwnership
): Promise<void> {
  // Verify both ends exist before linking so we surface a clear error rather
  // than rely on a foreign-key violation deep inside Prisma.
  const [user, project] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.profileId } }),
    prisma.project.findUnique({ where: { id: input.projectId } }),
  ]);

  if (!user) throw new Error(`Profile not found: ${input.profileId}`);
  if (!project) throw new Error(`Project not found: ${input.projectId}`);

  await prisma.project.update({
    where: { id: input.projectId },
    data: { userId: input.profileId },
  });
}

export async function listProjectIdsForProfile(
  profileId: string
): Promise<string[]> {
  const projects = await prisma.project.findMany({
    where: { userId: profileId },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  return projects.map((project) => project.id);
}

export async function profileOwnsProject(
  profileId: string,
  projectId: string
): Promise<boolean> {
  const match = await prisma.project.findFirst({
    where: { id: projectId, userId: profileId },
    select: { id: true },
  });
  return match !== null;
}
