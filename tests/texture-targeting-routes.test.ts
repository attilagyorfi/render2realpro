import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCurrentProfile = vi.fn();
const profileOwnsProject = vi.fn();
const imageAssetFindUnique = vi.fn();
const createMockTextureSelection = vi.fn();
const createTexturePreview = vi.fn();
const applyTexturePass = vi.fn();

vi.mock("@/services/auth/session", () => ({
  requireCurrentProfile,
}));

vi.mock("@/services/auth/profile-store", () => ({
  profileOwnsProject,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    imageAsset: {
      findUnique: imageAssetFindUnique,
    },
  },
}));

vi.mock("@/services/texture-targeting/texture-targeting-service", async () => {
  const actual = await vi.importActual<typeof import("@/services/texture-targeting/texture-targeting-service")>(
    "@/services/texture-targeting/texture-targeting-service"
  );

  return {
    ...actual,
    createMockTextureSelection,
  };
});

vi.mock("@/services/texture-targeting/texture-targeting-job-service", () => ({
  createTexturePreview,
  applyTexturePass,
}));

describe("texture targeting routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects selection requests when no session profile is available", async () => {
    requireCurrentProfile.mockRejectedValue(new Error("UNAUTHORIZED_PROFILE_SESSION"));

    const { POST } = await import("@/app/api/texture-targeting/select/route");
    const response = (await POST(
      new Request("http://localhost/api/texture-targeting/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageAssetId: "asset-1",
          selectionMode: "click-select",
          selectionInput: { x: 0.3, y: 0.4 },
          materialPreset: "concrete",
          preserveGeometry: true,
          preserveLighting: true,
          preserveSurroundings: true,
        }),
      })
    )) as Response;

    expect(response.status).toBe(401);
  });

  it("returns a mock selection preview for authorized requests", async () => {
    requireCurrentProfile.mockResolvedValue({ id: "profile-1" });
    imageAssetFindUnique.mockResolvedValue({ id: "asset-1", projectId: "project-1" });
    profileOwnsProject.mockResolvedValue(true);
    createMockTextureSelection.mockReturnValue({
      mask: {
        id: "asset-1-click-select-mask",
        selectionMode: "click-select",
        bounds: { x: 0.2, y: 0.3, width: 0.24, height: 0.18 },
        coverage: 0.043,
      },
      previewLabel: "Click Select preview",
      message: "Selection preview prepared.",
    });

    const { POST } = await import("@/app/api/texture-targeting/select/route");
    const response = (await POST(
      new Request("http://localhost/api/texture-targeting/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageAssetId: "asset-1",
          selectionMode: "click-select",
          selectionInput: { x: 0.3, y: 0.4 },
          materialPreset: "concrete",
          preserveGeometry: true,
          preserveLighting: true,
          preserveSurroundings: true,
        }),
      })
    )) as Response;

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        selection: expect.objectContaining({
          previewLabel: "Click Select preview",
        }),
      })
    );
  });

  it("persists a texture pass on apply for authorized requests", async () => {
    requireCurrentProfile.mockResolvedValue({ id: "profile-1" });
    imageAssetFindUnique.mockResolvedValue({ id: "asset-1", projectId: "project-1" });
    profileOwnsProject.mockResolvedValue(true);
    applyTexturePass.mockResolvedValue({
      generationLogId: "log-1",
      imageVersionId: "version-1",
      versionType: "texture_pass",
      status: "completed",
      message: "Texture pass saved.",
    });

    const { POST } = await import("@/app/api/texture-targeting/apply/route");
    const response = (await POST(
      new Request("http://localhost/api/texture-targeting/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageAssetId: "asset-1",
          selectionMode: "click-select",
          selectionInput: { x: 0.3, y: 0.4 },
          materialPreset: "glass",
          preserveGeometry: true,
          preserveLighting: true,
          preserveSurroundings: true,
          selectionMask: {
            id: "asset-1-click-select-mask",
            selectionMode: "click-select",
            bounds: { x: 0.2, y: 0.3, width: 0.24, height: 0.18 },
            coverage: 0.043,
          },
        }),
      })
    )) as Response;

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        texturePass: expect.objectContaining({
          imageVersionId: "version-1",
          versionType: "texture_pass",
        }),
      })
    );
  });
});
