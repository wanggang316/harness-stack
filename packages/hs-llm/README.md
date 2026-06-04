# @hs/llm

A stateless TypeScript package and CLI for invoking large language models through a single uniform interface — whether the underlying provider is an HTTP API (OpenAI-compatible, Anthropic), a local coding-agent CLI subprocess (claude, codex, gemini, copilot, pi, opencode, droid, amp, generic), or a custom adapter you bring yourself.

`@hs/llm` is the runtime layer beneath harness-stack skills like `harness-stack:debate` and `harness-stack:decide`, but it is fully usable on its own as a CLI tool or imported as a library.

## Install

The package is not yet published to npm. Two install paths:

### From source (local)

Clone the harness-stack repo, build, and link the binary globally:

```bash
git clone https://github.com/wanggang316/harness-stack.git
cd harness-stack
pnpm install
pnpm --filter @hs/llm build

# Link the package globally. In pnpm 10 this command runs from inside
# the package directory; it does not compose with --filter or --global.
cd packages/hs-llm
pnpm link
cd -
```

After `pnpm link`, the binary lives at `$(pnpm bin -g)/hs-llm` (typically `~/Library/pnpm/hs-llm` on macOS, `~/.local/share/pnpm/hs-llm` on Linux). Make sure that directory is on your `PATH`:

```bash
hs-llm --help
```

To unlink later:

```bash
cd packages/hs-llm
pnpm unlink
```

> **Note.** `pnpm --filter @hs/llm link --global` will NOT work — pnpm 10 rejects `--filter` (which implies `--recursive`) on the `link` command. Run `pnpm link` from inside the package directory instead.

### Inside the harness-stack monorepo

Skills shipping inside this monorepo can use the binary directly without linking:

```bash
node packages/hs-llm/dist/cli.js --help
```

## Configure

`hs-llm` reads a JSON config file that lists providers (where to send requests) and agents (named bindings of provider + model + optional defaults).

### First-run bootstrap

```bash
hs-llm init
```

By default this writes a starter config to `~/.config/hs-llm/config.json`. The starter has three mock agents (so you can smoke-test without any API keys), Anthropic and OpenAI-compatible providers, and one Claude CLI agent.

After `init`, the printed next-step hints are:

```text
1. Edit ~/.config/hs-llm/config.json — remove agents you don't need.
2. Set the api key env vars for any api providers you keep:
     export ANTHROPIC_API_KEY=...
     export OPENAI_API_KEY=...
3. Run: hs-llm validate-config
4. Smoke test: hs-llm invoke --agent mock_a --prompt 'hi'
```

`init` flags:

- `--config <path>` — write somewhere other than the user-global default.
- `--force` — overwrite an existing file at the target path.

### Where the config is read from

When you run `hs-llm invoke` / `invoke-many` / `validate-config` without an explicit `--config <path>`, the binary resolves the config in this order and uses the first existing file:

1. `--config <path>` flag (or positional argument for `validate-config`).
2. `$HS_LLM_CONFIG` environment variable.
3. `./hs-llm.config.json` in the current working directory.
4. `$XDG_CONFIG_HOME/hs-llm/config.json` (default: `~/.config/hs-llm/config.json`).

If none of these exist, the command exits with status 3 and a message listing every path it tried.

### Provider types

| `type` | Notes |
|--------|-------|
| `api` | HTTP API. `family: "openai-compatible" \| "anthropic"`. Backed by Vercel AI SDK. API key resolved from the env var named in `apiKeyEnv`. |
| `cli` | Subprocess. `cliType` selects argument shape: `claude`, `codex`, `gemini`, `copilot`, `pi`, `opencode`, `droid`, `amp`, `generic`. Prompt is piped on stdin. |
| `sdk` | Bring-your-own. `adapter` is a local module path that exports a `createHsLlmAdapter` factory returning a `ProviderTaskRunner`. Bare module specifiers are rejected for safety. |
| `mock` | Deterministic in-memory provider for tests. `behavior: "deterministic" \| "timeout" \| "error" \| "malformed"`. |

