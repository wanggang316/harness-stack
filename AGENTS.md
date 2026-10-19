# harness-stack

An agent-first **development harness** — a curated stack of tools that keep an agent building stably, durably, and at high quality.

**Philosophy**: Humans provide direction, agents execute.

> **Refactor in progress.** Retired skills live in `skills/deprecated/` and are not loaded by the plugin. Do not reference or invoke them.

## Quick Navigation

### Meta-Skills (Manage harness itself)
- `/harness-stack:feedback` - Reflect after using harness-stack and file upstream issues for friction/bugs/suggestions

### Lifecycle Skills

**Define** → Domain, design, UI
- `/harness-stack:domain-modeling` - Sharpen the domain model: CONTEXT.md glossary and ADRs in docs/adr/
- `/harness-stack:design-doc` - Write or update a design doc in docs/design/NNN-slug/: plan before coding, action after
- `/harness-stack:define-ui-spec` - UI design system (DESIGN.md)

**Setup** → Per-project config
- `/harness-stack:setup-harness-stack` - Configure the issue repo and triage labels for this project; writes to `~/.harness-stack/<project>/`, not the repo

**Plan** → Break work into GitHub issues
- `/harness-stack:to-github-issues` - Split a plan, spec, or conversation into tracer-bullet issues with native blocked-by / sub-issue links; writes nothing into the repo

**Build**
- `/harness-stack:tdd` - Test-driven development

**Review** → Ensure quality
- `/harness-stack:review-request` - Dispatch fresh-context reviewers (code / security / tests) (author side)
- `/harness-stack:review-receive` - Handle reviewer feedback (author side)

**Deliberate** → Multi-agent reasoning
- `/harness-stack:debate` - Multi-agent debate among heterogeneous LLM agents on a single question
- `/harness-stack:decide` - Parallel multi-agent decision support: each agent answers independently, synthesis pass produces final decision with confidence and minority positions

**Ship** → Deploy and release
- `/harness-stack:changelog` - Changelog management
- `/harness-stack:git` - Git workflow and versioning
- `/harness-stack:pr-open` - Open a PR: sync, push, and write a body built on a visual summary, evidence, and merge danger
- `/harness-stack:pr-land` - Drive an open PR to a clean merge: watch CI, handle review, squash-merge

### State

harness-stack is stateful. Per-project config and state live in `~/.harness-stack/<project>/`, never in the project repo. Skills must still run when the state is missing. See [references/state.md](references/state.md).

### Skill Layout

Skills are grouped by category: `skills/{engineering,productivity,ui}/<name>/SKILL.md`. Each category directory must be listed in the `skills` array of `.claude-plugin/plugin.json`; the default scan only finds `skills/<name>/SKILL.md` (`feedback`).

To add or change a skill or command in this repo, use the repo-local `/skill-create` (`.claude/skills/skill-create/`). It is not shipped with the plugin.

### Specialized Agents

- `harness-stack:investigator` - Read-only codebase investigation & online research
- `harness-stack:code-reviewer` - PR review, quality checks
- `harness-stack:security-auditor` - Security review of a diff

Kept from the retired fdd flow (no active skill dispatches them):
- `harness-stack:implementer` - Builds one feature, emits a handoff JSON
- `harness-stack:scrutiny-validator` - Static validation: hard test/lint/type-check gate + scrutiny
- `harness-stack:user-test-validator` - Probes contract assertions against the running system

## Golden Rules

Rules 1 and 2 come first in this version.

1. **Atomic** - A skill owns one complete job and does not assume which skill runs before or after it
2. **Self-Contained** - References to other skills are optional; a skill must still work with all of them removed
3. **Progressive Disclosure** - AGENTS.md is a map, not a manual
4. **Repository Knowledge** - All context versioned in-repo
5. **Agent-Driven** - Everything is a Skill or Subagent
6. **Evidence Required** - Every verification needs proof
7. **Anti-Rationalization** - Address excuses preemptively
8. **Platform-Agnostic** - Read config, don't assume
9. **Self-Bootstrapping** - harness improves itself

## Getting Started

1. Build: `/harness-stack:tdd` for any logic change or bug fix.
2. Review: `/harness-stack:review-request` to dispatch reviewers, `/harness-stack:review-receive` after feedback.
3. Ship: `/harness-stack:commit` → `/harness-stack:pr-open` → `/harness-stack:pr-land` → `/harness-stack:changelog`.

## Packages

TypeScript runtime packages live under `packages/` and are managed through pnpm workspaces.

- `@hs/llm` (`packages/hs-llm/`) — Stateless LLM provider abstraction (api / cli / sdk / mock). Library + CLI binary. Consumed by skills that need to invoke models. See `packages/hs-llm/README.md` and `references/calling-hs-llm-from-a-skill.md`.
- `@hs/fdd` (`packages/fdd/`, bin `fdd`) — Deterministic bookkeeping CLI for feature-driven development: manages `features.json` / `validation-state.json` / handoffs and enforces coverage + gate over per-plan state in the gitignored `.harness-runtime/`. Used only by the retired fdd skills. See `packages/fdd/README.md`.

## Documentation

- [Getting Started](references/getting-started.md) - Doc index & quick start
- [Golden Rules](references/golden-rules.md) - Core principles
- [References](references/) - All long-lived references: checklists (testing / security / performance / review), fdd-cli, @hs/llm design & recipe

## How It Works

harness-stack uses **pure Agent-driven architecture**:
- No external CLI tools
- Skills handle all operations (init, check, build, etc.)
- Subagents provide specialized expertise
- Self-bootstrapping capability

All skills and agents are addressed through the `harness-stack:` plugin namespace (e.g. `harness-stack:tdd`, `harness-stack:code-reviewer`), which provides collision isolation — no per-skill prefix is needed.
