# Design Doc: hs-llm — Stateless LLM Provider Abstraction

**Status:** Approved
**Author:** Gump
**Date:** 2026-05-04

## Context and Scope

harness-stack is currently a markdown-only skills framework. Future skills `harness-stack:decide` (parallel-first decision support, Self-MoA pattern) and `harness-stack:debate` (multi-agent debate with anonymized peers) will need to invoke heterogeneous LLMs from skill instructions. Today, doing so requires each skill author to hand-roll subprocess spawns or HTTP calls — fragile, inconsistent, untestable.

`hs-llm` is the first TypeScript package introduced into the repo (under a new `packages/` workspace). Its only job is to provide a **uniform invocation surface** over four kinds of LLM access: HTTP APIs (OpenAI/Anthropic-compatible), local coding-agent CLIs (Claude Code, Inflection Pi, Codex, Gemini, etc.), custom user-supplied adapters, and a deterministic mock for tests.

The reference implementation is `argue-cli` (`~/dev/opensource/argue/packages/argue-cli/src/runtime/`), MIT-licensed. We adopt argue's *patterns* — discriminated-union provider config, `ProviderTaskRunner` interface, per-cliType arg construction, retryable/non-retryable error taxonomy — but reimplement to keep the dependency surface small and the contract narrower.

The package ships both a library API (TypeScript imports for direct consumers) and a CLI binary (`hs-llm`) invoked from skill markdown via Bash. Both surfaces dispatch to the same internal code path.

## Goals

