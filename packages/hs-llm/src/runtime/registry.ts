import type { ProviderConfig } from "../config/schema.js";
import { createMockRunner } from "./mock.js";
import { InvocationError, type ProviderTaskRunner } from "./types.js";

export function createRunner(provider: ProviderConfig): ProviderTaskRunner {
  switch (provider.type) {
    case "mock":
      return createMockRunner(provider);
    case "api":
      throw new InvocationError(
        "config",
        "provider type 'api' is not yet implemented (planned for Slice 3)"
      );
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
