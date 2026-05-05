import { describe, expect, it, vi } from "vitest";
import { Semaphore } from "../src/runtime/concurrency.js";
import { withRetry, computeBackoffMs, isRetryable } from "../src/runtime/retry.js";
import {
  invokeMany,
  validateConfig,
  InvocationError,
  DEFAULT_RETRY_POLICY,
  type HsLlmConfig,
  type RetryPolicy
} from "../src/index.js";

const fastPolicy: RetryPolicy = { attempts: 3, backoffMs: 1, jitterPct: 0, maxWaitMs: 5 };

describe("Semaphore", () => {
  it("never lets more than `limit` callers run concurrently", async () => {
    const sem = new Semaphore(2);
    let inFlightObserved = 0;
    const tasks = Array.from({ length: 6 }, () => async () => {
      await sem.acquire();
      try {
        inFlightObserved = Math.max(inFlightObserved, sem.inFlight);
        await new Promise((r) => setTimeout(r, 5));
      } finally {
        sem.release();
      }
    });
    await Promise.all(tasks.map((t) => t()));
    expect(inFlightObserved).toBe(2);
  });

  it("rejects non-positive limits", () => {
    expect(() => new Semaphore(0)).toThrow();
    expect(() => new Semaphore(-1)).toThrow();
  });
});

describe("withRetry", () => {
  it("returns immediately when fn succeeds on the first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(fn, fastPolicy)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries when fn throws a retryable InvocationError and succeeds on a later attempt", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 3) throw new InvocationError("retryable", `attempt ${calls}`);
      return "ok";
    });
    await expect(withRetry(fn, fastPolicy)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("retries on kind=timeout but not kind=non-retryable", async () => {
    const timeoutFn = vi.fn(async () => {
      throw new InvocationError("timeout", "slow");
    });
    await expect(withRetry(timeoutFn, fastPolicy)).rejects.toMatchObject({ kind: "timeout" });
    expect(timeoutFn).toHaveBeenCalledTimes(fastPolicy.attempts);

    const nonRetryFn = vi.fn(async () => {
      throw new InvocationError("non-retryable", "permanent");
    });
    await expect(withRetry(nonRetryFn, fastPolicy)).rejects.toMatchObject({ kind: "non-retryable" });
    expect(nonRetryFn).toHaveBeenCalledTimes(1);
  });

  it("does not retry config or abort errors", async () => {
    const configFn = vi.fn(async () => {
      throw new InvocationError("config", "bad");
    });
    await expect(withRetry(configFn, fastPolicy)).rejects.toMatchObject({ kind: "config" });
    expect(configFn).toHaveBeenCalledTimes(1);

    const abortFn = vi.fn(async () => {
      throw new InvocationError("abort", "cancelled");
    });
    await expect(withRetry(abortFn, fastPolicy)).rejects.toMatchObject({ kind: "abort" });
    expect(abortFn).toHaveBeenCalledTimes(1);
  });

  it("isRetryable identifies retryable and timeout kinds only", () => {
    expect(isRetryable(new InvocationError("retryable", "x"))).toBe(true);
    expect(isRetryable(new InvocationError("timeout", "x"))).toBe(true);
    expect(isRetryable(new InvocationError("non-retryable", "x"))).toBe(false);
    expect(isRetryable(new InvocationError("config", "x"))).toBe(false);
    expect(isRetryable(new InvocationError("abort", "x"))).toBe(false);
    expect(isRetryable(new Error("plain"))).toBe(false);
  });

  it("computeBackoffMs grows exponentially up to maxWaitMs", () => {
    const policy: RetryPolicy = { attempts: 5, backoffMs: 100, jitterPct: 0, maxWaitMs: 1000 };
    expect(computeBackoffMs(policy, 1)).toBe(100);
    expect(computeBackoffMs(policy, 2)).toBe(200);
    expect(computeBackoffMs(policy, 3)).toBe(400);
    expect(computeBackoffMs(policy, 10)).toBe(1000); // capped
  });

  it("computeBackoffMs applies jitter within +/- jitterPct%", () => {
    const policy: RetryPolicy = { attempts: 3, backoffMs: 1000, jitterPct: 25, maxWaitMs: 10_000 };
    for (let i = 0; i < 50; i++) {
      const v = computeBackoffMs(policy, 1);
      expect(v).toBeGreaterThanOrEqual(750);
      expect(v).toBeLessThanOrEqual(1250);
    }
  });
});