- Uniform `invoke(agentId, request) → response` across api, cli, mock, sdk.
- Parallel `invokeMany` with per-agent partial-failure tolerance (one agent's error does not abort the others).
- Strict statelessness: each call is independent; no message history, no session, no shared cache across invocations.
- Zod-validated config; clear error taxonomy; deterministic retry policy.
- Strong CLI ergonomics: skills consume it from Bash without a wrapper.
- v0.1 covers two cliTypes (`claude`, `pi`); architecture supports the remaining seven (`codex`, `gemini`, `copilot`, `opencode`, `droid`, `amp`, `generic`) without redesign.

## Non-Goals

- **Debate / decision / voting / claims / rounds.** Skill-layer concerns; hs-llm has no concept of these.
- **Streaming responses.** Not in v0.1. Reconsider when a skill genuinely needs token-level UX (probably never for our use cases).
- **Tool use / function calling abstraction.** v0.1 returns text only. Tool calls land later, behind a separate API.
- **Embeddings, reranking, image/audio modalities.** Out of scope for v0.1.
- **Retry-with-modified-prompt strategies.** v0.1 retries verbatim; "try again with a hint" is a skill-level pattern.
- **Cross-invocation message history (chat-style multi-turn).** argue's API runner keeps a `messageHistory`; we explicitly do not. Skills that need multi-turn construct the full conversation per invocation.
- **Built-in observability backends.** We emit structured logs to stderr; we do not push to OTel, Sentry, or similar in v0.1.

## Design

### Overview

The chosen design is a **three-layer pipeline with a two-headed surface**:

```
                    ┌─ Library API (TS import) ─┐
                    └─ CLI binary (`hs-llm`)    ┘
                              │
                              ▼
                       Resolver layer
                  (config + agentId → resolved agent)
                              │
                              ▼
                       Runner layer
              (provider type → ProviderTaskRunner)
                              │
              ┌───────────────┼───────────────────┐
              ▼               ▼                   ▼
          api runner     cli runner          mock runner
        (Vercel AI SDK) (subprocess spawn)  (deterministic)
```

The central trade-off the design optimizes for is **statelessness vs. ergonomics**. Pure statelessness (every call resolves config from disk) is simple but slow and verbose for callers. Pure ergonomics (a long-lived client object holding state) breaks the "every call is independent" contract that makes the package easy to reason about in async, no-human-in-loop skills.

The chosen middle ground: callers pass an in-memory `HsLlmConfig` object (loaded once at the start of an invocation cycle), but **no resolver-layer or runner-layer state survives a single `invoke` / `invokeMany` call**. The `ProviderTaskRunner` instances are cached by provider name *within* a call (so 3 parallel invocations of the same provider share one runner), but the cache is discarded when the call returns.

This trade-off matters because the consuming skills (`harness-stack:decide`, `harness-stack:debate`) are themselves stateless: each user query starts a fresh sequence of `invoke` calls and ends when the report is written. Trying to share state across queries adds bug surface (stale auth tokens, leaked memory, race conditions in async code) for no real benefit.

### System Context Diagram

```
                     skill markdown                     TS consumer
                          │                                  │
                          │ Bash                             │ import
                          ▼                                  ▼
                  ┌───────────────────┐           ┌───────────────────┐
                  │  hs-llm CLI bin   │──delegates│   @hs/llm lib     │
                  │  (cli.ts entry)   │           │   (index.ts)      │
                  └───────────────────┘           └───────────────────┘
                                                            │
                                                            ▼
                                              ┌─────────────────────────┐
                                              │ Resolver + Registry     │
                                              │ (config → agent → run)  │
                                              └─────────────────────────┘
                                                            │
                              ┌─────────────────────┬───────┴───────┬─────────────────┐
                              ▼                     ▼               ▼                 ▼
                       ┌────────────┐        ┌────────────┐  ┌────────────┐    ┌────────────┐
                       │ api runner │        │ cli runner │  │ sdk runner │    │ mock runner│
                       │ (AI SDK)   │        │ (spawn)    │  │ (dyn impt) │    │ (in-mem)   │
                       └────────────┘        └────────────┘  └────────────┘    └────────────┘
                              │                     │               │
                              ▼                     ▼               ▼
                       Anthropic /            claude / pi /     user-supplied
                       OpenAI-compat /        codex / ...       adapter module
                       Bedrock / etc.         (subprocess)      (file:// import)
```

External dependencies entering the box:
- `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible` — HTTP layer.
- `zod` — config + optional output schema.
- Node built-ins: `child_process`, `fs/promises`, `path`, `url`, `crypto`.

No other runtime dependencies.

### Module Layout

```
packages/hs-llm/
├── package.json
├── tsconfig.json
├── README.md
├── examples/
│   ├── config.example.json
│   └── prompt.example.txt
├── src/
│   ├── index.ts            ← public library exports
│   ├── cli.ts              ← CLI binary entry
│   ├── errors.ts           ← InvocationError class + kind enum
│   ├── config/
│   │   ├── schema.ts       ← Zod schemas, exported types
│   │   └── load.ts         ← loadConfig, validateConfig
│   └── runtime/
│       ├── types.ts        ← runner interfaces, request/response shapes
│       ├── runner.ts       ← invoke, invokeMany top-level
│       ├── registry.ts     ← provider type → factory
│       ├── api.ts          ← Vercel AI SDK runner
│       ├── cli.ts          ← subprocess runner + cliType adapters
│       ├── sdk.ts          ← dynamic-import bring-your-own adapter runner
│       ├── mock.ts         ← deterministic mock runner
│       ├── retry.ts        ← retry policy + classification
│       ├── concurrency.ts  ← hand-rolled semaphore
│       └── schema.ts       ← optional output-schema enforcement
└── test/
    ├── unit/
    │   ├── mock.test.ts
    │   ├── api.test.ts
    │   ├── cli-args.test.ts        ← fake-binary harness
    │   ├── invoke-many.test.ts
    │   ├── retry.test.ts
    │   ├── schema.test.ts
    │   └── sdk.test.ts
    ├── integration/
    │   └── cli-bin.test.ts          ← runs built `dist/cli.js`
    └── live/
        └── api-live.test.ts         ← gated by HS_LLM_LIVE_TESTS=1
```

**Public surface from `index.ts`:**

```
// types
export type { HsLlmConfig, ResolvedAgent, InvocationRequest, InvocationResponse,
              InvocationError, InvocationErrorKind, InvokeManyResult,
              RetryPolicy } from "./runtime/types.js";

// callables
export { invoke, invokeMany } from "./runtime/runner.js";
export { loadConfig, validateConfig } from "./config/load.js";

// schemas (for advanced consumers who want the raw Zod)
export { HsLlmConfigSchema, AgentSchema, ProviderSchema } from "./config/schema.js";
```

Everything else (`runtime/registry.ts`, `runtime/api.ts`, ...) is internal.

### API Design

**Library API** (sketch — full signatures in ExecPlan §Interfaces):

- `invoke({ config, agentId, request, schema?, retry? }) → Promise<InvocationResponse & { parsed?: T }>`
- `invokeMany({ config, invocations, concurrency?, retry? }) → Promise<InvokeManyResult>`
- `loadConfig(path) → Promise<HsLlmConfig>` — read + validate.
- `validateConfig(unknown) → HsLlmConfig` — validate already-parsed object.

**CLI binary** — three subcommands. Stable contract after Slice 6:

- `hs-llm invoke --config <path> --agent <id> [--prompt <str> | --prompt-file <path>] [--system <str>] [--temperature <num>] [--timeout-ms <num>] [--schema-file <path>] [--out <path>]`
  - Output: JSON to `--out` (default stdout). Exit 0 on success, 1 on config error, 2 on invocation error, 3 on usage error.
- `hs-llm invoke-many --config <path> --agents <a,b,c> [--prompt <str> | --prompt-file <path>] [--parallel | --serial] [--concurrency <n>] [--out-dir <dir>]`
  - Writes one result file per agent + `_index.json` summary. **Exit 0 even on partial failure** (the `_index.json` carries error info).
- `hs-llm validate-config <path>` — exit 0 if valid, 1 otherwise; print errors.

The CLI is intentionally thin: it parses argv, builds a `HsLlmConfig` and `InvocationRequest`, calls library functions, serializes the result. Skills depend on the JSON shape, not on TS types.

### Component Boundaries

**Dependency direction**, strictly one-way:

```
    cli.ts         index.ts
       └──────┬──────┘
              ▼
        runtime/runner.ts
              │
              ▼
        runtime/registry.ts
              │
       ┌──────┼──────┬──────┬──────┐
       ▼      ▼      ▼      ▼      ▼
       api    cli    sdk    mock   schema/retry/concurrency
              │
              ▼
       config/schema.ts (types only, used as input)
```

- `cli.ts` and `index.ts` are siblings; both call into `runtime/runner.ts`.
- `runtime/runner.ts` calls `runtime/registry.ts` to obtain a runner.
- Each runner module (`api.ts`, `cli.ts`, `sdk.ts`, `mock.ts`) is independently testable, depends only on `runtime/types.ts` + standard libs + its own external deps.
- `errors.ts` is a leaf: imported by everyone, depends on nothing.
- **Runners do not know about each other.** Adding a new runner means adding a file + registering it in `registry.ts`. No other site changes.

## Resolutions to the Eight Open Questions

This section is the heart of the doc. Each subsection presents alternatives, the rationale for the chosen path, and the contract the implementation must follow.

### Q1 — Naming of the 4th provider type

**Chosen: keep `sdk` (matches argue convention).**

The mechanism is dynamic-import of a user-supplied adapter module — it is *not* a vendor SDK integration, so the name is somewhat misleading on first read. The earlier draft of this doc proposed renaming to `plugin`, but the user accepts the misleading-name tax in exchange for: (a) cognitive alignment with argue (anyone who has read argue immediately knows what this is), (b) avoiding bikeshedding cost, (c) the README can clarify the semantics in one sentence at first mention.

**Alternatives:**

- **Rename to `plugin`** — clearer name. Rejected by user: the argue parallel is more valuable than the precision.
- **Rename to `adapter`** — accurate. Rejected: collides with our internal "adapter" terminology for the cliType-specific arg builders inside `runtime/cli.ts`.
- **Rename to `module`** — implementation-accurate. Rejected: too generic.
- **Omit from v0.1** — simplest. Rejected: the SDK escape hatch is exactly what we'll need to integrate `@anthropic-ai/claude-code`, AWS Bedrock direct, and similar non-OpenAI-compatible flows. Skipping it now would constrain future skill design. Cheap to include.

**Contract:**

```
{
  "type": "sdk",
  "adapter": "./adapters/anthropic-native.mjs",   // or absolute path or bare specifier
  "exportName": "createHsLlmSdkAdapter",          // default
  "env": { "ANTHROPIC_API_KEY": "..." },
  "models": { "...": {} }
}
```

The adapter module exports a factory that returns `{ runTask(args) → Promise<{ text, finishReason?, usage?, latencyMs }> }`. The runtime resolves `adapter` relative to the config file's directory if it starts with `./` or `/`, otherwise treats it as a bare specifier and tries `import()` directly (which respects `node_modules`).

**README clarification (mandatory)**: the package README must, at first mention of the `sdk` provider type, state: *"`sdk` here means 'bring-your-own adapter module' — it is a user-extension point, not an integration with any specific vendor SDK. The name is inherited from argue."*

### Q2 — Schema-constrained output mechanism

**Chosen: accept Zod schema in library mode, JSON Schema (Draft 2020-12) in CLI mode; convert JSON Schema → Zod via `json-schema-to-zod` at the boundary.**

Library callers already use TypeScript and almost certainly have Zod available; making them re-author their schemas in JSON Schema is friction. CLI callers (skill markdown via Bash) do not author TypeScript and need a portable, file-readable format — JSON Schema is the obvious choice.

**Alternatives:**

- **Zod only** — clean for library, blocks CLI authors who don't write TS. Rejected.
- **JSON Schema only** — works for CLI, but library users would have to write JSON Schema strings or use a Zod-to-JSON converter. Rejected: degrades the typed-API experience.
- **Built-in named schemas** ("structured-claim", "decision-with-confidence", ...) — limits authors to schemas we ship. Rejected: we don't know what skill authors will need.
- **Custom DSL** — never. Rejected without further consideration.

**Contract:**

- Library: `invoke({ ..., schema: ZodSchema<T> })` returns `{ ..., parsed: T }`.
- CLI: `--schema-file <path-to-json-schema.json>` → loaded, converted to Zod, applied. The result JSON includes a `parsed` field.
- On parse/validate failure, retry up to 2 times with an appended message (`"Your previous output failed validation: <error message>. Return only valid JSON matching the schema."`). After exhaustion, throw `non-retryable` and surface the last raw output for debugging.
- For `api` runner with `@ai-sdk/openai-compatible` and a known-good model, prefer `generateObject` over `generateText` to use native structured output. For other runners (`cli`, `sdk`, `mock`), use the parse-and-retry path.

`json-schema-to-zod` is a small, no-deps package — acceptable cost.

### Q3 — Module layout and public API surface

**Chosen: see "Module Layout" subsection above.**

The principle: `index.ts` exports only what callers need to use the library; `runtime/*.ts` modules are internal and may change shape between versions. Internal coupling is enforced by a pre-publish ESLint rule that bans deep imports into `runtime/`.

**Alternative considered:** flat module ("everything from index.ts"). Rejected: forces every consumer's bundler to pull in all four runners even if they only use mock in tests. The current layout enables tree-shaking.

### Q4 — Error taxonomy granularity

**Chosen: 5 kinds: `config`, `timeout`, `retryable`, `non-retryable`, `abort`.**

argue uses 2 kinds (`retryable` / `non-retryable`). We expand to 5 because the consumers (`harness-stack:decide`, `harness-stack:debate`) make different decisions per kind:

- `config` — author-time error (bad config file, unknown agent ID, missing API key env var). Surfaces immediately to the user; never retried.
- `timeout` — exceeded `timeoutMs`. **Retryable**, but reported separately because the right response is often "increase timeout" rather than "retry blindly". Skills can decide whether to re-attempt.
- `retryable` — transient: HTTP 408/409/425/429/5xx, network errors (ECONNRESET, ETIMEDOUT, EAI_AGAIN), rate limit, "service unavailable". Auto-retried by the runtime per `RetryPolicy`.
- `non-retryable` — permanent: HTTP 400/401/403/404/422, "invalid model", "authentication failed", subprocess exit code != 0 with structural-error stderr. Retrying does not help.
- `abort` — caller-cancelled via `AbortSignal`. Distinct from `timeout` because the caller did it deliberately.

**Alternatives:**

- **2 kinds (argue parity)** — simpler, but skills need to grep error messages to distinguish "config" from "non-retryable" etc. Rejected.
- **More granular (10+ kinds)** — overspecified, hard to map new error sources. Rejected.

The 5 kinds correspond to 5 behaviors at the consumer level, each documented in `errors.ts`.

### Q5 — Concurrency control in `invokeMany`

**Chosen: hand-rolled semaphore in `runtime/concurrency.ts`. Default `concurrency = invocations.length` (full parallel). Caller may set lower.**

The semaphore is ~30 lines. It avoids a dependency (`p-limit` or similar) for a trivial primitive.

**Alternatives:**

- **`p-limit` dependency** — well-tested, but it's another runtime dep for a non-essential function. Rejected.
- **`Promise.all` with no limit** — fine for our typical N=3-5, but unsafe if a skill author somehow passes N=100 (rate-limit storm, subprocess fork bomb). Rejected — must have a knob.
- **Sequential with `--serial` flag in CLI** — already present as an alternative to `--parallel`. Useful when a CLI provider can't be invoked in parallel safely (e.g., shared on-disk session files).

**Contract:**

- `invokeMany` runs invocations through the semaphore.
- Errors in one invocation **never** abort others; results array preserves input order; each entry is `{ status: "ok" | "error", ... }`.
- Default concurrency = full parallel. If `concurrency < 1` or unset → unlimited.

### Q6 — CLI provider's session/state contract

**Chosen: pass-through traceability only. Each `invoke` is structurally a fresh session at the LLM-provider level; we pass `--session-id <uuid>` (claude) or `--session <tmp-path>` (pi) when caller supplies an opaque `traceabilityId` in the request, but we never use `--resume`, never persist session files between invocations, and we document that any cross-invocation memory belongs to the caller.**

argue uses `participantSessionKey` to chain calls within a debate (so a debater "remembers" what it said in round 1 when responding in round 2). hs-llm rejects this because:

1. argue's session chain is part of *engine state*; we have no engine.
2. Skill-layer multi-turn (e.g., `harness-stack:debate` round 2 sees round 1's outputs) is implemented by **constructing a longer prompt** that includes prior context — not by relying on provider-side session memory. This is more portable: API providers, mock, and sdk runners all support "longer prompts"; not all support sessions.
3. Cross-invocation session files (pi's `--session <path>`) are a maintenance burden (tmp-dir cleanup, concurrent access, stale state).

**Alternatives:**

- **Full session passthrough (argue-parity)** — would let hs-llm-driven skills exploit native session memory of CLIs. Rejected: leaks state, breaks portability across runner types, complicates testing.
- **Omit session flags entirely** — simplest. Rejected: skills may want a stable session ID for telemetry / log correlation, even if functionally meaningless. Cost of pass-through is zero.

**Contract:**

- `InvocationRequest.traceabilityId?: string` — optional. If present:
  - For `claude`: emit `--session-id <id>` (no `--resume`).
  - For `pi`: emit `--session <os.tmpdir()>/hs-llm-pi-<id>` and let pi create the file. We do not delete it (operator's responsibility); we document that with `traceabilityId` set, repeated calls *will* append to the same pi session file by the OS — this is a deliberate operator-controlled escape hatch, not the recommended path.
- For all other cliTypes: `traceabilityId` is logged but not passed to the binary.
- For `api` and `sdk`: `traceabilityId` is included in stderr log lines for correlation, never sent to the model.

### Q7 — Retry policy defaults and retryable-error classification

**Chosen defaults: 3 attempts (1 initial + 2 retries), exponential backoff base 500ms, jitter ±25%, max wait 5s. Retryable iff error kind ∈ {`retryable`, `timeout`}. `config`, `non-retryable`, `abort` never retry.**

Classification logic (lifted in spirit from argue's `classifyApiError`, narrowed):

- HTTP status code: 408, 409, 425, 429, 500-599 → `retryable`. 400, 401, 403, 404, 422 → `non-retryable`. Other 4xx → `non-retryable` by default.
- Error message contains (case-insensitive) any of: `rate limit`, `too many requests`, `timeout`, `timed out`, `temporarily unavailable`, `service unavailable`, `network`, `econnreset`, `etimedout`, `eai_again` → `retryable` (only if HTTP status doesn't already classify).
- Error message contains: `unauthorized`, `forbidden`, `invalid api key`, `authentication`, `invalid model`, `model_not_found`, `not found` → `non-retryable`.
- For `cli` runner: subprocess exit code != 0 → inspect stderr; if it matches `retryable` patterns → `retryable`; else → `non-retryable`.
- For `mock` runner: `behavior: "error"` → `non-retryable` by default; `behavior: "timeout"` → `timeout`.
- Default for unknown errors: `non-retryable`. We prefer to fail fast and let the caller decide than burn budget on misclassified retries.

**Contract:**

- `RetryPolicy = { attempts: number; backoffMs: number; maxBackoffMs?: number; jitter?: number }`
- Library: per-call `retry?: RetryPolicy` overrides default.
- CLI: `--retry-attempts`, `--retry-backoff-ms`, `--no-retry` flags.
- Retries log to stderr with structured prefix `[hs-llm retry] agent=X attempt=N kind=Y waitMs=Z`.

**Alternative considered:** circuit breaker (open after N consecutive errors per provider). Rejected for v0.1: stateless contract precludes cross-invocation circuit state. If a skill needs this, it can implement it on top.

### Q8 — Reasoning effort flag handling for CLI tools that don't support it

**Chosen: warn once per process per cliType, then ignore the flag and proceed. Do not throw.**

argue's behavior is `warnUnsupportedReasoning`: print to stderr once, set `reasoningApplied: false`. We adopt this verbatim. Reason: a skill author may legitimately specify `reasoning: "high"` at the agent level, and at config-load time we cannot know which cliType the agent resolves to (well, we can, but the warning is more useful at first-use than at config-validation, because operators don't always trip config-validate before running).

Where it bites: a config has both `claude` (reasoning supported via `--effort`) and `gemini` (no reasoning flag) agents, all set to `reasoning: "high"`. The first invocation of a `gemini` agent prints:

```
[hs-llm warning] reasoning='high' configured for cliType 'gemini', but this adapter has no verified reasoning flag. Ignoring. Open an issue if this is wrong.
```

The invocation proceeds normally without the flag.

**Alternatives:**

- **Throw on unsupported reasoning** — strict, but hostile to mixed configs. Rejected.
- **Silently ignore** — easy to miss configuration errors. Rejected.
- **Validate at config-load time** — requires duplicating cliType-capability knowledge in two places. Rejected: warn-on-first-use is good enough.

**Contract:**

- Per-process, per-cliType: warn once on stderr, then ignore.
- The response object includes `reasoningApplied: boolean` so callers (and tests) can assert it.

## Alternatives Considered (System-Level)

These are alternatives to the *whole approach*, not to individual sub-decisions.

### A1 — Vendor (fork) argue directly

Could fork `argue-cli` and strip its engine, keeping just the runtime. Rejected because:
- argue's `runtime/types.ts` is tightly coupled to argue's `AgentTaskInput` (round/phase/claimCatalog) — we'd have to rewrite the public types anyway.
- argue depends on its `@onevcat/argue` engine package as a peer; cutting that loose is half the work of rewriting.
- Maintenance: tracking upstream changes means our package gets engine-shaped commits we don't want.

### A2 — Bake LLM access into each skill (no shared package)

Each skill writes its own subprocess spawn or HTTP call. Rejected because:
- `harness-stack:decide` and `harness-stack:debate` would diverge in error handling, retry, validation — exactly the bugs that hurt async no-human-in-loop systems.
- Any future skill needing LLM access starts from zero.
- argue's engine validates this approach is wrong: they explicitly factored out a runtime layer.

### A3 — Single-binding API (Anthropic only)

Skip the multi-provider abstraction; just call the Anthropic SDK directly. Rejected because:
- The `harness-stack:debate` skill *requires* heterogeneity (Du et al. 2023, "Stop Overvaluing MAD" 2025) — different model families are a hard requirement, not a nice-to-have.
- Reduces to a single-vendor decision system, which the research portion of the conversation explicitly identified as a regression.

### A4 — Use LangChain or LlamaIndex

They provide multi-provider abstractions out of the box. Rejected:
- Heavy: large transitive dependency trees.
- Opinionated: come with chains/agents/memory abstractions that conflict with our "stateless tool" contract.
- Velocity: their APIs change frequently; we'd be maintenance-on-someone-else's-roadmap.

## Cross-Cutting Concerns

### Security

- **API keys** are read from environment variables named in config (`apiKeyEnv`). Never written to logs, never echoed in error messages. Library-mode callers may also pass the key directly via a programmatic override (deferred to v0.2).
- **`sdk` provider dynamic import** is the highest-risk surface: a malicious config file can name an arbitrary module to import. Mitigations:
  1. Document explicitly in README: "treat config files as code; review before loading from untrusted sources."
  2. Reject path specifiers containing `..` segments.
  3. In CLI mode, `validate-config` does *not* load sdk adapters — only `invoke` does, and only when the sdk agent is actually invoked.
  4. v0.2 may add an opt-in allowlist (`sdkAdaptersAllowlist: ["./adapters/"]`).
- **Subprocess spawning**: `child_process.spawn` with `shell: false` always. Args constructed as arrays, never concatenated into a shell string. User-supplied template variables (`{requestId}` etc.) are substituted into argv strings, but argv strings are never passed to a shell.
- **Prompt injection** (skill author's prompt vs. LLM output): out of scope for hs-llm. Caller's responsibility.

### Observability

- Structured stderr logs at three levels: `error`, `warn`, `info` (default). Each line is `[hs-llm <level>] key1=val1 key2=val2 ...`. Tests assert presence/absence of these lines.
- The `InvocationResponse` includes `latencyMs`, `usage` (when provider reports it). `invokeMany` aggregates total wall-clock and per-agent latencies in `_index.json`.
- No metric backend integration in v0.1. A future `hs-llm metrics` subcommand could ingest `_index.json` files into Prometheus / OTel.

### Testing strategy

- Unit tests (`test/unit/`): runners are tested in isolation. CLI runner uses a fake-binary harness — a small Node script that echoes its argv and stdin to a JSON file, so we can assert exact arg construction without depending on a real `claude`/`pi` install.
- Integration tests (`test/integration/`): build the CLI binary, spawn `node dist/cli.js ...` from tests, verify exit codes and JSON output.
- Live tests (`test/live/`): gated by `HS_LLM_LIVE_TESTS=1`. Hit a real Anthropic Haiku endpoint with a < 100-token prompt. Skipped in CI by default; runnable locally pre-release.
- Coverage target: ≥ 80% for `runtime/*`. The CLI binary entrypoint may be lower; integration tests cover its happy paths.

### Migration / rollout

- Repo already has Slice 1 (TS toolchain) as a structural change. Ship `hs-llm` as `0.0.x` until the public API has been validated by `harness-stack:decide` and `harness-stack:debate` ExecPlans. Bump to `0.1.0` when both consumer skills land.
- No data migration (stateless package).
- Rollback: deleting `packages/hs-llm/` and reverting `package.json`/`pnpm-workspace.yaml` is the rollback. No external systems touched.

## Risks

**R1 — TS toolchain in a markdown-only repo confuses contributors.** Mitigation: README in `packages/hs-llm/` includes a "Why is there TypeScript here now?" section. AGENTS.md gets a "Packages" line pointing into the package. Existing skills do not require Node to render or be invoked.

**R2 — `pi` CLI behavior changes between versions.** Pi is a less-stable target than Claude Code. Mitigation: pin tested pi version in README; live smoke test asserts exit code + non-empty stdout, not exact format. Failure mode is graceful: response text comes back as whatever pi prints; downstream schema validation (Slice 7) would catch malformed JSON.

**R3 — `sdk` provider dynamic import as security surface.** Already discussed under Security. Risk-residual: medium. Mitigation: documentation + path-rejection rules. v0.2 considers allowlist.

**R4 — `invokeMany` rate-limit storms.** A skill that calls `invokeMany` with N=20 against a real API can trigger rate limits across all 20. Mitigation: default `concurrency` capped at 8 if not set explicitly; document this in README. Skills opt in to higher fan-out.

**R5 — JSON Schema → Zod conversion edge cases.** `json-schema-to-zod` does not cover every JSON Schema feature (oneOf with discriminator, conditional schemas). Mitigation: ship with a known-good subset documented in README; failures during conversion produce a `config`-kind error at invocation time with the underlying message preserved.

**R6 — Vercel AI SDK API churn.** Major-version bumps of `ai` have changed `generateText`/`generateObject` signatures historically. Mitigation: pin to a single major (`ai ^4.x`); upgrade is a deliberate version bump with full test sweep.

---

DESIGN DOC READY FOR REVIEW:
- Title: hs-llm — Stateless LLM Provider Abstraction
- Key trade-off: statelessness vs. ergonomics — chose per-call statelessness with within-call runner caching, rejecting both pure stateless (slow/verbose) and stateful client (bug surface)
- Alternatives considered: 4 system-level + 8 question-level resolutions with rationales
- Cross-cutting concerns addressed: security, observability, testing, migration/rollback
→ Approve, or tell me what to change.
