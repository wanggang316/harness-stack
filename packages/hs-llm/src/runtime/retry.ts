import { InvocationError } from "./errors.js";
import type { RetryPolicy } from "./types.js";

export async function withRetry<T>(fn: () => Promise<T>, policy: RetryPolicy): Promise<T> {
  if (policy.attempts < 1) {
    throw new Error(`RetryPolicy.attempts must be >= 1; got ${policy.attempts}`);
  }
  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === policy.attempts) throw err;
      await sleep(computeBackoffMs(policy, attempt));
    }
  }
  throw lastError;
}

export function isRetryable(err: unknown): boolean {
  return err instanceof InvocationError && (err.kind === "retryable" || err.kind === "timeout");
}

export function computeBackoffMs(policy: RetryPolicy, attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  const base = Math.min(policy.backoffMs * 2 ** exponent, policy.maxWaitMs);
  const jitterRange = base * (policy.jitterPct / 100);
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  return Math.max(0, base + jitter);
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
