import type { MockProviderConfig } from "../config/schema.js";
import { InvocationError } from "./errors.js";
import type {
  InvocationRequest,
  InvocationResponse,
  ProviderTaskRunner,
  ResolvedAgent
} from "./types.js";

export function createMockRunner(provider: MockProviderConfig): ProviderTaskRunner {
  return {
    async runTask({ agent, request }): Promise<InvocationResponse> {
      const start = Date.now();
      if (provider.latencyMs > 0) {
        await delay(provider.latencyMs, request.abortSignal);
      }
      switch (provider.behavior) {
        case "deterministic":
          return makeDeterministic(provider, agent, request, start);
        case "timeout":
          throw new InvocationError("timeout", "mock provider configured with behavior=timeout");
        case "error":
          throw new InvocationError("non-retryable", "mock provider configured with behavior=error");
        case "malformed":
          return {
            agentId: agent.agent.id,
            providerModel: agent.model.id,
            text: "<<malformed>> not-json {",
            finishReason: "stop",
            latencyMs: Date.now() - start,
            reasoningApplied: false
          };
        default: {
          const exhaustive: never = provider.behavior;
          throw new InvocationError("config", `unhandled mock behavior: ${String(exhaustive)}`);
        }
      }
    }
  };
}

function makeDeterministic(
  provider: MockProviderConfig,
  agent: ResolvedAgent,
  request: InvocationRequest,
  start: number
): InvocationResponse {
  const text = renderTemplate(provider.responseTemplate, {
    agentId: agent.agent.id,
    prompt: request.prompt,
    providerModel: agent.model.id
  });
  return {
    agentId: agent.agent.id,
    providerModel: agent.model.id,
    text,
    finishReason: "stop",
    usage: { inputTokens: request.prompt.length, outputTokens: text.length },
    latencyMs: Date.now() - start,
    reasoningApplied: false
  };
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}

async function delay(ms: number, abortSignal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new InvocationError("abort", "aborted before mock delay"));
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = (): void => {
      cleanup();
      reject(new InvocationError("abort", "aborted during mock delay"));
    };
    const cleanup = (): void => {
      clearTimeout(timer);
      abortSignal?.removeEventListener("abort", onAbort);
    };
    abortSignal?.addEventListener("abort", onAbort, { once: true });
  });
}
