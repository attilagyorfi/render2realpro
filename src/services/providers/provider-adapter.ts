import type { BuildPromptInput } from "@/types/domain";

export type ProviderGenerateInput = {
  projectId: string;
  sourcePath: string;
  prompt: BuildPromptInput;
  /** Original image dimensions for aspect-ratio-preserving output size selection */
  sourceWidth?: number;
  sourceHeight?: number;
};

export type ProviderGenerateResult = {
  filePath: string;
  metadata: Record<string, unknown>;
  processingTimeMs: number;
};

export interface ProviderAdapter {
  readonly name: string;
  readonly label: string;
  generateRealismPass(input: ProviderGenerateInput): Promise<ProviderGenerateResult>;
}
