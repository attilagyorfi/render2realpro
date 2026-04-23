import crypto from "node:crypto";

import {
  duplicateGeneratedVersion,
} from "@/services/storage/storage-service";

import type { ProviderAdapter, ProviderGenerateInput, ProviderGenerateResult } from "./provider-adapter";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockLocalProvider implements ProviderAdapter {
  readonly name = "mock-local";
  readonly label = "Mock Local Provider";

  async generateRealismPass(
    input: ProviderGenerateInput
  ): Promise<ProviderGenerateResult> {
    const startedAt = Date.now();

    await sleep(350);
    await sleep(600);
    await sleep(420);

    const duplicated = await duplicateGeneratedVersion({
      projectId: input.projectId,
      sourcePath: input.sourcePath,
      versionLabel: "realism-pass",
    });

    return {
      filePath: duplicated.filePath,
      metadata: {
        provider: this.name,
        traceId: crypto.randomUUID(),
        simulated: true,
        preservedComposition: true,
      },
      processingTimeMs: Date.now() - startedAt,
    };
  }
}
