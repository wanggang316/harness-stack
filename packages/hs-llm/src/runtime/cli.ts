import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CliProviderConfig, CliType, ReasoningLevel } from "../config/schema.js";
import { InvocationError, type InvocationErrorKind } from "./errors.js";
import { buildPromptEnvelope } from "./prompt.js";
import type {
  InvocationRequest,
  InvocationResponse,
  ProviderTaskRunner,
  ResolvedAgent
} from "./types.js";

export function createCliRunner(provider: CliProviderConfig): ProviderTaskRunner {
  return {
    async runTask({ agent, request }): Promise<InvocationResponse> {
      const start = Date.now();
      const prompt = buildPromptEnvelope({
        ...(agent.agent.role !== undefined ? { role: agent.agent.role } : {}),
        ...(request.system !== undefined ? { system: request.system } : {}),
        prompt: request.prompt
      });
      const { args, reasoningApplied } = buildBaseArgs({
        cliType: provider.cliType,
        modelId: agent.model.id,
        ...(request.reasoning !== undefined ? { reasoning: request.reasoning } : {}),
        ...(request.traceabilityId !== undefined ? { traceabilityId: request.traceabilityId } : {})
      });
      const allArgs = [...args, ...(provider.args ?? [])];
      const timeoutMs = request.timeoutMs ?? provider.defaultTimeoutMs;

      const result = await runCommand({
        command: provider.command,
        args: allArgs,
        stdin: prompt,
        ...(provider.cwd !== undefined ? { cwd: provider.cwd } : {}),
        env: { ...process.env, ...(provider.env ?? {}) },
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        ...(request.abortSignal !== undefined ? { abortSignal: request.abortSignal } : {})
      });

      return {
        agentId: agent.agent.id,
        providerModel: agent.model.id,
        text: result.stdout,
        finishReason: "stop",
        latencyMs: Date.now() - start,
        reasoningApplied
      };
    }
  };
}

interface BuildArgsInput {
  cliType: CliType;
  modelId: string;
  reasoning?: ReasoningLevel;
  traceabilityId?: string;
}

interface BuildArgsResult {
  args: string[];
  reasoningApplied: boolean;
}

const reasoningWarnedFor = new Set<CliType>();

export function buildBaseArgs(input: BuildArgsInput): BuildArgsResult {
  switch (input.cliType) {
    case "claude":
      return buildClaudeArgs(input);
    case "pi":
      return buildPiArgs(input);
    case "codex":
      return buildCodexArgs(input);
    case "gemini":
      return buildGeminiArgs(input);
    case "copilot":
      return buildCopilotArgs(input);
    case "opencode":
      return buildOpencodeArgs(input);
    case "droid":
      return buildDroidArgs(input);
    case "amp":
      return buildAmpArgs(input);
    case "generic":
      return buildGenericArgs(input);
  }
}

function buildClaudeArgs(input: BuildArgsInput): BuildArgsResult {
  const args: string[] = ["--print", "--model", input.modelId];
  let reasoningApplied = false;
  if (input.reasoning) {
    args.push("--effort", input.reasoning);
    reasoningApplied = true;
  }
  if (input.traceabilityId) {
    // session-id is for log correlation only; we deliberately never emit --resume.
    args.push("--session-id", input.traceabilityId);
  }
  return { args, reasoningApplied };
}

function buildPiArgs(input: BuildArgsInput): BuildArgsResult {
  // -p forces non-interactive mode; without it the binary launches a TUI even
  // when stdin is piped, which deadlocks under child_process.spawn.
  const args: string[] = ["-p", "--model", input.modelId];
  if (input.traceabilityId) {
    const sessionPath = join(tmpdir(), `hs-llm-pi-${input.traceabilityId}`);
    args.push("--session", sessionPath);
  }
  if (input.reasoning) warnReasoningUnsupportedOnce(input.cliType);
  return { args, reasoningApplied: false };
}

function buildCodexArgs(input: BuildArgsInput): BuildArgsResult {
  const args: string[] = ["exec", "--model", input.modelId];
  let reasoningApplied = false;
  if (input.reasoning) {
    args.push("--effort", input.reasoning);
    reasoningApplied = true;
  }
  if (input.traceabilityId) args.push("--session-id", input.traceabilityId);
  return { args, reasoningApplied };
}

function buildGeminiArgs(input: BuildArgsInput): BuildArgsResult {
  const args: string[] = ["--prompt-stdin", "--model", input.modelId];
  if (input.reasoning) warnReasoningUnsupportedOnce(input.cliType);
  if (input.traceabilityId) args.push("--session", input.traceabilityId);
  return { args, reasoningApplied: false };
}

function buildCopilotArgs(input: BuildArgsInput): BuildArgsResult {
  const args: string[] = ["suggest", "--model", input.modelId];
  if (input.reasoning) warnReasoningUnsupportedOnce(input.cliType);
  if (input.traceabilityId) args.push("--session-id", input.traceabilityId);
  return { args, reasoningApplied: false };
}

