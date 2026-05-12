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
 * profileOwnsProject) is unchanged so existing route handlers don't need
 * to migrate together with this module.
 */

import { prisma } from "@/lib/prisma";

export type LocalProfile = {
  id: string;
  email: string;
  name: string;
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
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

function userRowToProfile(row: UserRow): LocalProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastLoginAt: (row.lastLoginAt ?? row.updatedAt).toISOString(),
  };
}

export async function registerLocalProfile(input: {
  email: string;
  name: string;
}): Promise<LocalProfile> {
  const email = normalizeProfileEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new Error("A profile already exists with this email.");
  }

  const now = new Date();
  const created = await prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      lastLoginAt: now,
    },
  });

  return userRowToProfile(created);
}

export async function loginLocalProfile(input: {
  email: string;
}): Promise<LocalProfile> {
  const email = normalizeProfileEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    throw new Error("No profile was found with this email.");
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: { lastLoginAt: new Date() },
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
