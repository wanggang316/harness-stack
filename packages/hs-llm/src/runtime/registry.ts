import type { ProviderConfig } from "../config/schema.js";
import { createApiRunner } from "./api.js";
import { createCliRunner } from "./cli.js";
import { createMockRunner } from "./mock.js";
import { createSdkRunner } from "./sdk.js";
import type { ProviderTaskRunner } from "./types.js";

export function createRunner(
  providerName: string,
  provider: ProviderConfig
): ProviderTaskRunner | Promise<ProviderTaskRunner> {
  switch (provider.type) {
    case "mock":
      return createMockRunner(provider);
    case "api":
      return createApiRunner(providerName, provider);
    case "cli":
      return createCliRunner(provider);
    case "sdk":
      return createSdkRunner(providerName, provider);
  }
}
