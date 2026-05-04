import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { buildBaseArgs, _resetReasoningWarnings } from "../src/runtime/cli.js";
import {
  invoke,
  validateConfig,
  type CliProviderConfig,
  type HsLlmConfig
} from "../src/index.js";

const FAKE_CLI = fileURLToPath(new URL("./fixtures/fake-cli.mjs", import.meta.url));

afterEach(() => {
  _resetReasoningWarnings();
});

describe("buildBaseArgs", () => {
  it("builds claude args with --print, --model, and reasoning when set", () => {
    const out = buildBaseArgs({ cliType: "claude", modelId: "claude-haiku", reasoning: "high" });
    expect(out.args).toEqual(["--print", "--model", "claude-haiku", "--effort", "high"]);
    expect(out.reasoningApplied).toBe(true);
  });

  it("builds claude args with --session-id when traceabilityId is provided, never --resume", () => {
    const out = buildBaseArgs({
      cliType: "claude",
      modelId: "claude-haiku",
      traceabilityId: "trace-abc"
    });
    expect(out.args).toEqual(["--print", "--model", "claude-haiku", "--session-id", "trace-abc"]);
    expect(out.args).not.toContain("--resume");
  });

  it("omits reasoning when claude has no reasoning input", () => {
    const out = buildBaseArgs({ cliType: "claude", modelId: "claude-haiku" });
    expect(out.args).toEqual(["--print", "--model", "claude-haiku"]);
    expect(out.reasoningApplied).toBe(false);
  });

  it("builds pi args with --model and --session under tmpdir when traceabilityId is provided", () => {
    const out = buildBaseArgs({ cliType: "pi", modelId: "pi-1", traceabilityId: "trace-xyz" });
    expect(out.args[0]).toBe("--model");
    expect(out.args[1]).toBe("pi-1");
    expect(out.args[2]).toBe("--session");
    expect(out.args[3]).toMatch(/hs-llm-pi-trace-xyz$/);
    expect(out.reasoningApplied).toBe(false);
  });

  it("returns reasoningApplied=false when pi is asked for reasoning (no-op fallback)", () => {
    const out = buildBaseArgs({ cliType: "pi", modelId: "pi-1", reasoning: "medium" });
    expect(out.reasoningApplied).toBe(false);
  });

  it("throws config error for unsupported cliTypes", () => {
    expect(() => buildBaseArgs({ cliType: "codex", modelId: "x" })).toThrow(
      expect.objectContaining({ kind: "config" })
    );
    expect(() => buildBaseArgs({ cliType: "generic", modelId: "x" })).toThrow(
      expect.objectContaining({ kind: "config" })
    );
  });
});

describe("createCliRunner end-to-end (fake binary)", () => {
  function buildConfig(extras: Partial<CliProviderConfig> = {}): HsLlmConfig {
    return validateConfig({
      version: 1,
      providers: {
        claude_p: {
          type: "cli",
          cliType: "claude",
          command: FAKE_CLI,
          models: [{ id: "claude-test" }],
          ...extras
        }
      },
      agents: [{ id: "claude_a", provider: "claude_p", model: "claude-test" }]
    });
  }

  it("invokes the binary with constructed argv and pipes the prompt envelope on stdin", async () => {
    const cfg = buildConfig();
    const res = await invoke({
      config: cfg,
      agentId: "claude_a",
      request: { prompt: "hello", system: "be brief" }
    });
    const echoed = JSON.parse(res.text) as { argv: string[]; stdin: string };
    // The first FAKE_CLI path is the script itself; subsequent argv come from buildBaseArgs + provider.args.
    expect(echoed.argv).toEqual(["--print", "--model", "claude-test"]);
    expect(echoed.stdin).toContain("# System\nbe brief");
    expect(echoed.stdin).toContain("# Task\nhello");
    expect(res.reasoningApplied).toBe(false);
    expect(res.providerModel).toBe("claude-test");
    expect(res.finishReason).toBe("stop");
  });

  it("forwards traceabilityId to claude as --session-id", async () => {
    const cfg = buildConfig();
    const res = await invoke({
      config: cfg,
      agentId: "claude_a",
      request: { prompt: "x", traceabilityId: "trace-abc" }
    });
    const echoed = JSON.parse(res.text) as { argv: string[]; stdin: string };
    expect(echoed.argv).toEqual(["--print", "--model", "claude-test", "--session-id", "trace-abc"]);
  });

  it("returns reasoningApplied=true when claude is invoked with reasoning", async () => {
    const cfg = buildConfig();
    const res = await invoke({
      config: cfg,
      agentId: "claude_a",
      request: { prompt: "x", reasoning: "high" }
    });
    expect(res.reasoningApplied).toBe(true);
    const echoed = JSON.parse(res.text) as { argv: string[] };
    expect(echoed.argv.slice(-2)).toEqual(["--effort", "high"]);
  });

  it("classifies non-zero exit with auth-error stderr as non-retryable", async () => {
    const cfg = buildConfig({
      env: { FAKE_CLI_EXIT: "1", FAKE_CLI_STDERR: "Error: invalid api key (401)" }
    });
    await expect(
      invoke({ config: cfg, agentId: "claude_a", request: { prompt: "x" } })
    ).rejects.toMatchObject({ kind: "non-retryable" });
  });

  it("classifies non-zero exit with generic stderr as retryable", async () => {
    const cfg = buildConfig({ env: { FAKE_CLI_EXIT: "1", FAKE_CLI_STDERR: "transient network blip" } });
    await expect(
      invoke({ config: cfg, agentId: "claude_a", request: { prompt: "x" } })
    ).rejects.toMatchObject({ kind: "retryable" });
  });

  it("rejects with kind=timeout when the cli outlives request.timeoutMs", async () => {
    const cfg = buildConfig({ env: { FAKE_CLI_SLEEP_MS: "300" } });
    await expect(
      invoke({ config: cfg, agentId: "claude_a", request: { prompt: "x", timeoutMs: 50 } })
    ).rejects.toMatchObject({ kind: "timeout" });
  });

  it("rejects with kind=config when the binary does not exist (ENOENT)", async () => {
    const cfg = validateConfig({
      version: 1,
      providers: {
        ghost: {
          type: "cli",
          cliType: "claude",
          command: "/nonexistent/path/to/no-such-binary",
          models: [{ id: "claude-test" }]
        }
      },
      agents: [{ id: "ghost_a", provider: "ghost", model: "claude-test" }]
    });
    await expect(
      invoke({ config: cfg, agentId: "ghost_a", request: { prompt: "x" } })
    ).rejects.toMatchObject({ kind: "config" });
  });

  it("rejects with kind=abort when the caller's signal fires mid-flight", async () => {
    const cfg = buildConfig({ env: { FAKE_CLI_SLEEP_MS: "300" } });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);
    await expect(
      invoke({
        config: cfg,
        agentId: "claude_a",
        request: { prompt: "x", abortSignal: controller.signal }
      })
    ).rejects.toMatchObject({ kind: "abort" });
  });
});