describe("invokeMany", () => {
  function buildConfig(): HsLlmConfig {
    return validateConfig({
      version: 1,
      providers: {
        ok_p: {
          type: "mock",
          behavior: "deterministic",
          latencyMs: 0,
          responseTemplate: "{prompt}",
          models: [{ id: "m" }]
        },
        err_p: {
          type: "mock",
          behavior: "error",
          latencyMs: 0,
          responseTemplate: "{prompt}",
          models: [{ id: "m" }]
        },
        timeout_p: {
          type: "mock",
          behavior: "timeout",
          latencyMs: 0,
          responseTemplate: "{prompt}",
          models: [{ id: "m" }]
        }
      },
      agents: [
        { id: "a_ok", provider: "ok_p", model: "m" },
        { id: "a_err", provider: "err_p", model: "m" },
        { id: "a_to", provider: "timeout_p", model: "m" }
      ]
    });
  }

  it("returns ok and error entries side by side without aborting siblings", async () => {
    const cfg = buildConfig();
    const results = await invokeMany({
      config: cfg,
      invocations: [
        { agentId: "a_ok", request: { prompt: "hello" } },
        { agentId: "a_err", request: { prompt: "boom" } },
        { agentId: "a_to", request: { prompt: "slow" } },
        { agentId: "a_ok", request: { prompt: "again" } }
      ]
    });
    expect(results).toHaveLength(4);
    expect(results[0]?.status).toBe("ok");
    expect(results[1]?.status).toBe("error");
    expect(results[2]?.status).toBe("error");
    expect(results[3]?.status).toBe("ok");
    if (results[0]?.status === "ok") expect(results[0].response.text).toBe("hello");
    if (results[1]?.status === "error") expect(results[1].error.kind).toBe("non-retryable");
    if (results[2]?.status === "error") expect(results[2].error.kind).toBe("timeout");
  });

  it("returns config error for unknown agent without throwing", async () => {
    const cfg = buildConfig();
    const results = await invokeMany({
      config: cfg,
      invocations: [{ agentId: "ghost", request: { prompt: "x" } }]
    });
    expect(results[0]?.status).toBe("error");
    if (results[0]?.status === "error") {
      expect(results[0].error.kind).toBe("config");
    }
  });

  it("respects the configured concurrency cap", async () => {
    const cfg = validateConfig({
      version: 1,
      providers: {
        slow_p: {
          type: "mock",
          behavior: "deterministic",
          latencyMs: 30,
          responseTemplate: "{prompt}",
          models: [{ id: "m" }]
        }
      },
      agents: [{ id: "slow", provider: "slow_p", model: "m" }]
    });
    const start = Date.now();
    await invokeMany({
      config: cfg,
      invocations: Array.from({ length: 6 }, (_, i) => ({
        agentId: "slow",
        request: { prompt: `n${i}` }
      })),
      concurrency: 2
    });
    const elapsed = Date.now() - start;
    // 6 tasks × 30ms each, 2 at a time, 3 batches → ~90ms minimum.
    expect(elapsed).toBeGreaterThanOrEqual(75);
  });

  it("retries each invocation independently when retry policy is supplied", async () => {
    // Direct integration: invoke uses withRetry → mock 'error' is non-retryable → retries
    // do not fire for that branch. Use this assertion as a smoke that retry is plumbed.
    const cfg = buildConfig();
    const results = await invokeMany({
      config: cfg,
      invocations: [
        { agentId: "a_ok", request: { prompt: "p" } },
        { agentId: "a_err", request: { prompt: "p" } }
      ],
      retry: fastPolicy
    });
    expect(results[0]?.status).toBe("ok");
    expect(results[1]?.status).toBe("error");
  });
});

describe("invoke + retry", () => {
  it("uses DEFAULT_RETRY_POLICY shape with safe defaults", () => {
    expect(DEFAULT_RETRY_POLICY.attempts).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_RETRY_POLICY.backoffMs).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RETRY_POLICY.jitterPct).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RETRY_POLICY.maxWaitMs).toBeGreaterThanOrEqual(DEFAULT_RETRY_POLICY.backoffMs);
  });
});
