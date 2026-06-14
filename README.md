# harness-stack

An agent-first **development harness** — a curated stack of tools that keep an AI coding agent building **stably, durably, and at high quality**.

> **Philosophy**: Humans provide direction, agents execute.

## What is harness-stack?

harness-stack is the harness around the agent: a collection of **Skills**, **Commands**, and **Subagents** that an AI coding agent reaches for while doing real engineering work. Each tool encodes one process a senior engineer would follow — defining specs, designing, debugging, reviewing, shipping — so the work comes out consistent and verifiable instead of improvised.

Everything is addressed through the `harness-stack:` plugin namespace, and everything lives in the repo: an agent that can't read it doesn't know it. There is no out-of-band CLI — every operation is a Skill or a Subagent.

## FDD — the core

**Feature-Driven Development** (`/harness-stack:fdd`) is the heart of the stack. It is a *contract-first, multi-agent loop* that turns a goal into shipped, verified code. Three roles, each running in a fresh context so judgment never blurs:

- **Coordinator** — `fdd` orchestrates the flow; `fdd-execution` drives the serial build loop, dispatching one feature at a time and gating each handoff.
- **Implementer** — the `implementer` subagent builds exactly one bounded feature (test-first when required) and reports a structured handoff.
- **Validator** — a cost-increasing pipeline (`fdd-validate`) that probes the work against the contract: static gate (`scrutiny-validator`: test / lint / type-check + scrutiny) → review (`code-reviewer`: five axes, plus `security-auditor` when warranted) → behavioral user-test (`user-test-validator`).

The glue is the **validation contract** (`fdd-validation-contract`): the definition of done written as testable, user-observable assertions *before* code is written. The coordinator/implementer/validator triad checks every milestone against that contract — that's what keeps the program **continuously converging on the goal at high quality** rather than drifting.

| Tool | Role in FDD |
|------|-------------|
| `/harness-stack:fdd` | Orchestrator — runs the 3-step main flow (the only one you invoke directly) |
| `/harness-stack:fdd-planning` | Step 1 — capture the plan and break it into features |
| `/harness-stack:fdd-validation-contract` | Step 1 — write the definition-of-done assertions |
| `/harness-stack:fdd-execution` | Step 2 — the serial per-feature build loop |
| `/harness-stack:fdd-validate` | Step 3 — milestone & final gates (static → review → user-test) |
| `/harness-stack:tdd` | Test-first development, used inside an implementer's task |

Use FDD for any non-trivial change — one that touches multiple files, has several acceptance criteria, or spans more than one feature.

## Tools

Individual tools, each doing one job. Mix and match — only FDD is a coordinated group.

| Tool | What it does |
|------|--------------|
| `/harness-stack:define-product` | Define the product — what it is and why (`product-spec.md`) |
| `/harness-stack:define-architecture` | Define the system's structural map (`architecture.md`) |
| `/harness-stack:define-api-spec` | Define the authoritative API contract (`api-spec.md`) |
| `/harness-stack:define-frontend-spec` | Define frontend engineering conventions & quality bars |
| `/harness-stack:define-ui-spec` | Define the UI design system (`DESIGN.md`) |
| `/harness-stack:design` | Write a standalone technical design doc before building |
| `/harness-stack:debug` | Systematic root-cause debugging and recovery |
| `/harness-stack:review-request` | Dispatch fresh-context reviewers (code / security / tests) |
| `/harness-stack:review-receive` | Handle reviewer feedback with rigor, not theater |
| `/harness-stack:security` | Security audit and hardening |
| `/harness-stack:debate` | Multi-round debate among heterogeneous LLM agents |
| `/harness-stack:decide` | One-shot parallel decision support with synthesis |
| `/harness-stack:changelog` | Create and maintain `CHANGELOG.md` |
| `/harness-stack:git` | Disciplined git workflow and versioning |
| `/harness-stack:pr` | Open a PR and drive it to a clean merge |
| `/harness-stack:ship` | Pre-launch checklist, monitoring, rollback plan |
| `/harness-stack:docs-init` | One-time scaffold of a project's docs structure |
| `/harness-stack:env-init` | Per-worktree isolated runtime environment |
| `/harness-stack:skill-create` | Create a new harness-stack skill |
| `/harness-stack:feedback` | Reflect on a session and file an upstream issue |

### Commands

Thin slash-command entry points that delegate into the skills above — the substance lives in the skill.

| Command | What it does |
|---------|--------------|
| `/harness-stack:ask` | Answer-only mode — research and explain, never edit code |
| `/harness-stack:commit` | Atomic conventional commit with no attribution trailers |
| `/harness-stack:git-sync` | Pull `--rebase` from upstream, resolve conflicts, then push |
| `/harness-stack:pr-watch` | Scan a PR; hand anything actionable to `review-receive` |

## Subagents

Fresh-context experts. Some stand alone; the rest are the FDD roles above.

| Agent | Expertise |
|-------|-----------|
| `harness-stack:investigator` | Read-only codebase investigation & online research |
| `harness-stack:code-reviewer` | Five-axis review (correctness / readability / architecture / security / performance) |
| `harness-stack:security-auditor` | Vulnerability audit — OWASP, secrets, auth, dependency CVEs, LLM trust boundaries |
| `harness-stack:implementer` | Builds one bounded feature, emits a structured handoff |
| `harness-stack:scrutiny-validator` | Static gate — test/lint/type-check + per-feature scrutiny |
| `harness-stack:user-test-validator` | Behavioral gate — probes contract assertions against the running system |

## Packages

TypeScript runtime packages live under `packages/` and are managed through pnpm workspaces.

- **`@hs/llm`** (`packages/hs-llm/`) — Stateless LLM provider abstraction (api / cli / sdk / mock), library + CLI binary. Consumed by skills that need to invoke models. See [`packages/hs-llm/README.md`](packages/hs-llm/README.md).
- **`@hs/fdd`** (`packages/fdd/`, bin `fdd`) — Deterministic bookkeeping CLI for feature-driven development: manages `features.json` / `validation-state.json` / handoffs and enforces coverage + gates over per-plan state in the gitignored `.harness-runtime/`. Ships as a prebuilt single-file bundle. See [`packages/fdd/README.md`](packages/fdd/README.md).

## Naming Convention

All skills and agents are addressed through the `harness-stack:` plugin namespace (e.g. `harness-stack:fdd`, `harness-stack:code-reviewer`), which isolates them from other plugins — no per-skill prefix is needed.

## Documentation

- [AGENTS.md](AGENTS.md) — Entry-point map
- [Getting Started](references/getting-started.md) — Doc index & quick start
- [Golden Rules](references/golden-rules.md) — Core principles
- [Skill Anatomy](references/skill-anatomy.md) — How a skill is structured
- [References](references/) — Checklists (testing / security / performance / review), fdd-cli, and the @hs/llm design doc & recipe

## Feedback

Found friction, a bug, or have a suggestion? All feedback goes to this repo —
**[github.com/wanggang316/harness-stack/issues](https://github.com/wanggang316/harness-stack/issues)** — regardless of which project you were using harness-stack in. You don't need write access to open an issue.

- **From Claude Code**: run `/harness-stack:feedback`. It walks you through a short reflection, de-dups against existing issues, and files a structured report for you.
- **From GitHub directly**: open [a new issue](https://github.com/wanggang316/harness-stack/issues/new/choose) and pick a form — Bug, Friction/DX, Enhancement, or Docs.

## License

MIT
