import { describe, expect, it } from "vitest";

import {
  assignProjectToProfileState,
  createProfileState,
  findProfileByEmail,
  normalizeProfileEmail,
  profileOwnsProjectState,
} from "@/services/auth/profile-store";

describe("profile store helpers", () => {
  it("normalizes email addresses for consistent login matching", () => {
    expect(normalizeProfileEmail("  Demo@Example.com ")).toBe("demo@example.com");
  });

  it("creates a profile and prevents duplicate registration by email", () => {
    const state = createProfileState();
    const created = findProfileByEmail(state, "demo@example.com");

    expect(created).toBeUndefined();

    const nextState = createProfileState({
      profiles: [
        {
          id: "profile-1",
          email: "demo@example.com",
          name: "Demo User",
          createdAt: "2026-04-23T10:00:00.000Z",
          updatedAt: "2026-04-23T10:00:00.000Z",
          lastLoginAt: "2026-04-23T10:00:00.000Z",
        },
      ],
    });

    expect(findProfileByEmail(nextState, " Demo@Example.com " )?.id).toBe("profile-1");
  });

  it("assigns projects to profiles and resolves ownership checks", () => {
    const state = assignProjectToProfileState(
      {
        profiles: [],
        projectOwnerships: [],
      },
      {
        profileId: "profile-1",
        projectId: "project-1",
      }
    );

    expect(profileOwnsProjectState(state, "profile-1", "project-1")).toBe(true);
    expect(profileOwnsProjectState(state, "profile-2", "project-1")).toBe(false);
  });
});
