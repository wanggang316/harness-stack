# ExecPlan: hs-llm — Stateless LLM Provider Abstraction Package

**Status:** Approved
**Author:** Gump
**Date:** 2026-05-04
**Design doc:** `docs/design-docs/hs-llm.md` (Approved)

This is a living document. The Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective sections must be kept up to date as work proceeds.

## Purpose

After this plan is implemented, a skill author (e.g., the future `hs-decide` and `hs-debate` skills) can invoke any configured LLM — whether through HTTP API, a local coding-agent CLI subprocess, or a custom adapter — through a single uniform interface, from either TypeScript code or a shell command. The author specifies "which agent" by ID (resolved against a JSON config) and what prompt to send; the package hides the differences between OpenAI-compatible APIs, Anthropic APIs, and the nine supported coding-agent CLIs (`claude`, `codex`, `gemini`, `copilot`, `pi`, `opencode`, `droid`, `amp`, `generic`).

Concretely, after this plan:

1. Running `pnpm --filter @hs/llm build` from the repo root produces a working package.
2. Running `pnpm --filter @hs/llm test` passes.
3. From a skill's Bash step: `hs-llm invoke --config ./hs-llm.config.json --agent reviewer --prompt-file ./prompt.txt --out ./result.json` returns a JSON file with the LLM's response.
4. From TypeScript: `import { invoke, invokeMany } from "@hs/llm"` calls work with full type safety.
5. `hs-llm invoke-many --agents a,b,c --parallel` runs multiple agents concurrently and tolerates partial failure (one agent's error does not abort the others).

The package is **stateless and business-logic-free**: it does not know about debate, voting, claims, rounds, or sessions. Those concepts live in the consuming skills.

## Progress

- [x] Slice 1 — Repo TS toolchain bootstrap (pnpm workspace, root tsconfig, root package.json) — 2026-05-04
- [x] Slice 2 — Package skeleton, config schema, types, and mock provider with library `invoke()` — 2026-05-04
- [x] Slice 3 — API provider (OpenAI-compatible + Anthropic-compatible) via Vercel AI SDK — 2026-05-04
- [x] Slice 4 — CLI provider for `claude` and `pi` cliType (subprocess spawn) — 2026-05-04
- [ ] Slice 5 — `invokeMany()` with partial-failure tolerance and retry/timeout policy
- [ ] Slice 6 — CLI binary `hs-llm` exposing `invoke` and `invoke-many` commands
- [ ] Slice 7 — Optional Zod schema-constrained output (validate + retry-on-parse-failure)
- [ ] Slice 8 — Remaining CLI adapters (gemini, copilot, pi, opencode, droid, amp, generic) and SDK provider
- [ ] Slice 9 — Documentation: README, examples/config.example.json, integration recipe for skills

## Surprises & Discoveries

- **2026-05-04, Slice 1.** Local pnpm is 10.30.3 (plan said `pnpm@9`). Tooling resolved cleanly under pnpm 10; no migration needed. Adopted pnpm 10 to match the host environment.
- **2026-05-04, Slice 1.** `pnpm install` warning: "Ignored build scripts: esbuild@0.21.5, esbuild@0.27.7" — these come from `vitest`/`tsx`. Build scripts are blocked by default in pnpm 10 unless allowed. Vitest still runs at this slice's verification level; we will revisit by running `pnpm approve-builds` if Slice 2 tests fail.
- **2026-05-04, Slice 2.** Vitest ran without needing `pnpm approve-builds` — esbuild's optional build scripts are not required for the use case at hand. Resolved without action.
- **2026-05-04, Slice 2.** With `noUncheckedIndexedAccess`, indexed access on `config.providers["name"]` returns `T | undefined`. Required defensive narrowing in `runner.ts`, `load.ts`, and the test helper. The strictness paid off — caught two off-by-one assumptions during authoring.
- **2026-05-04, Slice 2.** Workspace devDeps (typescript, vitest, tsx, prettier) at the root are accessible to packages via PATH inheritance when scripts are run through `pnpm --filter`. Per-package devDeps not needed for the shared toolchain — only runtime deps (zod) live under `packages/hs-llm/dependencies`.
- **2026-05-04, Slice 1+2 review (round 1).** Code-reviewer + test-engineer dispatched in parallel via `hs-review-request`. Verdict: Approve with fixes. Critical findings concentrated in test coverage gaps (cache reuse, malformed assertion looseness, validateConfig referential checks, abort path). Important findings: `applyAgentDefaults` only indirectly tested, `exports` map key order in `package.json` (must be `types` before `import`). All Critical and Important findings applied; tests grew from 7 → 18.
- **2026-05-04, Slice 3.** Vercel AI SDK ecosystem has migrated to `LanguageModelV2` interface. The plan's `ai@^4` is V1; `@ai-sdk/openai-compatible@^1` already publishes V2 models, so the V1+V2 mix produced a TS2322 type error on the openai-compatible factory. Resolved by upgrading to coherent V2 stack: `ai@^6`, `@ai-sdk/anthropic@^2`, `@ai-sdk/openai-compatible@^1`. API surface change: `maxTokens → maxOutputTokens`, `usage.{prompt,completion}Tokens → usage.{input,output}Tokens` — the latter happens to match hs-llm's own field names exactly, so no shape translation is needed.
- **2026-05-04, Slice 3.** First implementation of `isAbortError` matched any error whose message contained "aborted" or "timeout" — false-positively catching `APICallError(statusCode: 408, message: "Request timeout")` and routing it through the abort branch. Reordered classification so `APICallError` is checked first, and tightened `isAbortError` to name-only (`AbortError`/`TimeoutError`). Test fixture pinned the bug.
- **2026-05-04, Slice 4.** Test-fixture argv ordering bug: when the fake CLI script was invoked as `node fake-cli.mjs --print --model X`, Node parsed `--print` and `--model` as its own flags (`bad option`). Fix: shebang the fixture (`#!/usr/bin/env node`), `chmod +x`, and configure `command: FAKE_CLI_PATH` directly with empty `args` list. This matches how production cliType configs work — the binary is invoked directly with its own flags.
- **2026-05-04, Slice 4 + planning-refs feedback.** User flagged that comments and tests referenced plan/decision identifiers ("Q6", "Q8", "Slice 8"). Stripped all such references from `src/` and `test/`; kept rationale in plain behavioral language. Plan and design doc remain the source of truth for decision history. Memory entry saved as `feedback_no_planning_refs_in_code` so future slices follow the convention.

## Decision Log

**D1 — Stateless tool, business logic in skill layer.** Confirmed with user. The package exposes `invoke` / `invokeMany` only; it does not implement debate rounds, voting, claim catalogs, or session state. Rationale: keeps the package reusable across multiple skills (`hs-decide`, `hs-debate`, future skills) and decouples runtime from policy.

**D2 — Library API + CLI binary, both shipped.** The CLI is the primary surface for skills (skill markdown invokes Bash); the library API exists for downstream TS consumers and tests. The CLI is a thin wrapper over the library.

**D3 — Vercel AI SDK for the API layer.** Same choice as argue. Provides `@ai-sdk/openai-compatible` and `@ai-sdk/anthropic` factories, structured-output support, and a stable abstraction over provider quirks. Rejected: rolling our own HTTP client (more code, less battle-tested); LangChain (too heavy, opinionated abstractions).

**D4 — pnpm workspace, even for a single package today.** Future-proofs the repo for additional packages without restructuring. Lockfile semantics are stricter than npm. Confirmed with user.

**D5 — Reuse argue's runtime patterns wholesale, but no code copy-paste from argue.** argue is MIT-licensed (LICENSE file confirmed), but we will reimplement to keep the dependency surface small and the contract narrower (no engine-level concepts). The patterns we adopt: discriminated-union provider config, `ProviderTaskRunner` interface, per-cliType `buildBaseArgs` switch, retryable/non-retryable error classification.

**D6 — Defer 7 of 9 CLI adapters to Slice 8.** Slice 4 implements only `claude` and `pi` because (a) those are the two locally available for end-to-end testing in the current environment (Codex is temporarily rate-limited and excluded from the v0.1 smoke path), (b) `claude` (Claude Code CLI) and `pi` (Inflection Pi CLI) exercise two distinct code paths — `claude` uses `--print` + stdin and supports `--session-id` / `--resume`; `pi` uses `--model` + stdin with optional `--session <path>` for session-on-disk semantics — giving meaningful coverage of the cliType switch logic, (c) the remaining seven adapters follow the same pattern and can be added incrementally in Slice 8 without redesign. Acceptance for Slice 4 does not require the others.

**D7 — Schema-constrained output is opt-in (Slice 7).** Many skill use cases (free-form text generation) do not need it; making it required would force every consumer to define a schema. Schemas are passed via `--schema-file` in CLI mode and `schema?: ZodSchema` in library mode.

**D8 — No persistent state, no on-disk session, no message history across invocations.** Each `invoke` is independent. argue's API runner keeps a `messageHistory` for multi-turn — we will not, because skills can construct multi-turn prompts themselves if needed. Rationale: removes a major class of bugs (stale state across runs) and keeps the package truly stateless.

**D10 — pnpm 10 instead of pnpm 9.** Slice 1 adopted pnpm 10.30.3 (the locally installed version) instead of the planned pnpm 9. Rationale: pnpm 10 is the current stable, the lockfile format is forward-compatible, and forcing a downgrade adds cost without benefit. Updated `packageManager` field in root `package.json` to `pnpm@10.30.3`. No other plan changes required — `pnpm-workspace.yaml` and `.npmrc` syntax are unchanged across the major version.

**D11 — `tsconfig.base.json` extras beyond plan.** Added `noUncheckedIndexedAccess`, `noImplicitOverride`, `isolatedModules`, `declarationMap`, `forceConsistentCasingInFileNames`, `resolveJsonModule`, `skipLibCheck` on top of the plan's listed compiler options. Rationale: these are conventional defaults for new strict TS projects and catch bugs the plan's minimal set would miss. Also explicitly set `exactOptionalPropertyTypes: false` because the runtime types use `field?: T` patterns that are stricter to satisfy when this is on; revisit if it causes type pain.

**D12 — `@hs/llm/package.json` adds `exports` map and `files` allowlist.** Plan only listed `main`/`types`/`bin`. The `exports` map is the modern standard for ESM packages and the `files` allowlist scopes the eventual npm publish. Both are additive and do not change Slice 1 verification.

**D13 — `validateConfig(unknown)` exposed alongside `loadConfig(path)`.** Slice 2 splits config validation from filesystem reading. `loadConfig` reads + parses + validates; `validateConfig` validates a pre-parsed object. Rationale: tests construct config objects in memory and need validation without round-tripping through disk; library consumers may also have their own loading mechanism (e.g., remote config). No cost to expose both.

**D14 — Cross-reference validation in `validateConfig`.** Beyond Zod schema validation, we additionally verify every `agent.provider` and `agent.model` reference resolves. Zod's discriminated union catches shape errors but not referential integrity. Errors are aggregated and surfaced together so the user sees all bad references in one shot, not iteratively.

**D15 — `runnerCache` is a `WeakMap<HsLlmConfig, Map<string, ProviderTaskRunner>>`.** Per-config-object runner caching, garbage-collected when the config is dropped. This means each `loadConfig()` call gets a fresh runner (no cross-call state) — aligning with D8's stateless contract — but within a single config object's lifetime, the runner is reused (so e.g. `invokeMany` doesn't re-instantiate runners per agent).

**D16 — `DEFAULT_RETRY_POLICY` exported from runtime/types.ts.** The plan said retry-policy lives in `runtime/retry.ts` (Slice 5). Exposing the *type* and *default value* in `types.ts` allows Slice 2's `invoke()` signature to stay forward-compatible without forcing a Slice 5 dependency. The `withRetry` function still ships in Slice 5.

**D17 — `InvocationError` split into `runtime/errors.ts`.** Code-review feedback: Slice 2 originally placed the class in `runtime/types.ts`, which forced `config/load.ts` to depend on `runtime/types.ts`. Splitting the runtime class out to a leaf `runtime/errors.ts` lets `config/` and `runtime/{mock,registry,runner}.ts` import the class directly with no cross-layer churn before Slice 3 lands. `runtime/types.ts` re-exports for back-compat at the package boundary, so `index.ts` is unchanged.

**D19 — Vercel AI SDK pinned to V2 stack (ai@^6).** Plan said `ai@^4`. Latest stable `ai` is `6.0.174` (V2 LanguageModel interface); V1 is end-of-life on the publishing cadence. Adopted `ai@^6` + `@ai-sdk/anthropic@^2` + `@ai-sdk/openai-compatible@^1` (last is already V2). V2's `usage.inputTokens`/`outputTokens` shape happens to match hs-llm's normalized fields directly. ExecPlan's "Interfaces and Dependencies" section updated to reflect.

**D20 — `createApiRunner` takes `environment` param.** Slice 3 introduces an explicit `environment: NodeJS.ProcessEnv = process.env` parameter to `createApiRunner` rather than hard-coding `process.env`. Rationale: tests can pass `{ TEST_KEY: "..." }` deterministically without `vi.stubEnv` and Slice 8's SDK provider will need the same affordance. Default falls back to `process.env` for normal CLI consumers.

**D18 — `applyAgentDefaults` exported as a named function.** Code+test review feedback: the merge precedence (request > agent > model) is the single function every future runner depends on, but the existing test couldn't fail because the mock provider doesn't consume the merged fields. Promoting to an exported function lets us unit-test all five fields × three precedence levels directly. Keeping it on the public surface costs nothing and serves as documentation for the contract.

**D9 — Decisions resolved by approved design doc (`docs/design-docs/hs-llm.md`).** The design doc is the source of truth for the eight design questions Slice-by-Slice steps below depend on. Summary of binding decisions:

- Q1: 4th provider type stays `sdk` (matches argue convention; misleading-name acknowledged, README clarifies at first mention).
- Q2: Library accepts Zod; CLI accepts JSON Schema; convert via `json-schema-to-zod` at the boundary.
- Q3: Module layout per design doc §"Module Layout".
- Q4: Five error kinds — `config | timeout | retryable | non-retryable | abort` (argue used 2; we expand because consumer skills need finer dispatch).
- Q5: Hand-rolled semaphore for `invokeMany` concurrency. Default cap = 8 (anti-rate-limit-storm) when caller does not specify.
- Q6: CLI session contract is **traceability passthrough only**. `InvocationRequest.traceabilityId?` optionally maps to `claude --session-id <id>` and `pi --session <tmpdir>/hs-llm-pi-<id>`. No `--resume`, no cross-call memory.
- Q7: Retry default = 3 attempts, base 500ms backoff, ±25% jitter, max 5s wait. Retryable iff kind ∈ {`retryable`, `timeout`}.
- Q8: Reasoning flag on unsupported cliType → warn-once-per-process-per-cliType then ignore. Response carries `reasoningApplied: boolean`.

## Outcomes & Retrospective

(To be filled at milestone completion)

## Context and Orientation

**Repository state.** harness-stack (`/Users/wanggang/.supacode/repos/harness-stack/feat/multi-agent-discusstion/`) is currently a markdown-only skills framework on branch `feat/multi-agent-discusstion`. It contains `skills/`, `agents/`, `docs/`, `AGENTS.md`, `ARCHITECTURE.md`, `README.md`. There is no `package.json`, no `node_modules`, no `tsconfig`. **This plan introduces the first TypeScript toolchain to the repo.**

**Related documents:**
- Repo entry: `AGENTS.md`
- Architecture overview: `ARCHITECTURE.md`
- Golden rules: `docs/golden-rules.md`
- Future consumer skills (not yet written): `skills/hs-decide/SKILL.md`, `skills/hs-debate/SKILL.md`

**Reference implementation studied (external, not vendored):**
- `~/dev/opensource/argue/packages/argue-cli/src/runtime/types.ts` — `ProviderTaskRunner` interface shape we will mirror (narrower).
- `~/dev/opensource/argue/packages/argue-cli/src/runtime/api.ts` — Vercel AI SDK integration pattern; error classification (`classifyApiError` with retryable/non-retryable taxonomy) is worth keeping.
- `~/dev/opensource/argue/packages/argue-cli/src/runtime/cli.ts` — `buildBaseArgs` switch over `cliType` covering all 9 CLIs and `runCommand` subprocess wrapper.
- `~/dev/opensource/argue/packages/argue-cli/src/runtime/mock.ts` — mock provider for tests (we follow same pattern).
- `~/dev/opensource/argue/packages/argue-cli/src/config.ts` — Zod discriminated-union config schema. We adopt the same structure (`type: "api" | "cli" | "sdk" | "mock"`).

**Term definitions (used throughout this plan):**

- **Provider:** the *kind* of LLM access (HTTP API, subprocess CLI, custom SDK adapter, mock). Defined once per workspace in config.
- **Model:** a named model under a provider (e.g. `claude-sonnet-4-5` under provider `claude_cli`). Carries optional defaults (temperature, reasoning effort, max output tokens).
- **Agent:** a named binding of provider + model + optional `systemPrompt` / `temperature` / `reasoning` / `timeoutMs` overrides + optional `role` string. Agents are what callers reference by ID.
- **Runner:** an object implementing `ProviderTaskRunner` interface, one per provider type (api / cli / sdk / mock). Knows *how* to execute a request for that provider type.
- **Invocation:** one `invoke()` call. Fully independent — no shared state with other invocations.

**How the parts fit:** The caller (a skill via Bash, or a TS consumer) hands a `ConfigPath` + `agentId` + `prompt` to `invoke()`. The library loads & validates config (Zod), resolves the agent → provider → runner, calls the runner with a normalized request, and returns a normalized response. The library never reads or writes any state outside the response file (CLI mode) or the returned promise (library mode). Errors are typed (retryable vs non-retryable) and propagated.

## Plan of Work

The plan is organized as nine vertical slices. Each slice ends with a working, testable artifact. Slices 1–6 are the critical path; slices 7–9 add polish and breadth and may be deferred without blocking consumer skills.

### Slice 1: TS toolchain bootstrap

This slice introduces TypeScript and pnpm into the repo. At the end, an empty `packages/hs-llm` exists, builds, and lints. No business logic.

Edits:

- New file `package.json` at repo root. Contains `"name": "harness-stack"`, `"private": true`, `"workspaces": ["packages/*"]` (we will use pnpm but the field name is shared), `"packageManager": "pnpm@9"`, no runtime dependencies, dev dependencies for `typescript`, `@types/node`, `vitest`, `tsx`, `prettier`. Scripts: `"build"`, `"test"`, `"lint"`, each delegating via `pnpm -r`.
- New file `pnpm-workspace.yaml` at repo root: `packages: ["packages/*"]`.
- New file `tsconfig.base.json` at repo root: strict mode (`"strict": true`), `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `"esModuleInterop": true`, `"declaration": true`, `"sourceMap": true`. No `"references"` yet.
- New file `.npmrc` at repo root: `node-linker=isolated`, `strict-peer-dependencies=true`.
- New file `.gitignore` at repo root (or extend if present): add `node_modules`, `dist`, `*.tsbuildinfo`, `.pnpm-store`.
- New file `packages/hs-llm/package.json`: `"name": "@hs/llm"`, `"version": "0.0.1"`, `"type": "module"`, `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`, `"bin": { "hs-llm": "./dist/cli.js" }`, scripts `"build": "tsc -p tsconfig.json"` and `"test": "vitest run"` and `"lint": "tsc --noEmit"`.
- New file `packages/hs-llm/tsconfig.json`: extends `../../tsconfig.base.json`, sets `"outDir": "./dist"`, `"rootDir": "./src"`, `"include": ["src/**/*"]`.
- New file `packages/hs-llm/src/index.ts` with a placeholder export so build produces output.

Verify: `pnpm install` from repo root succeeds; `pnpm --filter @hs/llm build` produces `packages/hs-llm/dist/index.js`; `pnpm --filter @hs/llm lint` exits 0.

### Slice 2: Config schema, types, mock runner, library `invoke()`

This slice gives the package a shape: types and a working `invoke()` against the mock provider. No real model is contacted yet, but the entire library code path runs end to end.

Edits:

- `packages/hs-llm/src/config/schema.ts` — Zod schemas mirroring argue's `config.ts` shape but narrower. Define `ProviderModelSchema`, `ApiProviderSchema`, `CliProviderSchema`, `SdkProviderSchema`, `MockProviderSchema`, discriminated union `ProviderSchema`, `AgentSchema`, top-level `HsLlmConfigSchema`. Drop argue's engine-specific fields (no `defaultAgents`, `participantsPolicy`, `consensusThreshold`, etc.). Export inferred TS types (`HsLlmConfig`, `ResolvedAgent`, ...).
- `packages/hs-llm/src/config/load.ts` — `loadConfig(path: string): Promise<HsLlmConfig>`. Reads JSON, parses with Zod, returns. Throws a `ConfigError` with the Zod issue list if invalid.
- `packages/hs-llm/src/runtime/types.ts` — define interfaces: `InvocationRequest` (`{ prompt: string; system?: string; temperature?: number; maxOutputTokens?: number; reasoning?: "minimal" | "medium" | "high"; timeoutMs?: number; traceabilityId?: string; abortSignal?: AbortSignal }`), `InvocationResponse` (`{ text: string; finishReason?: string; usage?: { inputTokens?: number; outputTokens?: number }; latencyMs: number; agentId: string; providerModel: string; reasoningApplied: boolean }`), `InvocationError` (typed: `kind: "config" | "timeout" | "retryable" | "non-retryable" | "abort"`, `message`, `cause?`), `ProviderTaskRunner` (`{ runTask(args: { agent: ResolvedAgent; request: InvocationRequest }): Promise<InvocationResponse> }`). `traceabilityId` is opt-in passthrough only (Q6); `reasoningApplied` reports whether the runner actually applied a reasoning flag for this invocation (Q8).
- `packages/hs-llm/src/runtime/mock.ts` — `createMockRunner(provider: MockProviderConfig): ProviderTaskRunner`. Returns deterministic responses based on `prompt` hash + agent id; supports `behavior: "deterministic" | "timeout" | "error" | "malformed"` from config to drive tests. (Pattern from argue's `mock.ts`.)
- `packages/hs-llm/src/index.ts` — export top-level `invoke(args: { config: HsLlmConfig; agentId: string; request: InvocationRequest }): Promise<InvocationResponse>`. Resolve agent → provider → runner; instantiate runner (cached by provider name); call `runner.runTask()`. For Slice 2, only the mock branch is implemented; api/cli/sdk throw `NotImplementedError`.
- `packages/hs-llm/src/runtime/registry.ts` — runner factory registry: `getRunner(provider: ResolvedProvider): ProviderTaskRunner`. One entry per provider kind, built lazily.
- `packages/hs-llm/test/mock.test.ts` — Vitest unit test. Build a `HsLlmConfig` in-memory with one mock provider + agent; call `invoke(...)`; assert deterministic text comes back.

Verify: `pnpm --filter @hs/llm test` passes with one passing test.

### Slice 3: API provider (OpenAI-compatible + Anthropic-compatible)

This slice connects to real HTTP APIs. After this, `invoke` works against any OpenAI-compatible endpoint (OpenAI, Together, DeepSeek, local Ollama) or Anthropic-compatible endpoint.

Edits:

- Add runtime deps to `packages/hs-llm/package.json`: `ai` (Vercel AI SDK), `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`, `zod`.
- `packages/hs-llm/src/runtime/api.ts` — `createApiRunner(providerName, config: ApiProviderConfig): ProviderTaskRunner`. Construct model factory once per provider (`createOpenAICompatible` or `createAnthropic`), resolve API key from `apiKeyEnv`, on `runTask` call `generateText({ model, system, messages, temperature, maxOutputTokens, abortSignal })`. Wrap errors with `classifyApiError(error): "retryable" | "non-retryable"` (same taxonomy as argue's `RETRYABLE_HINTS` / `NON_RETRYABLE_HINTS` lists, plus HTTP status codes 408/409/425/429/5xx → retryable; 400/401/403/404/422 → non-retryable).
- Hook `api` into `runtime/registry.ts`.
- `packages/hs-llm/test/api-mock.test.ts` — use `vitest`'s ability to mock `ai`'s `generateText` to verify our adapter passes the right `system`, `temperature`, etc., and propagates errors correctly.
- `packages/hs-llm/test/api-live.test.ts` — gated by env var `HS_LLM_LIVE_TESTS=1`; skipped by default. Hits a real configurable endpoint (default: Anthropic), returns < 100 tokens.

Verify: unit tests pass. Manually, with `ANTHROPIC_API_KEY` set, run a small invocation against `claude-haiku-4-5` and inspect output.

### Slice 4: CLI provider for `claude` and `pi`

This slice spawns local coding-agent CLIs as subprocesses. After this, the package can drive Claude Code or Inflection Pi CLI through `invoke`. Codex is excluded from v0.1 because the user's Codex account is currently rate-limited; it will be added in Slice 8 alongside the other adapters once limits clear.

Choosing `claude` + `pi` (rather than two CLIs from the same family) gives meaningful coverage of the cliType switch:

- `claude` exercises the `--print` + stdin flow with optional `--session-id` / `--resume` for sticky sessions and `--effort <level>` for reasoning passthrough.
- `pi` exercises the `--model` + stdin flow with `--session <path>` for on-disk session semantics — a different session model than claude's flag-based approach. `pi` does not currently surface a verified reasoning flag (matches argue's behavior: `reasoningApplied: false`).

Edits:

- `packages/hs-llm/src/runtime/cli.ts` — `createCliRunner(provider: CliProviderConfig): ProviderTaskRunner`. On `runTask`:
  1. Build prompt envelope: a fixed multi-line string containing `Role`, `System instructions`, `Task prompt`, `Task context JSON`, `Expected output JSON schema` (only the first three populated unless schema mode is on; see Slice 7). Pattern from argue's `prompt.ts`.
  2. Build base args via `buildBaseArgs(cliType, providerModel, prompt, reasoning?)` — switch over `cliType`. Slice 4 implements only `case "claude"` and `case "pi"`. Other cases throw `NotImplementedError` (filled in Slice 8).
  3. Spawn subprocess via Node `child_process.spawn`, write prompt to stdin (both claude and pi accept stdin prompts). Apply `timeoutMs` via `AbortController`. Collect stdout/stderr.
  4. On non-zero exit, throw retryable or non-retryable error based on stderr signature.
  5. Return text from stdout.
- For `pi`: when `request.traceabilityId` is provided, derive a session-file path under `os.tmpdir()` (e.g., `hs-llm-pi-<traceabilityId>`) and pass `--session <path>`; otherwise omit. Per Q6 (traceability passthrough only), the package never reuses, persists, or resumes from this path across invocations — it is a per-invocation observability hook only. `reasoningApplied = false` (pi has no verified reasoning flag).
- For `claude`: when `request.reasoning` is set (`minimal` / `medium` / `high`), append `--effort <level>` and set `reasoningApplied = true`; otherwise `reasoningApplied = false`. When `request.traceabilityId` is provided, pass `--session-id <traceabilityId>` for log-correlation only. Per Q6, **never** emit `--resume` — every invocation is independent.
- Reasoning-flag fallback (Q8): if a `cliType` does not support a reasoning flag and `request.reasoning` is set, log a warning the first time per `(processId, cliType)` pair (deduplicated via a module-level `Set`), then ignore the flag and set `reasoningApplied = false`. The warning goes to stderr, not stdout.
- `packages/hs-llm/src/runtime/cli.ts` also exports `usesStdinPrompt(cliType)` and `renderTemplate` (env var substitution with `{requestId}`, `{agentId}`, etc.) — copied in spirit from argue, narrowed.
- Hook `cli` into `runtime/registry.ts`.
- `packages/hs-llm/test/cli.test.ts` — uses a fake binary script (a small `tsx`-runnable Node script that echoes its argv + stdin as JSON) to verify args are constructed correctly per cliType. Two test groups: `claude` (assert `--print`, `--model <id>`, optional `--effort`, stdin == prompt) and `pi` (assert `--model <id>`, optional `--session <tmpdir-path>`, stdin == prompt).
- Manual smoke A: declare a `claude_cli` provider in `examples/config.example.json`; run `hs-llm invoke --agent claude_local --prompt "say hi"`; verify non-empty response.
- Manual smoke B: declare a `pi_cli` provider; run `hs-llm invoke --agent pi_local --prompt "say hi"`; verify non-empty response.

Verify: unit tests pass for both cliTypes. Both smoke tests return non-empty responses against locally-installed binaries.

### Slice 5: `invokeMany()` with partial-failure tolerance

This slice gives skills a robust way to fan out to N agents in parallel and tolerate per-agent failures — required by `hs-decide`'s parallel sampling and `hs-debate`'s round-1 broadcast.

Edits:

- `packages/hs-llm/src/index.ts` — add `invokeMany(args: { config, agents: Array<{ agentId: string; request: InvocationRequest }>; concurrency?: number }): Promise<InvokeManyResult>` where `InvokeManyResult = Array<{ agentId: string; status: "ok"; response: InvocationResponse } | { agentId: string; status: "error"; error: InvocationError }>`. Uses a small concurrency limiter (no extra dependency: a hand-rolled semaphore in `runtime/concurrency.ts`). Per Q5, default `concurrency = 8` when caller does not specify, to bound rate-limit storms; callers may override (including upward).
- `packages/hs-llm/src/runtime/retry.ts` — `withRetry(fn, policy: RetryPolicy)` where `RetryPolicy = { attempts: number; backoffMs: number; jitterPct: number; maxWaitMs: number }`. Retries only `kind: "retryable" | "timeout"` errors. Per-attempt wait = `min(backoffMs * 2^(n-1), maxWaitMs)` with `±jitterPct%` jitter. Per Q7 default policy: `{ attempts: 3, backoffMs: 500, jitterPct: 25, maxWaitMs: 5_000 }`.
- Wire `withRetry` into `invoke` (per-call) and `invokeMany` (per-agent independently).
- `packages/hs-llm/test/invoke-many.test.ts` — use mock provider with mixed behaviors: agent A deterministic, agent B `timeout`, agent C `error`, agent D `deterministic`. Assert result is `[ok, error(timeout), error(non-retryable), ok]`. Then re-run with an agent C that flakes once then succeeds; assert retry recovers.

Verify: Vitest passes; the retry test demonstrates one retry → success.

### Slice 6: CLI binary `hs-llm`

This slice exposes the package to skill markdown via Bash. After this, a skill can write `hs-llm invoke ...` in its instructions and trust the contract.

Edits:

- `packages/hs-llm/src/cli.ts` — argument parsing (no dep: hand-rolled, three subcommands). Subcommands:
  - `hs-llm invoke --config <path> --agent <id> [--prompt <str> | --prompt-file <path>] [--system <str>] [--temperature <num>] [--timeout-ms <num>] [--schema-file <path>] [--out <path>]` — single invocation. Output JSON to `--out` or stdout.
  - `hs-llm invoke-many --config <path> --agents <a,b,c> [--prompt <str> | --prompt-file <path>] [--parallel | --serial] [--concurrency <n>] [--out-dir <dir>]` — fan out. Writes one result file per agent into `--out-dir`, plus a summary `_index.json`.
  - `hs-llm validate-config <path>` — load & validate a config file; print errors and exit 1 if invalid; exit 0 otherwise.
- Exit codes: 0 = success; 1 = config error; 2 = invocation error (still produces partial output for `invoke-many`); 3 = usage error.
- `packages/hs-llm/test/cli-bin.test.ts` — run the built `dist/cli.js` via `child_process` against a mock-only config; verify stdout JSON, exit codes, partial-failure handling.
- `examples/config.example.json` and `examples/prompt.example.txt` for the README.

Verify: from repo root, `node packages/hs-llm/dist/cli.js validate-config packages/hs-llm/examples/config.example.json` exits 0. `node packages/hs-llm/dist/cli.js invoke --config ...example... --agent mock_a --prompt "hi"` returns a JSON response on stdout.

### Slice 7: Schema-constrained output (optional)

This slice adds a `--schema-file` mode for callers who want guaranteed JSON. Not required by any default skill flow, but used by `hs-debate`'s claim-extraction step.

Edits:

- `packages/hs-llm/src/runtime/schema.ts` — `enforceSchema<T>(text: string, schema: ZodSchema<T>): T` — strip code fences, parse JSON, validate, throw with details on failure.
- Wrap `invoke` with optional `schema?: ZodSchema` parameter. On parse/validate failure, retry up to 2 times with an appended "your previous output failed validation: <error>" message. After exhaustion, surface a `non-retryable` error with the last raw output preserved.
- For API runner with `@ai-sdk/openai-compatible`, use `generateObject` instead of `generateText` when a schema is supplied, to leverage native structured-output where available.
- Library API: `invoke({ ..., schema })` returns `{ ...response, parsed: T }`.
- CLI: `--schema-file path/to/schema.json`. Per Q2 the schema file is a JSON Schema; the CLI loads it and converts to a Zod schema via `json-schema-to-zod` at the library boundary, then hands the Zod schema to `invoke()`. Add `json-schema-to-zod ^2` as a runtime dependency in this slice.
- Tests: schema success path, schema failure → retry → success, schema failure → exhaustion.

Verify: `vitest` passes. CLI smoke: pass a schema requiring `{ "answer": string, "confidence": number }`, call against a mock, verify `parsed` field.

### Slice 8: Remaining CLI adapters

Add the seven remaining `cliType` cases to `buildBaseArgs`: `codex`, `gemini`, `copilot`, `opencode`, `droid`, `amp`, `generic`. (`codex` is here rather than in Slice 4 because the user's account is rate-limited at planning time; it will be added when limits clear.) Pattern is mechanical — adapt the relevant argue case (with license attribution in a comment block). Each adapter gets one args-construction unit test using the fake-binary harness from Slice 4.

Also implement the `sdk` provider type: `createSdkRunner` dynamically imports a user-specified module by path, expects it to export a `ProviderTaskRunner`-compatible factory. Test with a small in-repo fixture adapter.

Verify: each cliType has ≥1 test asserting correct args construction. The `generic` adapter additionally has a test where a fake binary echoes the JSON envelope back to verify round-trip.

### Slice 9: Documentation and skill-integration recipe

Final slice: make the package pleasant to consume.

Edits:

- `packages/hs-llm/README.md` — overview, install, library example, CLI example, config schema reference (auto-generated from Zod via `zod-to-json-schema` if cheap, else hand-written), supported cliTypes table, error taxonomy.
- `packages/hs-llm/examples/config.example.json` — three-provider example (one mock, one api, one cli) with five agents demonstrating common shapes.
- `docs/recipes/calling-hs-llm-from-a-skill.md` — short recipe for skill authors: how to declare config requirements, how to call `hs-llm invoke-many` from a Bash step, how to interpret the output JSON, how to handle errors.
- Update `AGENTS.md` to add `packages/hs-llm` under a new "Packages" section so future agents discover it.
- Update `ARCHITECTURE.md` with a one-paragraph note that harness-stack now contains TS packages under `packages/`.

Verify: `pnpm --filter @hs/llm build && pnpm --filter @hs/llm test` clean. README rendered locally. `AGENTS.md` line count still under 150.

## Concrete Steps

All commands are run from repo root `/Users/wanggang/.supacode/repos/harness-stack/feat/multi-agent-discusstion/` unless stated otherwise.

**Slice 1 bootstrap:**

```bash
# install pnpm if not present
corepack enable
corepack prepare pnpm@9 --activate

# create files (Write tool, not shell)
# then:
pnpm install
# expected: lockfile created, 0 vulnerabilities reported

pnpm --filter @hs/llm build
# expected output excerpt:
#   > @hs/llm@0.0.1 build
#   > tsc -p tsconfig.json
#   (no errors)

ls packages/hs-llm/dist/
# expected: index.js  index.d.ts  index.js.map
```

**Per-slice verification cycle:**

```bash
pnpm --filter @hs/llm lint   # tsc --noEmit
pnpm --filter @hs/llm test   # vitest run
pnpm --filter @hs/llm build  # tsc -p tsconfig.json
```

**End-to-end smoke (after Slice 6):**

```bash
node packages/hs-llm/dist/cli.js validate-config packages/hs-llm/examples/config.example.json
echo $?  # expect 0

node packages/hs-llm/dist/cli.js invoke \
  --config packages/hs-llm/examples/config.example.json \
  --agent mock_a \
  --prompt "say hi"
# expected stdout: a JSON object with .text == "MOCK[mock_a]: say hi" (or similar deterministic string)
```

**Live API smoke (after Slice 3, requires `ANTHROPIC_API_KEY`):**

```bash
ANTHROPIC_API_KEY=... node packages/hs-llm/dist/cli.js invoke \
  --config ./my.config.json \
  --agent haiku_test \
  --prompt "Reply with the single word: ok"
# expected: JSON with .text matching /ok/i
```

## Validation and Acceptance

The plan is complete when all of the following hold:

1. `pnpm install` from a fresh clone succeeds.
2. `pnpm -r build` succeeds; `pnpm -r test` reports all tests passing (target: ≥30 unit tests across slices 2–8).
3. `node packages/hs-llm/dist/cli.js validate-config packages/hs-llm/examples/config.example.json` exits 0.
4. With `ANTHROPIC_API_KEY` set: `hs-llm invoke --agent haiku_test --prompt "Reply with the single word: ok"` returns text matching `/ok/i` and exits 0.
5. With Claude Code installed locally: `hs-llm invoke --agent claude_local --prompt "Reply with the single word: ok"` returns text matching `/ok/i` and exits 0.
6. With Inflection Pi CLI installed locally: `hs-llm invoke --agent pi_local --prompt "Reply with the single word: ok"` returns text matching `/ok/i` and exits 0.
7. `hs-llm invoke-many --agents a,b,c --parallel` against a config where `b` is configured to error returns exit code 0 (not 2 — partial success), with two `status: "ok"` entries and one `status: "error"` entry in the output.
8. `pnpm --filter @hs/llm typecheck` (alias for `tsc --noEmit`) passes with `strict: true`.
9. The published `dist/` does not include any test files or source maps for non-TS files.
10. `AGENTS.md` remains within the 150-line golden-rule limit after Slice 9 updates.

## Idempotence and Recovery

- All file creations are idempotent: re-running creation does not duplicate content. The Write tool overwrites; if a file already exists, the slice should be skipped or the file diffed before overwriting.
- `pnpm install` is idempotent.
- `pnpm --filter @hs/llm build` produces a clean `dist/` each time (no incremental staleness).
- If a slice fails partway, recover by:
  - Slice 1 fail: delete `node_modules`, `pnpm-lock.yaml`, `dist/` and rerun.
  - Slice 3+ fail (test regression): use `git stash` to isolate the broken changes; rerun previous slice's tests to confirm baseline; reapply changes incrementally.
- No slice writes outside `packages/hs-llm/` and the four root config files (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.npmrc`, `.gitignore`). The `docs/` and `AGENTS.md` updates are reserved to Slice 9.

## Artifacts and Notes

**Argue runtime files studied (read-only reference, no copy):**

```
~/dev/opensource/argue/packages/argue-cli/src/runtime/types.ts        — runner interface
~/dev/opensource/argue/packages/argue-cli/src/runtime/api.ts          — Vercel AI SDK integration + error taxonomy
~/dev/opensource/argue/packages/argue-cli/src/runtime/cli.ts          — 9-cliType buildBaseArgs switch
~/dev/opensource/argue/packages/argue-cli/src/runtime/mock.ts         — deterministic mock provider
~/dev/opensource/argue/packages/argue-cli/src/runtime/prompt.ts       — prompt envelope structure
~/dev/opensource/argue/packages/argue-cli/src/config.ts               — Zod discriminated-union config
```

**Expected `invoke()` library signature (Slice 2 final form):**

```ts
import type { ZodSchema } from "zod";

export async function invoke<T = unknown>(args: {
  config: HsLlmConfig;
  agentId: string;
  request: InvocationRequest;
  schema?: ZodSchema<T>;
  retry?: RetryPolicy;
}): Promise<InvocationResponse & { parsed?: T }>;

export async function invokeMany(args: {
  config: HsLlmConfig;
  invocations: Array<{ agentId: string; request: InvocationRequest; schema?: ZodSchema }>;
  concurrency?: number;
  retry?: RetryPolicy;
}): Promise<InvokeManyResult>;
```

**Expected `hs-llm invoke` JSON output shape:**

```json
{
  "agentId": "claude_local",
  "providerModel": "claude-sonnet-4-5",
  "text": "...",
  "finishReason": "stop",
  "usage": { "inputTokens": 42, "outputTokens": 17 },
  "latencyMs": 1832,
  "reasoningApplied": true,
  "parsed": null
}
```

**Expected `hs-llm invoke-many` _index.json shape:**

```json
{
  "config": "./my.config.json",
  "results": [
    { "agentId": "a", "status": "ok", "file": "./out/a.json" },
    { "agentId": "b", "status": "error", "errorKind": "non-retryable", "message": "..." },
    { "agentId": "c", "status": "ok", "file": "./out/c.json" }
  ]
}
```

## Interfaces and Dependencies

**Runtime dependencies (declared in `packages/hs-llm/package.json`):**

- `zod ^3.23` — config validation, schema-constrained output.
- `ai ^6` — Vercel AI SDK core (V2 LanguageModel interface; bumped from plan's ^4 per D19).
- `@ai-sdk/anthropic ^2` — Anthropic-compatible adapter (V2; bumped from plan's ^1 per D19).
- `@ai-sdk/openai-compatible ^1` — OpenAI-compatible adapter.
- `json-schema-to-zod ^2` — added in Slice 7 to convert JSON Schema input from the CLI into a Zod schema at the library boundary (per Q2).

No other runtime dependencies. Subprocess spawning and CLI arg parsing use Node built-ins.

**Dev dependencies (root `package.json`):**

- `typescript ^5.6`, `@types/node ^22`, `vitest ^2`, `tsx ^4`, `prettier ^3`.

**Public TypeScript interfaces (must exist at end of plan):**

In `packages/hs-llm/src/index.ts`:

```ts
export type {
  HsLlmConfig,
  ResolvedAgent,
  InvocationRequest,
  InvocationResponse,
  InvocationError,
  InvocationErrorKind,
  InvokeManyResult,
  RetryPolicy,
} from "./runtime/types.js";

export { invoke, invokeMany } from "./runtime/runner.js";
export { loadConfig } from "./config/load.js";
export { HsLlmConfigSchema } from "./config/schema.js";
```

In `packages/hs-llm/src/runtime/types.ts`:

```ts
export interface ProviderTaskRunner {
  runTask(args: { agent: ResolvedAgent; request: InvocationRequest }): Promise<InvocationResponse>;
}

export interface InvocationRequest {
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  reasoning?: "minimal" | "medium" | "high";
  timeoutMs?: number;
  traceabilityId?: string;
  abortSignal?: AbortSignal;
}

export interface InvocationResponse {
  agentId: string;
  providerModel: string;
  text: string;
  finishReason?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  latencyMs: number;
  reasoningApplied: boolean;
}

export type InvocationErrorKind = "config" | "timeout" | "retryable" | "non-retryable" | "abort";

export class InvocationError extends Error {
  readonly kind: InvocationErrorKind;
  readonly cause?: unknown;
  constructor(kind: InvocationErrorKind, message: string, cause?: unknown);
}

export interface RetryPolicy {
  attempts: number;
  backoffMs: number;
  jitterPct: number;
  maxWaitMs: number;
}
```

**CLI binary contract:** `bin/hs-llm` resolves to `packages/hs-llm/dist/cli.js`. Stable subcommands (no breaking changes after Slice 6): `invoke`, `invoke-many`, `validate-config`. New flags may be added; existing flags must remain backward-compatible.

**Risk callout — first TS in a markdown-only repo:** introducing pnpm, `node_modules`, `package.json`, and TS toolchain to a previously-text-only repo changes the contributor experience. Mitigations: keep all TS confined to `packages/`, never require Node to render or use existing markdown skills, document the dev workflow in `packages/hs-llm/README.md`, ensure `.gitignore` correctly excludes `node_modules` and `dist`. Risk owner: Gump.

**Risk callout — CLI provider depends on locally-installed coding agents.** Slice 4's smoke test requires a working `claude` binary in PATH. CI cannot run this; only the API and mock paths are CI-testable. We accept this and document it in the README.

**Risk callout — SDK provider dynamic import.** Slice 8's SDK provider loads adapter modules by path at runtime. This is a security-sensitive surface (arbitrary code execution from a config file). We restrict dynamic imports to paths within the workspace or absolute file paths; we explicitly do not resolve from `node_modules` of arbitrary names. Documented as a security note in Slice 8's README section.

---

PLAN READY FOR REVIEW:
- Title: hs-llm — Stateless LLM Provider Abstraction Package
- Plan structure: 9 vertical slices (milestones)
- Open risks: 3 (TS-toolchain introduction, local-CLI-dependent tests, SDK dynamic import)
→ Approve, or tell me what to change.
