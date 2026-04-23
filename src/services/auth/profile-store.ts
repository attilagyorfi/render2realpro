import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { appEnv } from "@/config/env";

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

export type ProfileStoreState = {
  profiles: LocalProfile[];
  projectOwnerships: ProjectOwnership[];
};

const DEFAULT_STATE: ProfileStoreState = {
  profiles: [],
  projectOwnerships: [],
};

function getProfileStorePath() {
  return path.join(appEnv.storageRoot, "system", "profiles.json");
}

async function ensureProfileStoreRoot() {
  await mkdir(path.dirname(getProfileStorePath()), { recursive: true });
}

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

export async function readProfileStoreState(): Promise<ProfileStoreState> {
  await ensureProfileStoreRoot();

  try {
    const raw = await readFile(getProfileStorePath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<ProfileStoreState>;

    return createProfileState({
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      projectOwnerships: Array.isArray(parsed.projectOwnerships)
        ? parsed.projectOwnerships
        : [],
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await writeProfileStoreState(DEFAULT_STATE);
      return DEFAULT_STATE;
    }

    throw error;
  }
}

export async function writeProfileStoreState(state: ProfileStoreState) {
  await ensureProfileStoreRoot();
  await writeFile(getProfileStorePath(), JSON.stringify(state, null, 2), "utf-8");
}

export async function registerLocalProfile(input: { email: string; name: string }) {
  const state = await readProfileStoreState();
  const existing = findProfileByEmail(state, input.email);

  if (existing) {
    throw new Error("A profile already exists with this email.");
  }

  const now = new Date().toISOString();
  const profile: LocalProfile = {
    id: crypto.randomUUID(),
    email: normalizeProfileEmail(input.email),
    name: input.name.trim(),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  await writeProfileStoreState({
    ...state,
    profiles: [profile, ...state.profiles],
  });

  return profile;
}

export async function loginLocalProfile(input: { email: string }) {
  const state = await readProfileStoreState();
  const existing = findProfileByEmail(state, input.email);

  if (!existing) {
    throw new Error("No profile was found with this email.");
  }

  const nextProfile = {
    ...existing,
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  await writeProfileStoreState({
    ...state,
    profiles: state.profiles.map((profile) =>
      profile.id === nextProfile.id ? nextProfile : profile
    ),
  });

  return nextProfile;
}

export async function getProfileById(profileId: string) {
  const state = await readProfileStoreState();
  return state.profiles.find((profile) => profile.id === profileId);
}

export async function assignProjectToProfile(input: ProjectOwnership) {
  const state = await readProfileStoreState();
  const nextState = assignProjectToProfileState(state, input);
  await writeProfileStoreState(nextState);
}

export async function listProjectIdsForProfile(profileId: string) {
  const state = await readProfileStoreState();
  return state.projectOwnerships
    .filter((ownership) => ownership.profileId === profileId)
    .map((ownership) => ownership.projectId);
}

export async function profileOwnsProject(profileId: string, projectId: string) {
  const state = await readProfileStoreState();
  return profileOwnsProjectState(state, profileId, projectId);
}
