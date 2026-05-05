import type { AgentConfig, ProviderConfig, ProviderModel, ReasoningLevel } from "../config/schema.js";

export interface ResolvedAgent {
  agent: AgentConfig;
  providerName: string;
  provider: ProviderConfig;
  model: ProviderModel;
}

export interface InvocationRequest {
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  reasoning?: ReasoningLevel;
  timeoutMs?: number;
  traceabilityId?: string;
  abortSignal?: AbortSignal;
}

export interface InvocationResponse {
  agentId: string;
  providerModel: string;
  text: string;
  finishReason?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  latencyMs: number;
  reasoningApplied: boolean;
}

export interface ProviderTaskRunner {
  runTask(args: { agent: ResolvedAgent; request: InvocationRequest }): Promise<InvocationResponse>;
}

export interface RetryPolicy {
  attempts: number;
  backoffMs: number;
  jitterPct: number;
  maxWaitMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  attempts: 3,
  backoffMs: 500,
  jitterPct: 25,
  maxWaitMs: 5_000
};

export { InvocationError, type InvocationErrorKind } from "./errors.js";
