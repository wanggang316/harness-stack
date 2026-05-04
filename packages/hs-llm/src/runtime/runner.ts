import type { HsLlmConfig } from "../config/schema.js";
import { InvocationError } from "./errors.js";
import { createRunner } from "./registry.js";
import type {
  InvocationRequest,
  InvocationResponse,
  ProviderTaskRunner,
  ResolvedAgent
} from "./types.js";

export async function invoke(args: {
  config: HsLlmConfig;
  agentId: string;
  request: InvocationRequest;
}): Promise<InvocationResponse> {
  const resolved = resolveAgent(args.config, args.agentId);
  const runner = getRunner(args.config, resolved.providerName);
  const merged = applyAgentDefaults(resolved, args.request);
  return runner.runTask({ agent: resolved, request: merged });
}

function resolveAgent(config: HsLlmConfig, agentId: string): ResolvedAgent {
  const agent = config.agents.find((a) => a.id === agentId);
  if (!agent) {
    throw new InvocationError("config", `agent '${agentId}' not found in config`);
  }
  const provider = config.providers[agent.provider];
  if (!provider) {
    throw new InvocationError(
      "config",
      `provider '${agent.provider}' (referenced by agent '${agentId}') not found`
    );
  }
  const model = provider.models.find((m) => m.id === agent.model);
  if (!model) {
    throw new InvocationError(
      "config",
      `model '${agent.model}' not found on provider '${agent.provider}'`
    );
  }
  return { agent, providerName: agent.provider, provider, model };
}

// runnerCache assumes the config object is treated as immutable after the first
// invoke() — runners may close over provider fields read at construction time
// (e.g., the Slice 3 api runner builds a model factory once). Mutating a
// cached provider's fields in place is unsupported.
const runnerCache = new WeakMap<HsLlmConfig, Map<string, ProviderTaskRunner>>();

function getRunner(config: HsLlmConfig, providerName: string): ProviderTaskRunner {
  let cache = runnerCache.get(config);
  if (!cache) {
    cache = new Map();
    runnerCache.set(config, cache);
  }
  let runner = cache.get(providerName);
  if (!runner) {
    const provider = config.providers[providerName];
    if (!provider) {
      throw new InvocationError("config", `provider '${providerName}' not found`);
    }
    runner = createRunner(provider);
    cache.set(providerName, runner);
  }
  return runner;
}

export function applyAgentDefaults(agent: ResolvedAgent, request: InvocationRequest): InvocationRequest {
  const merged: InvocationRequest = { ...request };
  const modelDefaults = agent.model.defaults;
  if (merged.system === undefined && agent.agent.systemPrompt !== undefined) {
    merged.system = agent.agent.systemPrompt;
  }
  if (merged.temperature === undefined) {
    const fallback = agent.agent.temperature ?? modelDefaults?.temperature;
    if (fallback !== undefined) merged.temperature = fallback;
  }
  if (merged.maxOutputTokens === undefined) {
    const fallback = agent.agent.maxOutputTokens ?? modelDefaults?.maxOutputTokens;
    if (fallback !== undefined) merged.maxOutputTokens = fallback;
  }
  if (merged.reasoning === undefined) {
    const fallback = agent.agent.reasoning ?? modelDefaults?.reasoning;
    if (fallback !== undefined) merged.reasoning = fallback;
  }
  if (merged.timeoutMs === undefined && agent.agent.timeoutMs !== undefined) {
    merged.timeoutMs = agent.agent.timeoutMs;
  }
  return merged;
}
