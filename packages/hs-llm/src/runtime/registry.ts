import type { ProviderConfig } from "../config/schema.js";
import { createApiRunner } from "./api.js";
import { InvocationError } from "./errors.js";
import { createMockRunner } from "./mock.js";
import type { ProviderTaskRunner } from "./types.js";

export function createRunner(providerName: string, provider: ProviderConfig): ProviderTaskRunner {
  switch (provider.type) {
    case "mock":
      return createMockRunner(provider);
    case "api":
      return createApiRunner(providerName, provider);
    case "cli":
      throw new InvocationError(
        "config",
        "provider type 'cli' is not yet implemented (planned for Slice 4)"
      );
    case "sdk":
      throw new InvocationError(
        "config",
        "provider type 'sdk' is not yet implemented (planned for Slice 8)"
      );
  }
}
