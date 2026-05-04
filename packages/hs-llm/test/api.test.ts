import { APICallError, LoadAPIKeyError } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifyApiError } from "../src/runtime/api.js";
import { InvocationError } from "../src/index.js";

describe("classifyApiError", () => {
  it("classifies APICallError 429 as retryable", () => {
    const err = new APICallError({
      message: "Rate limited",
      url: "https://api.test/v1",
      requestBodyValues: {},
      statusCode: 429,
      isRetryable: true
    });
    const out = classifyApiError(err, { prompt: "x" });
    expect(out).toBeInstanceOf(InvocationError);
    expect(out.kind).toBe("retryable");
    expect(out.message).toContain("HTTP 429");
  });

  it("classifies APICallError 401 as non-retryable", () => {
    const err = new APICallError({
      message: "Unauthorized",
      url: "https://api.test/v1",
      requestBodyValues: {},
      statusCode: 401,
      isRetryable: false
    });
    expect(classifyApiError(err, { prompt: "x" }).kind).toBe("non-retryable");
  });

  it("classifies APICallError 503 as retryable", () => {
    const err = new APICallError({
      message: "Service unavailable",
      url: "https://api.test/v1",
      requestBodyValues: {},
      statusCode: 503,
      isRetryable: true
    });
    expect(classifyApiError(err, { prompt: "x" }).kind).toBe("retryable");
  });

  it("classifies APICallError 408 (timeout-like) as retryable when SDK does not hint", () => {
    const err = new APICallError({
      message: "Request timeout",
      url: "https://api.test/v1",
      requestBodyValues: {},
      statusCode: 408
    });
    expect(classifyApiError(err, { prompt: "x" }).kind).toBe("retryable");
  });

  it("classifies APICallError 400 as non-retryable", () => {
    const err = new APICallError({
      message: "Bad Request",
      url: "https://api.test/v1",
      requestBodyValues: {},
      statusCode: 400
    });
    expect(classifyApiError(err, { prompt: "x" }).kind).toBe("non-retryable");
  });

  it("classifies LoadAPIKeyError as config", () => {
    const err = new LoadAPIKeyError({ message: "API key missing" });
    expect(classifyApiError(err, { prompt: "x" }).kind).toBe("config");
  });

  it("classifies AbortError with caller signal as kind=abort", () => {
    const err = new Error("The operation was aborted.");
    err.name = "AbortError";
    const controller = new AbortController();
    controller.abort();
    expect(classifyApiError(err, { prompt: "x", abortSignal: controller.signal }).kind).toBe("abort");
  });

  it("classifies AbortError with timeoutMs (no caller signal) as kind=timeout", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    expect(classifyApiError(err, { prompt: "x", timeoutMs: 1000 }).kind).toBe("timeout");
  });

  it("classifies network-error message hint as retryable", () => {
    expect(classifyApiError(new Error("fetch failed"), { prompt: "x" }).kind).toBe("retryable");
    expect(classifyApiError(new Error("ECONNRESET"), { prompt: "x" }).kind).toBe("retryable");
  });

  it("classifies auth-error message hint as non-retryable", () => {
    expect(classifyApiError(new Error("invalid api key"), { prompt: "x" }).kind).toBe("non-retryable");
  });

  it("falls through unknown errors to non-retryable conservatively", () => {
    expect(classifyApiError(new Error("something weird"), { prompt: "x" }).kind).toBe("non-retryable");
  });

  it("passes existing InvocationError through unchanged", () => {
    const original = new InvocationError("config", "preexisting");
    expect(classifyApiError(original, { prompt: "x" })).toBe(original);
  });
});

