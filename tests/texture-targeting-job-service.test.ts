import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  imageAsset: {
    findUnique: vi.fn(),
  },
  generationLog: {
    create: vi.fn(),
    update: vi.fn(),
  },
  imageVersion: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("texture targeting job service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a mock preview payload without persisting an image version", async () => {
    const { createTexturePreview } = await import(
      "@/services/texture-targeting/texture-targeting-job-service"
    );

    const preview = await createTexturePreview({
      imageAssetId: "asset-1",
      selectionMode: "click-select",
      selectionInput: { x: 0.52, y: 0.48 },
      materialPreset: "glass",
      customMaterialPrompt: "reflective curtain wall",
      preserveGeometry: true,
      preserveLighting: true,
      preserveSurroundings: true,
      selectionMask: {
        id: "asset-1-click-select-mask",
        selectionMode: "click-select",
        bounds: { x: 0.4, y: 0.34, width: 0.24, height: 0.18 },
        coverage: 0.043,
      },
    });

    expect(preview.status).toBe("ready");
    expect(preview.previewVersionId).toContain("preview-asset-1");
    expect(prismaMock.imageVersion.create).not.toHaveBeenCalled();
  });

  it("stores a texture_pass image version and a texture_targeting log on apply", async () => {
    prismaMock.imageAsset.findUnique.mockResolvedValue({
      id: "asset-1",
      projectId: "project-1",
      originalFileName: "factory.png",
      storedFilePath: "storage/project-1/factory.png",
    });
    prismaMock.generationLog.create.mockResolvedValue({
      id: "log-1",
    });
    prismaMock.imageVersion.create.mockResolvedValue({
      id: "version-1",
    });
    prismaMock.generationLog.update.mockResolvedValue({
      id: "log-1",
    });

    const { applyTexturePass } = await import(
      "@/services/texture-targeting/texture-targeting-job-service"
    );

    const result = await applyTexturePass({
      imageAssetId: "asset-1",
      selectionMode: "brush-mask",
      selectionInput: {
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.32, y: 0.45 },
          { x: 0.44, y: 0.36 },
        ],
      },
      materialPreset: "wood",
      customMaterialPrompt: "thermowood cladding",
      preserveGeometry: true,
      preserveLighting: true,
      preserveSurroundings: true,
      selectionMask: {
        id: "asset-1-brush-mask-mask",
        selectionMode: "brush-mask",
        bounds: { x: 0.1, y: 0.2, width: 0.34, height: 0.25 },
        coverage: 0.085,
      },
    });

    expect(prismaMock.generationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageAssetId: "asset-1",
          providerName: "mock-texture-targeting",
          jobType: "texture_targeting",
        }),
      })
    );
    expect(prismaMock.imageVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageAssetId: "asset-1",
          versionType: "texture_pass",
          filePath: "storage/project-1/factory.png",
        }),
      })
    );
    expect(result.versionType).toBe("texture_pass");
    expect(result.imageVersionId).toBe("version-1");
  });
});
