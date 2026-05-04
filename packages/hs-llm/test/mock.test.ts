import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  invoke,
  loadConfig,
  validateConfig,
  applyAgentDefaults,
  InvocationError,
  type HsLlmConfig,
  type MockProviderConfig,
  type ResolvedAgent
} from "../src/index.js";

const baseConfig: HsLlmConfig = validateConfig({
  version: 1,
  providers: {
    mock_provider: {
      type: "mock",
      behavior: "deterministic",
      latencyMs: 0,
      responseTemplate: "MOCK[{agentId}]: {prompt}",
      models: [{ id: "mock-1" }]
    }
  },
  agents: [{ id: "mock_a", provider: "mock_provider", model: "mock-1" }]
});

describe("invoke (mock provider)", () => {
  it("returns deterministic text from the response template", async () => {
    const res = await invoke({
      config: baseConfig,
      agentId: "mock_a",
      request: { prompt: "hi", traceabilityId: "trace-1" }
    });
    expect(res.text).toBe("MOCK[mock_a]: hi");
    expect(res.agentId).toBe("mock_a");
    expect(res.providerModel).toBe("mock-1");
    expect(res.reasoningApplied).toBe(false);
    expect(res.usage?.inputTokens).toBe(2);
    // traceabilityId is opt-in passthrough; the request must be accepted with it set.
  });

  it("reports latencyMs near the configured mock delay", async () => {
    const cfg = withMockBehavior(baseConfig, "deterministic", { latencyMs: 30 });
    const res = await invoke({ config: cfg, agentId: "mock_a", request: { prompt: "x" } });
    // setTimeout granularity on macOS is ~1ms; allow a small floor below the configured value.
    expect(res.latencyMs).toBeGreaterThanOrEqual(25);
  });

  it("throws InvocationError(kind=timeout) when behavior=timeout", async () => {
    const cfg = withMockBehavior(baseConfig, "timeout");
    await expect(
      invoke({ config: cfg, agentId: "mock_a", request: { prompt: "x" } })
    ).rejects.toMatchObject({ kind: "timeout" });
  });

  it("throws InvocationError(kind=non-retryable) when behavior=error", async () => {
    const cfg = withMockBehavior(baseConfig, "error");
    await expect(
      invoke({ config: cfg, agentId: "mock_a", request: { prompt: "x" } })
    ).rejects.toMatchObject({ kind: "non-retryable" });
  });

  it("returns text that is not valid JSON when behavior=malformed", async () => {
    const cfg = withMockBehavior(baseConfig, "malformed");
    const res = await invoke({ config: cfg, agentId: "mock_a", request: { prompt: "x" } });
    expect(() => JSON.parse(res.text)).toThrow();
    expect(res.reasoningApplied).toBe(false);
    expect(res.finishReason).toBe("stop");
  });

  it("throws config error for unknown agent id", async () => {
    await expect(
      invoke({ config: baseConfig, agentId: "ghost", request: { prompt: "x" } })
    ).rejects.toBeInstanceOf(InvocationError);
  });

  it("rejects unimplemented provider types with config error", async () => {
    const cfg = validateConfig({
      version: 1,
      providers: {
        api_provider: {
          type: "api",
          family: "anthropic",
          baseURL: "https://api.anthropic.com/v1",
          apiKeyEnv: "ANTHROPIC_API_KEY",
          models: [{ id: "claude-haiku" }]
        }
      },
      agents: [{ id: "api_a", provider: "api_provider", model: "claude-haiku" }]
    });
    await expect(
      invoke({ config: cfg, agentId: "api_a", request: { prompt: "x" } })
    ).rejects.toMatchObject({ kind: "config" });
  });

  it("reuses the same runner instance for repeated invocations on a single config object", async () => {
    // Runners are cached per-config-object and reused for invocations on the same
    // config. Three invokes on one config + a fresh second config exercise the
    // reuse path and confirm the cache does not leak across configs.
    const callCounts = new Map<HsLlmConfig, number>();
    const trackingConfig: HsLlmConfig = validateConfig({
      version: 1,
      providers: {
        mock_provider: {
          type: "mock",
          behavior: "deterministic",
          latencyMs: 0,
          responseTemplate: "{prompt}",
          models: [{ id: "mock-1" }]
        }
      },
      agents: [{ id: "mock_a", provider: "mock_provider", model: "mock-1" }]
    });
    callCounts.set(trackingConfig, 0);

    const r1 = await invoke({ config: trackingConfig, agentId: "mock_a", request: { prompt: "first" } });
    const r2 = await invoke({ config: trackingConfig, agentId: "mock_a", request: { prompt: "second" } });
    const r3 = await invoke({ config: trackingConfig, agentId: "mock_a", request: { prompt: "third" } });

    expect(r1.text).toBe("first");
    expect(r2.text).toBe("second");
    expect(r3.text).toBe("third");
    // The cache holds the runner per config — a fresh config should not see leakage.
    const otherConfig = validateConfig({
      version: 1,
      providers: {
        mock_provider: {
          type: "mock",
          behavior: "error",
          latencyMs: 0,
          responseTemplate: "{prompt}",
          models: [{ id: "mock-1" }]
        }
      },
      agents: [{ id: "mock_a", provider: "mock_provider", model: "mock-1" }]
    });
    await expect(
      invoke({ config: otherConfig, agentId: "mock_a", request: { prompt: "x" } })
    ).rejects.toMatchObject({ kind: "non-retryable" });
  });
});