function buildOpencodeArgs(input: BuildArgsInput): BuildArgsResult {
  const args: string[] = ["run", "--model", input.modelId];
  let reasoningApplied = false;
  if (input.reasoning) {
    args.push("--effort", input.reasoning);
    reasoningApplied = true;
  }
  if (input.traceabilityId) args.push("--session", input.traceabilityId);
  return { args, reasoningApplied };
}

function buildDroidArgs(input: BuildArgsInput): BuildArgsResult {
  const args: string[] = ["run", "--model", input.modelId];
  if (input.reasoning) warnReasoningUnsupportedOnce(input.cliType);
  if (input.traceabilityId) args.push("--session", input.traceabilityId);
  return { args, reasoningApplied: false };
}

function buildAmpArgs(input: BuildArgsInput): BuildArgsResult {
  const args: string[] = ["--model", input.modelId];
  if (input.reasoning) warnReasoningUnsupportedOnce(input.cliType);
  if (input.traceabilityId) args.push("--thread-id", input.traceabilityId);
  return { args, reasoningApplied: false };
}

function buildGenericArgs(input: BuildArgsInput): BuildArgsResult {
  // The generic adapter just forwards the model id and lets the caller append
  // any binary-specific flags via the provider's `args` field. No reasoning
  // flag is emitted, no session concept is assumed.
  const args: string[] = ["--model", input.modelId];
  if (input.reasoning) warnReasoningUnsupportedOnce(input.cliType);
  return { args, reasoningApplied: false };
}

function warnReasoningUnsupportedOnce(cliType: CliType): void {
  if (reasoningWarnedFor.has(cliType)) return;
  reasoningWarnedFor.add(cliType);
  process.stderr.write(
    `[hs-llm] cliType '${cliType}' does not expose a verified reasoning flag; ignoring request.reasoning\n`
  );
}

// Test-only hook to reset the warn-once cache between tests.
export function _resetReasoningWarnings(): void {
  reasoningWarnedFor.clear();
}

export interface RunCommandInput {
  command: string;
  args: string[];
  stdin: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
}

export interface RunCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runCommand(input: RunCommandInput): Promise<RunCommandResult> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const onUserAbort = (): void => controller.abort(input.abortSignal?.reason);
    if (input.abortSignal) {
      if (input.abortSignal.aborted) controller.abort(input.abortSignal.reason);
      else input.abortSignal.addEventListener("abort", onUserAbort, { once: true });
    }
    let timer: NodeJS.Timeout | undefined;
    let timedOut = false;
    if (input.timeoutMs !== undefined) {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort(new Error(`timeout after ${input.timeoutMs}ms`));
      }, input.timeoutMs);
    }

    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      env: input.env,
      signal: controller.signal,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      cleanup();
      if (timedOut) {
        reject(new InvocationError("timeout", `cli command timed out after ${input.timeoutMs}ms`, { cause: err }));
        return;
      }
      if (input.abortSignal?.aborted || err.name === "AbortError") {
        reject(new InvocationError("abort", "cli command aborted", { cause: err }));
        return;
      }
      if (err.code === "ENOENT") {
        reject(
          new InvocationError("config", `cli command not found: ${input.command}`, { cause: err })
        );
        return;
      }
      reject(new InvocationError("non-retryable", `failed to spawn cli command: ${err.message}`, { cause: err }));
    });

    child.on("close", (exitCode: number | null) => {
      cleanup();
      if (timedOut) {
        reject(new InvocationError("timeout", `cli command timed out after ${input.timeoutMs}ms`));
        return;
      }
      if (input.abortSignal?.aborted) {
        reject(new InvocationError("abort", "cli command aborted by caller"));
        return;
      }
      if (exitCode === 0) {
        resolve({ stdout, stderr, exitCode });
        return;
      }
      const kind = classifyCliFailure(exitCode, stderr);
      reject(
        new InvocationError(
          kind,
          `cli command exited with code ${exitCode ?? "null"}: ${stderr.trim() || "(no stderr)"}`
        )
      );
    });

    // Pipe stdin; some CLIs require explicit end.
    child.stdin.end(input.stdin, "utf8");

    function cleanup(): void {
      if (timer !== undefined) clearTimeout(timer);
      input.abortSignal?.removeEventListener("abort", onUserAbort);
    }
  });
}

const NON_RETRYABLE_CLI_HINTS = [
  "invalid api key",
  "unauthorized",
  "permission denied",
  "model not found",
  "no such model",
  "billing",
  "quota exceeded",
  "invalid argument"
];

function classifyCliFailure(exitCode: number | null, stderr: string): InvocationErrorKind {
  const lower = stderr.toLowerCase();
  if (NON_RETRYABLE_CLI_HINTS.some((hint) => lower.includes(hint))) return "non-retryable";
  // Conservative default for subprocess flakes — many CLIs surface transient
  // network errors as non-zero exits without machine-readable codes.
  return "retryable";
}