See `examples/config.example.json` for a full example with all four provider types.

## Use

### CLI

```bash
# Validate the config (uses the resolution chain when no path is given).
hs-llm validate-config

# Single invocation. Prints JSON to stdout.
hs-llm invoke --agent haiku --prompt "Reply with the single word: ok"

# Single invocation, response written to a file, schema-validated.
hs-llm invoke \
  --agent haiku \
  --prompt-file ./prompt.txt \
  --schema-file ./expected-output.schema.json \
  --out ./result.json

# Fan out to several agents in parallel.
hs-llm invoke-many \
  --agents haiku,sonnet,gpt5 \
  --prompt "What database should we use for this load?" \
  --concurrency 3 \
  --out-dir ./results
```

Exit codes:

| Code | Meaning |
|------|---------|
| `0` | Success. `invoke-many` returns 0 even on partial failure — inspect each result's `status`. |
| `1` | Config error: no config found, validation failure, missing api key, unsupported provider type. |
| `2` | Invocation error: unknown agent, runtime failure from the underlying provider. |
| `3` | Usage error: missing flag, mutually exclusive flags, malformed schema file. |

### Library

```ts
import { invoke, invokeMany, loadConfig } from "@hs/llm";
import { z } from "zod";

const config = await loadConfig("./hs-llm.config.json");

const single = await invoke({
  config,
  agentId: "haiku",
  request: { prompt: "Reply with a single word: ok" }
});
console.log(single.text); // "ok"

const fanout = await invokeMany({
  config,
  invocations: [
    { agentId: "haiku", request: { prompt: "Q?" } },
    { agentId: "gpt5",  request: { prompt: "Q?" } }
  ],
  concurrency: 4
});

// Schema-constrained: returns res.parsed when the LLM output validates.
const schema = z.object({ answer: z.string(), confidence: z.number() });
const structured = await invoke<{ answer: string; confidence: number }>({
  config,
  agentId: "haiku",
  request: { prompt: "Answer in JSON with answer:string, confidence:number" },
  schema
});
console.log(structured.parsed); // { answer: "...", confidence: 0.x }
```

## Error taxonomy

`InvocationError.kind` is one of:

| Kind | Caller action |
|------|---------------|
| `config` | Fix the config or environment. Not retryable. |
| `timeout` | The request exceeded `timeoutMs`. Retryable by default policy. |
| `retryable` | Transient runtime error (network, 5xx, rate limit). Retryable. |
| `non-retryable` | Permanent runtime error (4xx, model-not-found, malformed). Do not retry. |
| `abort` | The caller's `AbortSignal` fired. Surface as cancellation. |

`withRetry` only retries `retryable` and `timeout`. The default `RetryPolicy` is `{ attempts: 3, backoffMs: 500, jitterPct: 25, maxWaitMs: 5000 }`.

## State and sessions

Every `invoke` is independent. The package never persists messages, never resumes a prior session, and never reads or writes anything outside the response. `request.traceabilityId` is forwarded to the underlying provider as a session/thread identifier (e.g. `claude --session-id`, `pi --session <tmpdir>/hs-llm-pi-<id>`) for log-correlation only — it is not used to recover prior exchanges.

If you need multi-turn behavior, construct the prompt yourself by concatenating prior responses; this package does not help with that.

## Reasoning effort

Adapters that expose a verified reasoning-effort knob (claude, codex, opencode) accept `request.reasoning: "minimal" | "medium" | "high"` and forward it. Adapters without one log a warning the first time per process and return `reasoningApplied: false` — the invocation still succeeds.

## Development

```bash
pnpm --filter @hs/llm test       # vitest unit tests
pnpm --filter @hs/llm typecheck  # tsc --noEmit
pnpm --filter @hs/llm build      # produces dist/

# Live API tests, opt-in:
HS_LLM_LIVE_TESTS=1 ANTHROPIC_API_KEY=... pnpm --filter @hs/llm test
```

`examples/config.example.json` round-trips through `validate-config` as part of the test suite, so the bundled example is always known-good.
