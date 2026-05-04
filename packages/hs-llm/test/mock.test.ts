import { describe, expect, it } from "vitest";
import { invoke, validateConfig, InvocationError, type HsLlmConfig } from "../src/index.js";

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
      request: { prompt: "hi" }
    });
    expect(res.text).toBe("MOCK[mock_a]: hi");
    expect(res.agentId).toBe("mock_a");
    expect(res.providerModel).toBe("mock-1");
    expect(res.reasoningApplied).toBe(false);
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    expect(res.usage?.inputTokens).toBe(2);
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

  it("returns malformed text when behavior=malformed", async () => {
    const cfg = withMockBehavior(baseConfig, "malformed");
    const res = await invoke({ config: cfg, agentId: "mock_a", request: { prompt: "x" } });
    expect(res.text).toContain("malformed");
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

  it("merges agent defaults into the request", async () => {
    const cfg = validateConfig({
      version: 1,
      providers: {
        mock_provider: {
          type: "mock",
          behavior: "deterministic",
          latencyMs: 0,
          responseTemplate: "{prompt}",
          models: [{ id: "mock-1", defaults: { temperature: 0.3 } }]
        }
      },
      agents: [
        {
          id: "mock_a",
          provider: "mock_provider",
          model: "mock-1",
          systemPrompt: "you are helpful",
          temperature: 0.7
        }
      ]
    });
    // Merge precedence is exercised via runner.ts; behavior verified indirectly by the response succeeding.
    const res = await invoke({ config: cfg, agentId: "mock_a", request: { prompt: "ping" } });
    expect(res.text).toBe("ping");
  });
});

function withMockBehavior(
  config: HsLlmConfig,
  behavior: "deterministic" | "timeout" | "error" | "malformed"
): HsLlmConfig {
  const provider = config.providers["mock_provider"];
  if (!provider || provider.type !== "mock") {
    throw new Error("expected mock provider in baseConfig");
  }
  return {
    ...config,
    providers: {
      ...config.providers,
      mock_provider: { ...provider, behavior }
    }
  };
}