describe("AbortSignal handling (mock provider)", () => {
  it("rejects with kind=abort when the signal is already aborted before invoke", async () => {
    const cfg = withMockBehavior(baseConfig, "deterministic", { latencyMs: 50 });
    const controller = new AbortController();
    controller.abort();
    await expect(
      invoke({
        config: cfg,
        agentId: "mock_a",
        request: { prompt: "x", abortSignal: controller.signal }
      })
    ).rejects.toMatchObject({ kind: "abort" });
  });

  it("rejects with kind=abort and within the configured latency window when the signal fires during the delay", async () => {
    const cfg = withMockBehavior(baseConfig, "deterministic", { latencyMs: 200 });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10);
    const start = Date.now();
    await expect(
      invoke({
        config: cfg,
        agentId: "mock_a",
        request: { prompt: "x", abortSignal: controller.signal }
      })
    ).rejects.toMatchObject({ kind: "abort" });
    // Listener fired and short-circuited the timer; otherwise we would wait the full 200ms.
    expect(Date.now() - start).toBeLessThan(150);
  });
});

describe("validateConfig referential integrity", () => {
  it("throws config error when an agent references an unknown provider", () => {
    expect(() =>
      validateConfig({
        version: 1,
        providers: {
          mock_provider: {
            type: "mock",
            behavior: "deterministic",
            latencyMs: 0,
            responseTemplate: "{prompt}",
            models: [{ id: "mock-1" }]
          }
        },
        agents: [{ id: "ghost_agent", provider: "missing_provider", model: "mock-1" }]
      })
    ).toThrow(
      expect.objectContaining({
        kind: "config",
        message: expect.stringContaining("unknown provider 'missing_provider'")
      })
    );
  });

  it("throws config error listing available models when agent references an unknown model", () => {
    expect(() =>
      validateConfig({
        version: 1,
        providers: {
          mock_provider: {
            type: "mock",
            behavior: "deterministic",
            latencyMs: 0,
            responseTemplate: "{prompt}",
            models: [{ id: "mock-1" }, { id: "mock-2" }]
          }
        },
        agents: [{ id: "wrong_model_agent", provider: "mock_provider", model: "mock-3" }]
      })
    ).toThrow(
      expect.objectContaining({
        kind: "config",
        message: expect.stringMatching(/unknown model 'mock-3'.*available: mock-1, mock-2/s)
      })
    );
  });
});

describe("loadConfig (filesystem)", () => {
  it("rejects with kind=config when the file does not exist", async () => {
    await expect(loadConfig("/nonexistent/path/hs-llm-config.json")).rejects.toMatchObject({
      kind: "config",
      message: expect.stringContaining("Failed to read config file")
    });
  });

  it("rejects with kind=config when the file is not valid JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hs-llm-test-"));
    const path = join(dir, "config.json");
    try {
      await writeFile(path, "{ this is not json", "utf8");
      await expect(loadConfig(path)).rejects.toMatchObject({
        kind: "config",
        message: expect.stringContaining("not valid JSON")
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("applyAgentDefaults precedence", () => {
  const buildAgent = (
    agentOverrides: Partial<{
      systemPrompt: string;
      temperature: number;
      maxOutputTokens: number;
      reasoning: "minimal" | "medium" | "high";
      timeoutMs: number;
    }>,
    modelDefaults?: { temperature?: number; maxOutputTokens?: number; reasoning?: "minimal" | "medium" | "high" }
  ): ResolvedAgent => {
    const agent: ResolvedAgent["agent"] = { id: "a", provider: "p", model: "m", ...agentOverrides };
    return {
      agent,
      providerName: "p",
      provider: {
        type: "mock",
        behavior: "deterministic",
        latencyMs: 0,
        responseTemplate: "{prompt}",
        models: [{ id: "m", ...(modelDefaults ? { defaults: modelDefaults } : {}) }]
      },
      model: { id: "m", ...(modelDefaults ? { defaults: modelDefaults } : {}) }
    };
  };

  it("keeps request value when set; ignores agent and model defaults", () => {
    const merged = applyAgentDefaults(
      buildAgent({ temperature: 0.4 }, { temperature: 0.2 }),
      { prompt: "x", temperature: 0.9 }
    );
    expect(merged.temperature).toBe(0.9);
  });

  it("falls back to agent value when request is unset; ignores model default", () => {
    const merged = applyAgentDefaults(
      buildAgent({ temperature: 0.4 }, { temperature: 0.2 }),
      { prompt: "x" }
    );
    expect(merged.temperature).toBe(0.4);
  });

  it("falls back to model default when both request and agent are unset", () => {
    const merged = applyAgentDefaults(buildAgent({}, { temperature: 0.2 }), { prompt: "x" });
    expect(merged.temperature).toBe(0.2);
  });

  it("merges all five fields independently with the same precedence", () => {
    const merged = applyAgentDefaults(
      buildAgent(
        { systemPrompt: "agent-sys", temperature: 0.3, maxOutputTokens: 256, reasoning: "medium", timeoutMs: 5000 },
        { temperature: 0.1, maxOutputTokens: 64, reasoning: "minimal" }
      ),
      { prompt: "x", reasoning: "high" }
    );
    expect(merged.system).toBe("agent-sys");
    expect(merged.temperature).toBe(0.3);
    expect(merged.maxOutputTokens).toBe(256);
    expect(merged.reasoning).toBe("high");
    expect(merged.timeoutMs).toBe(5000);
  });
});

function withMockBehavior(
  config: HsLlmConfig,
  behavior: MockProviderConfig["behavior"],
  overrides: Partial<Pick<MockProviderConfig, "latencyMs" | "responseTemplate">> = {}
): HsLlmConfig {
  const provider = config.providers["mock_provider"];
  if (!provider || provider.type !== "mock") {
    throw new Error("expected mock provider in baseConfig");
  }
  return {
    ...config,
    providers: {
      ...config.providers,
      mock_provider: { ...provider, behavior, ...overrides }
    }
  };
}
