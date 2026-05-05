import type { ZodTypeAny } from "zod";
import type { HsLlmConfig } from "../config/schema.js";
import { Semaphore } from "./concurrency.js";
import { InvocationError } from "./errors.js";
import { createRunner } from "./registry.js";
import { withRetry } from "./retry.js";
import {
  DEFAULT_SCHEMA_REPAIR_ATTEMPTS,
  parseSchemaResponse,
  SchemaParseError
} from "./schema.js";
import {
  DEFAULT_RETRY_POLICY,
  type InvocationRequest,
  type InvocationResponse,
  type ProviderTaskRunner,
  type ResolvedAgent,
  type RetryPolicy
} from "./types.js";

const DEFAULT_INVOKE_MANY_CONCURRENCY = 8;

export type InvokeManyResult = Array<
  | { agentId: string; status: "ok"; response: InvocationResponse & { parsed?: unknown } }
  | { agentId: string; status: "error"; error: InvocationError }
>;

export async function invoke<T = unknown>(args: {
  config: HsLlmConfig;
  agentId: string;
  request: InvocationRequest;
  retry?: RetryPolicy;
  schema?: ZodTypeAny;
  schemaRepairAttempts?: number;
}): Promise<InvocationResponse & { parsed?: T }> {
  const resolved = resolveAgent(args.config, args.agentId);
  const runner = await getRunner(args.config, resolved.providerName);
  const merged = applyAgentDefaults(resolved, args.request);
  const exec = (request: InvocationRequest): Promise<InvocationResponse> =>
    args.retry
      ? withRetry(() => runner.runTask({ agent: resolved, request }), args.retry)
      : runner.runTask({ agent: resolved, request });

  if (!args.schema) {
    return exec(merged);
  }

  const repairAttempts = args.schemaRepairAttempts ?? DEFAULT_SCHEMA_REPAIR_ATTEMPTS;
  let request = merged;
  let lastResponse: InvocationResponse | undefined;
  let lastError: SchemaParseError | undefined;
  for (let attempt = 0; attempt <= repairAttempts; attempt++) {
    const response = await exec(request);
    lastResponse = response;
    try {
      const result = parseSchemaResponse<T>(response.text, args.schema);
      return { ...response, parsed: result.parsed };
    } catch (err) {
      if (!(err instanceof SchemaParseError) || attempt === repairAttempts) {
        if (err instanceof SchemaParseError) lastError = err;
        break;
      }
      lastError = err;
      request = withRepairHint(merged, err);
    }
  }
  throw new InvocationError(
    "non-retryable",
    `schema-constrained output failed after ${repairAttempts + 1} attempts: ${lastError?.message ?? "unknown error"}\nlast raw output:\n${lastResponse?.text ?? "(no response)"}`
  );
}

function withRepairHint(request: InvocationRequest, error: SchemaParseError): InvocationRequest {
  const hint = `\n\nYour previous output failed validation: ${error.message}\nReturn ONLY a JSON object that satisfies the requested schema.`;
  return { ...request, prompt: `${request.prompt}${hint}` };
}

export async function invokeMany(args: {
  config: HsLlmConfig;
  invocations: Array<{ agentId: string; request: InvocationRequest; schema?: ZodTypeAny }>;
  concurrency?: number;
  retry?: RetryPolicy;
  schemaRepairAttempts?: number;
}): Promise<InvokeManyResult> {
  const concurrency = args.concurrency ?? DEFAULT_INVOKE_MANY_CONCURRENCY;
  const semaphore = new Semaphore(concurrency);

  return Promise.all(
    args.invocations.map(async (inv) => {
      await semaphore.acquire();
      try {
        const response = await invoke({
          config: args.config,
          agentId: inv.agentId,
          request: inv.request,
          ...(args.retry !== undefined ? { retry: args.retry } : {}),
          ...(inv.schema !== undefined ? { schema: inv.schema } : {}),
          ...(args.schemaRepairAttempts !== undefined ? { schemaRepairAttempts: args.schemaRepairAttempts } : {})
        });
        return { agentId: inv.agentId, status: "ok" as const, response };
      } catch (err) {
        return {
          agentId: inv.agentId,
          status: "error" as const,
          error: err instanceof InvocationError ? err : new InvocationError("non-retryable", String(err), { cause: err })
        };
      } finally {
        semaphore.release();
      }
    })
  );
}

export { DEFAULT_RETRY_POLICY };

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
// (e.g., the api runner builds a model factory once). Mutating a cached
// provider's fields in place is unsupported. The cache holds Promise<Runner>
// so concurrent invocations share a single async construction (e.g. dynamic
// import for the sdk provider).
const runnerCache = new WeakMap<HsLlmConfig, Map<string, Promise<ProviderTaskRunner>>>();

function getRunner(config: HsLlmConfig, providerName: string): Promise<ProviderTaskRunner> {
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
    runner = Promise.resolve(createRunner(providerName, provider));
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
