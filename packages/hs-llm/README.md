# @hs/llm

A stateless TypeScript package that gives a single uniform interface for invoking large language models — whether through HTTP API, a local coding-agent CLI subprocess, or a custom adapter — from either TypeScript code or a shell command.

`@hs/llm` is the runtime layer beneath harness-stack skills like `hs-decide` and `hs-debate`. It does not implement debate, voting, claim catalogs, sessions, or any other policy. Those concepts belong to the skill layer; this package only knows how to send a prompt to a model and return the response.

## Install

This package is not published to npm. Inside the harness-stack monorepo:

```bash
pnpm install
pnpm --filter @hs/llm build
```

The CLI binary lives at `packages/hs-llm/dist/cli.js` after build. Wire it into your shell PATH or invoke it via `node packages/hs-llm/dist/cli.js`.

## Library usage

```ts
import { invoke, invokeMany, loadConfig } from "@hs/llm";
import { z } from "zod";

const config = await loadConfig("./hs-llm.config.json");

const single = await invoke({
  config,
  agentId: "haiku_test",
  request: { prompt: "Reply with a single word: ok" }
});
console.log(single.text); // "ok"

const fanout = await invokeMany({
  config,
  invocations: [
    { agentId: "haiku_test", request: { prompt: "Q?" } },
    { agentId: "claude_local", request: { prompt: "Q?" } }
  ],
  concurrency: 4
});
for (const r of fanout) {
  if (r.status === "ok") console.log(r.agentId, r.response.text);
  else console.error(r.agentId, r.error.kind, r.error.message);
}

// schema-constrained: returns res.parsed when the LLM output validates
const schema = z.object({ answer: z.string(), confidence: z.number() });
const structured = await invoke<{ answer: string; confidence: number }>({
  config,
  agentId: "haiku_test",
  request: { prompt: "Answer in JSON with answer:string, confidence:number" },
  schema
});
console.log(structured.parsed); // { answer: "...", confidence: 0.x }
```

## CLI usage

```bash
hs-llm validate-config ./hs-llm.config.json

hs-llm invoke \
  --config ./hs-llm.config.json \
  --agent haiku_test \
  --prompt "Reply with a single word: ok"

hs-llm invoke-many \
  --config ./hs-llm.config.json \
  --agents haiku_test,claude_local \
  --prompt-file ./prompt.txt \
  --concurrency 2 \
  --out-dir ./results

hs-llm invoke \
  --config ./hs-llm.config.json \
  --agent haiku_test \
  --prompt "..." \
  --schema-file ./expected-output.schema.json
```

Exit codes:

| Code | Meaning |
|------|---------|
| `0`  | Success. `invoke-many` returns 0 even on partial failure — inspect per-result `status`. |
| `1`  | Config error: bad path, validation failure, missing API key, unsupported provider type. |
| `2`  | Invocation error: unknown agent, runtime failure from the underlying provider. |
| `3`  | Usage error: missing flag, mutually exclusive flags, malformed schema file. |

## Provider types

The config file declares one or more providers under `providers`, then references them by name from `agents`.

| `type` | What it does |
|--------|--------------|
| `api`     | HTTP API. `family: "openai-compatible" \| "anthropic"`. Backed by Vercel AI SDK. API key resolved from the env var named in `apiKeyEnv`. |
| `cli`     | Subprocess. `cliType` selects argument shape from a fixed set: `claude`, `codex`, `gemini`, `copilot`, `pi`, `opencode`, `droid`, `amp`, `generic`. Prompt is piped on stdin. |
| `sdk`     | Bring-your-own. `adapter` is a local module path that exports a `createHsLlmAdapter` factory returning a `ProviderTaskRunner`. Bare module specifiers are rejected. |
| `mock`    | Deterministic in-memory provider for tests. `behavior: "deterministic" \| "timeout" \| "error" \| "malformed"`. |

See `examples/config.example.json` for a three-provider example.

## Error taxonomy

`InvocationError.kind` is one of:

| Kind | Caller action |
|------|---------------|
| `config`        | Fix the config or environment. Not retryable. |
| `timeout`       | The request exceeded `timeoutMs`. Retryable by default policy. |
| `retryable`     | Transient runtime error (network, 5xx, rate limit). Retryable. |
| `non-retryable` | Permanent runtime error (4xx, model-not-found, malformed). Do not retry. |
| `abort`         | The caller's `AbortSignal` fired. Surface as cancellation. |

`withRetry` only retries `retryable` and `timeout`. The default `RetryPolicy` is `{ attempts: 3, backoffMs: 500, jitterPct: 25, maxWaitMs: 5000 }`.

## State and sessions

Every `invoke` is independent. The package never persists messages, never resumes a prior session, and never reads or writes anything outside the response. `request.traceabilityId` is forwarded to the underlying provider as a session/thread identifier (e.g. `claude --session-id`, `pi --session <tmpdir>/hs-llm-pi-<id>`) for log-correlation only — it is not used to recover prior exchanges.

If a skill needs multi-turn behavior, it constructs the prompt itself by concatenating prior responses; this package does not help with that.

## Reasoning effort

Adapters that expose a verified reasoning-effort knob (claude, codex, opencode) accept `request.reasoning: "minimal" | "medium" | "high"` and forward it. Adapters without one log a warning the first time per process and return `reasoningApplied: false` — the invocation still succeeds.

## Development

```bash
pnpm --filter @hs/llm test       # vitest unit tests
pnpm --filter @hs/llm typecheck  # tsc --noEmit
pnpm --filter @hs/llm build      # produces dist/

HS_LLM_LIVE_TESTS=1 ANTHROPIC_API_KEY=... pnpm --filter @hs/llm test
```

The `examples/config.example.json` round-trips through `validate-config` as part of the test suite, so it's always known-good.
