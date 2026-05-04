import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, APICallError, LoadAPIKeyError, type LanguageModel } from "ai";
import type { ApiProviderConfig } from "../config/schema.js";
import { InvocationError, type InvocationErrorKind } from "./errors.js";
import type {
  InvocationRequest,
  InvocationResponse,
  ProviderTaskRunner,
  ResolvedAgent
} from "./types.js";

export function createApiRunner(
  providerName: string,
  provider: ApiProviderConfig,
  environment: NodeJS.ProcessEnv = process.env
): ProviderTaskRunner {
  const apiKey = environment[provider.apiKeyEnv];
  if (!apiKey) {
    throw new InvocationError(
      "config",
      `api provider '${providerName}' requires env var '${provider.apiKeyEnv}' but it is not set`
    );
  }

  const factory = buildModelFactory(provider, apiKey);

  return {
    async runTask({ agent, request }): Promise<InvocationResponse> {
      const start = Date.now();
      const model = factory(agent.model.id);

      const { signal, dispose } = mergeAbortAndTimeout(request.abortSignal, request.timeoutMs);

      try {
        const result = await generateText({
          model,
          system: request.system,
          messages: [{ role: "user", content: request.prompt }],
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
          abortSignal: signal
        });

        return {
          agentId: agent.agent.id,
          providerModel: agent.model.id,
          text: result.text,
          finishReason: result.finishReason,
          usage: {
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens
          },
          latencyMs: Date.now() - start,
          // Q8: API providers do not currently inject the reasoning flag (Vercel AI SDK
          // does not expose a uniform reasoning param). Reasoning passthrough is a
          // future enhancement — for now we report it as not applied.
          reasoningApplied: false
        };
      } catch (err) {
        throw classifyApiError(err, request);
      } finally {
        dispose();
      }
    }
  };
}

function buildModelFactory(
  provider: ApiProviderConfig,
  apiKey: string
): (modelId: string) => LanguageModel {
  switch (provider.family) {
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey,
        baseURL: provider.baseURL,
        headers: provider.headers
      });
      return (modelId: string) => anthropic(modelId);
    }
    case "openai-compatible": {
      const openai = createOpenAICompatible({
        name: provider.family,
        apiKey,
        baseURL: provider.baseURL,
        headers: provider.headers
      });
      return (modelId: string) => openai(modelId);
    }
  }
}

function mergeAbortAndTimeout(
  abortSignal: AbortSignal | undefined,
  timeoutMs: number | undefined
): { signal: AbortSignal | undefined; dispose: () => void } {
  if (!timeoutMs && !abortSignal) {
    return { signal: undefined, dispose: () => {} };
  }
  if (!timeoutMs) {
    return { signal: abortSignal, dispose: () => {} };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
  const onUserAbort = (): void => controller.abort(abortSignal?.reason);
  if (abortSignal) {
    if (abortSignal.aborted) controller.abort(abortSignal.reason);
    else abortSignal.addEventListener("abort", onUserAbort, { once: true });
  }
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      abortSignal?.removeEventListener("abort", onUserAbort);
    }
  };
}

const RETRYABLE_HINTS = [
  "fetch failed",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "socket hang up",
  "network error",
  "rate limit",
  "overloaded",
  "service unavailable"
];

const NON_RETRYABLE_HINTS = [
  "invalid api key",
  "incorrect api key",
  "authentication",
  "unauthorized",
  "forbidden",
  "model not found",
  "permission",
  "quota",
  "billing",
  "invalid request"
];

export function classifyApiError(err: unknown, request: InvocationRequest): InvocationError {
  if (err instanceof InvocationError) return err;

  if (err instanceof APICallError) {
    const kind = classifyByStatusOrSdkHint(err);
    return new InvocationError(kind, formatApiCallError(err), { cause: err });
  }

  if (err instanceof LoadAPIKeyError) {
    return new InvocationError("config", err.message, { cause: err });
  }

  if (isAbortError(err)) {
    if (request.abortSignal?.aborted) {
      return new InvocationError("abort", "request aborted by caller", { cause: err });
    }
    if (request.timeoutMs !== undefined) {
      return new InvocationError("timeout", `request timed out after ${request.timeoutMs}ms`, { cause: err });
    }
    return new InvocationError("abort", "request aborted", { cause: err });
  }

  const message = errorMessage(err);
  const kind: InvocationErrorKind = matchesHints(message, NON_RETRYABLE_HINTS)
    ? "non-retryable"
    : matchesHints(message, RETRYABLE_HINTS)
      ? "retryable"
      : "non-retryable";
  return new InvocationError(kind, message, { cause: err });
}

function classifyByStatusOrSdkHint(err: APICallError): InvocationErrorKind {
  // Prefer SDK's own retryable hint when present.
  if (typeof err.isRetryable === "boolean") {
    return err.isRetryable ? "retryable" : classifyByStatus(err.statusCode);
  }
  return classifyByStatus(err.statusCode);
}

function classifyByStatus(status: number | undefined): InvocationErrorKind {
  if (status === undefined) return "retryable";
  if ([408, 409, 425, 429].includes(status) || status >= 500) return "retryable";
  return "non-retryable";
}

function formatApiCallError(err: APICallError): string {
  const status = err.statusCode !== undefined ? `HTTP ${err.statusCode}` : "API error";
  return `${status}: ${err.message}`;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

function matchesHints(message: string, hints: string[]): boolean {
  const lower = message.toLowerCase();
  return hints.some((hint) => lower.includes(hint.toLowerCase()));
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