describe("createApiRunner (mocked AI SDK)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("throws config error when apiKeyEnv is unset", async () => {
    vi.unstubAllEnvs();
    const { createApiRunner } = await import("../src/runtime/api.js");
    expect(() =>
      createApiRunner(
        "p1",
        {
          type: "api",
          family: "anthropic",
          baseURL: "https://api.test/v1",
          apiKeyEnv: "MISSING_KEY_FOR_TEST",
          models: [{ id: "m1" }]
        },
        {} // empty environment
      )
    ).toThrow(
      expect.objectContaining({
        kind: "config",
        message: expect.stringContaining("MISSING_KEY_FOR_TEST")
      })
    );
  });

  it("invokes generateText with the merged request and returns a normalized response", async () => {
    const generateTextSpy = vi.fn().mockResolvedValue({
      text: "hello back",
      finishReason: "stop",
      usage: { inputTokens: 12, outputTokens: 4 }
    });

    vi.doMock("ai", async () => {
      const actual = await vi.importActual<typeof import("ai")>("ai");
      return { ...actual, generateText: generateTextSpy };
    });
    vi.doMock("@ai-sdk/anthropic", () => ({
      createAnthropic: () => (_modelId: string) => ({ specificationVersion: "v1", modelId: _modelId } as unknown)
    }));

    const { createApiRunner } = await import("../src/runtime/api.js");
    const runner = createApiRunner(
      "p1",
      {
        type: "api",
        family: "anthropic",
        baseURL: "https://api.test/v1",
        apiKeyEnv: "TEST_KEY",
        models: [{ id: "claude-haiku" }]
      },
      { TEST_KEY: "sk-test" }
    );

    const res = await runner.runTask({
      agent: {
        agent: { id: "a1", provider: "p1", model: "claude-haiku", systemPrompt: "be brief", temperature: 0.5 },
        providerName: "p1",
        provider: {
          type: "api",
          family: "anthropic",
          baseURL: "https://api.test/v1",
          apiKeyEnv: "TEST_KEY",
          models: [{ id: "claude-haiku" }]
        },
        model: { id: "claude-haiku" }
      },
      request: { prompt: "hi", system: "be brief", temperature: 0.5, maxOutputTokens: 100 }
    });

    expect(res.text).toBe("hello back");
    expect(res.finishReason).toBe("stop");
    expect(res.usage).toEqual({ inputTokens: 12, outputTokens: 4 });
    expect(res.reasoningApplied).toBe(false);
    expect(res.agentId).toBe("a1");
    expect(res.providerModel).toBe("claude-haiku");

    expect(generateTextSpy).toHaveBeenCalledTimes(1);
    const call = generateTextSpy.mock.calls[0]?.[0];
    expect(call).toMatchObject({
      system: "be brief",
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.5,
      maxOutputTokens: 100
    });
  });

  it("translates a generateText 503 error into kind=retryable", async () => {
    const apiErr = new APICallError({
      message: "Service unavailable",
      url: "https://api.test/v1",
      requestBodyValues: {},
      statusCode: 503,
      isRetryable: true
    });

    vi.doMock("ai", async () => {
      const actual = await vi.importActual<typeof import("ai")>("ai");
      return { ...actual, generateText: vi.fn().mockRejectedValue(apiErr) };
    });
    vi.doMock("@ai-sdk/anthropic", () => ({
      createAnthropic: () => (_modelId: string) => ({ specificationVersion: "v1", modelId: _modelId } as unknown)
    }));

    const { createApiRunner } = await import("../src/runtime/api.js");
    const runner = createApiRunner(
      "p1",
      {
        type: "api",
        family: "anthropic",
        baseURL: "https://api.test/v1",
        apiKeyEnv: "TEST_KEY",
        models: [{ id: "claude-haiku" }]
      },
      { TEST_KEY: "sk-test" }
    );

    await expect(
      runner.runTask({
        agent: {
          agent: { id: "a1", provider: "p1", model: "claude-haiku" },
          providerName: "p1",
          provider: {
            type: "api",
            family: "anthropic",
            baseURL: "https://api.test/v1",
            apiKeyEnv: "TEST_KEY",
            models: [{ id: "claude-haiku" }]
          },
          model: { id: "claude-haiku" }
        },
        request: { prompt: "hi" }
      })
    ).rejects.toMatchObject({ kind: "retryable" });
  });
});
