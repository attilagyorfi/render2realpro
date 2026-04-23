import { storagePathToApiPath } from "@/services/storage/file-url";

type SerializableRecord = Record<string, unknown>;

function serializeVersion(version: SerializableRecord) {
  return {
    ...version,
    fileUrl:
      typeof version.filePath === "string"
        ? storagePathToApiPath(version.filePath)
        : undefined,
  };
}

function serializeAsset(asset: SerializableRecord) {
  const imageVersions = Array.isArray(asset.imageVersions)
    ? asset.imageVersions.map((version) =>
        serializeVersion(version as SerializableRecord)
      )
    : [];

  return {
    ...asset,
    previewUrl:
      typeof asset.previewPath === "string"
        ? storagePathToApiPath(asset.previewPath)
        : undefined,
    storedFileUrl:
      typeof asset.storedFilePath === "string"
        ? storagePathToApiPath(asset.storedFilePath)
        : undefined,
    imageVersions,
  };
}

export function serializeProject(project: SerializableRecord) {
  const imageAssets = Array.isArray(project.imageAssets)
    ? project.imageAssets.map((asset) => serializeAsset(asset as SerializableRecord))
    : [];

  return {
    ...project,
    imageAssets,
  };
}
