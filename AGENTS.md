# harness-stack

Agent-first development framework implementing the harness methodology.

**Philosophy**: Humans provide direction, agents execute.

## Quick Navigation

### Meta-Skills (Manage harness itself)
- `/harness-stack:docs-init` - One-time scaffold of docs structure and base documents
- `/harness-stack:env-init` - Initialize per-worktree isolated runtime environment
- `/harness-stack:skill-create` - Create new skills

### Lifecycle Skills

**Define** (one-time, project-wide) → product, architecture, API, UI
- `/harness-stack:define-product` - Product definition (global)
- `/harness-stack:define-architecture` - Architecture definition (global)
- `/harness-stack:define-api-spec` - API specification (global)
- `/harness-stack:define-ui-spec` - UI design system (DESIGN.md)

**Design** (optional, standalone) → technical decision docs
- `/harness-stack:design` - Technical design doc → `docs/design-docs/`; human-invoked, not part of the main flow

**Build** (main flow) → feature-driven development
- `/harness-stack:fdd` - Orchestrator for the contract-first build. Dispatches the four phases to the sub-skills below; this is the only one you invoke directly.
  - `/harness-stack:fdd-planning` - Phase 1 (plan) + Phase 3 (features)
  - `/harness-stack:validation-contract` - Phase 2 (definition-of-done assertions)
  - `/harness-stack:fdd-execution` - Phase 4 (per-feature build loop)
  - `/harness-stack:fdd-validate` - milestone & final gates (scrutiny + security + user-test)
- `/harness-stack:tdd` - Test-driven development (inside an implementer's task)

**Verify** → Debug and test
- `/harness-stack:debug` - Debugging and error recovery
- `/harness-stack:user-test` - Probe a running system against a plan's validation-contract assertions; writes results to validation-state.json

**Review** → Ensure quality
- `/harness-stack:review-request` - Dispatch fresh-context reviewers (code / security / tests) (author side)
- `/harness-stack:review-receive` - Handle reviewer feedback (author side)
- `/harness-stack:security` - Security audit

**Deliberate** → Multi-agent reasoning
- `/harness-stack:debate` - Multi-agent debate among heterogeneous LLM agents on a single question
- `/harness-stack:decide` - Parallel multi-agent decision support: each agent answers independently, synthesis pass produces final decision with confidence and minority positions

**Ship** → Deploy and release
- `/harness-stack:changelog` - Changelog management
- `/harness-stack:git` - Git workflow and versioning
- `/harness-stack:land` - Drive an open PR to a clean merge
- `/harness-stack:ship` - Shipping and launch

### Specialized Agents

When you need expert judgment:
- `harness-stack:investigator` - Read-only codebase investigation & online research
- `harness-stack:code-reviewer` - PR review, quality checks

Reused by fdd's execution loop:
- `harness-stack:implementer` - Builds one feature, emits a handoff JSON
- `harness-stack:scrutiny-validator` - Milestone gate: hard test/lint/type-check gate + per-feature scrutiny review + guidance feedback
- `harness-stack:user-test-validator` - Probes contract assertions against the running system

## Golden Rules

1. **Progressive Disclosure** - AGENTS.md is a map, not a manual
2. **Repository Knowledge** - All context versioned in-repo
3. **Agent-Driven** - Everything is a Skill or Subagent
4. **Evidence Required** - Every verification needs proof
5. **Anti-Rationalization** - Address excuses preemptively
6. **Platform-Agnostic** - Read config, don't assume
7. **Self-Bootstrapping** - harness improves itself

## Getting Started

1. Build a feature: `/harness-stack:fdd <goal>` for any non-trivial change — it drives plan → contract → features → execution.
2. Review: `/harness-stack:review-request` to dispatch reviewers, `/harness-stack:review-receive` after feedback.
3. Ship: `/harness-stack:commit` → `/harness-stack:pr` → `/harness-stack:land` → `/harness-stack:ship`.

## Packages

TypeScript runtime packages live under `packages/` and are managed through pnpm workspaces.

- `@hs/llm` (`packages/hs-llm/`) — Stateless LLM provider abstraction (api / cli / sdk / mock). Library + CLI binary. Consumed by skills that need to invoke models. See `packages/hs-llm/README.md` and `docs/recipes/calling-hs-llm-from-a-skill.md`.
- `@hs/plan` (`packages/hs-plan/`, bin `hs-plan`) — Deterministic bookkeeping CLI for feature-driven development: manages `features.json` / `validation-state.json` / handoffs and enforces coverage + gate over per-plan state in the gitignored `.harness-runtime/`. See `packages/hs-plan/README.md`.

## Documentation

- [Golden Rules](docs/golden-rules.md) - Core principles
- [Architecture](docs/architecture.md) - System design
- [Getting Started](docs/index.md) - Quick start guide
- [References](docs/references/) - Checklists and patterns
- [Recipes](docs/recipes/) - How-to guides for cross-cutting tasks

## How It Works

harness-stack uses **pure Agent-driven architecture**:
- No external CLI tools
- Skills handle all operations (init, check, build, etc.)
- Subagents provide specialized expertise
- Self-bootstrapping capability

All skills and agents are addressed through the `harness-stack:` plugin namespace (e.g. `harness-stack:fdd`, `harness-stack:code-reviewer`), which provides collision isolation — no per-skill prefix is needed.
