const MAX_FILE_SIZE = 30 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function assertUploadIsSupported(file: File) {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Upload PNG, JPG, or WEBP images only.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Oversized image. Keep uploads below 30 MB.");
  }
}
