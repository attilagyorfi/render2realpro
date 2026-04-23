export type SemanticTone = "neutral" | "info" | "success" | "warning" | "danger";

export type GenerationStatus = "queued" | "processing" | "completed" | "failed";

export function getGenerationStatusTone(status: GenerationStatus): SemanticTone {
  switch (status) {
    case "queued":
      return "warning";
    case "processing":
      return "info";
    case "completed":
      return "success";
    case "failed":
      return "danger";
  }
}

export function getGenerationStatusLabelKey(status: GenerationStatus) {
  return `status.${status}` as const;
}
