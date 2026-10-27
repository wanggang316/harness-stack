# harness-stack

An agent-first **development harness** — a curated stack of tools that keep an agent building stably, durably, and at high quality.

**Philosophy**: Humans provide direction, agents execute.

> **Refactor in progress.** Retired skills live in `skills/deprecated/` and are not loaded by the plugin. Do not reference or invoke them.

## Quick Navigation

### Meta-Skills (Manage harness itself)
- `/harness-stack:feedback` - Reflect after using harness-stack and file upstream issues for friction/bugs/suggestions

### Lifecycle Skills

**Define** → Domain, design, UI
- `/harness-stack:grill-with-docs` - Stress-test requirements and design in rounds; record confirmed terms and decisions
- `/harness-stack:domain-modeling` - Clarify domain terms and decisions during design discussions
- `/harness-stack:define-ui-spec` - UI design system (DESIGN.md)

**Knowledge** → Maintain project understanding
- `/harness-stack:document` - Update current domain knowledge, decisions, and runbooks from confirmed changes
- `/harness-stack:audit-docs` - Check documentation accuracy, discoverability, and value; repair supported findings

**Setup** → Per-project config
- `/harness-stack:setup-harness-stack` - Configure the ticket tracker (GitHub / GitLab / Linear) and the ticket state machine, and create missing state labels or states after approval; writes to `~/.harness-stack/<project>/`, not the repo. Its `references/` hold the ticket knowledge other skills read

**Plan** → Capture specs and split work into tickets
- `/harness-stack:to-spec` - Publish agreed requirements and design decisions as one executable spec ticket
- `/harness-stack:to-tickets` - Split a plan, spec, or conversation into tracer-bullet tickets with native blocking / sub-ticket links; writes nothing into the repo

**Build**
- `/harness-stack:implement` - Implement a task, ticket, or spec with tickets (or fix review findings) with verification, a ticket workpad, and a reviewable handoff
- `/harness-stack:tdd` - Test-driven development

**Review** → Ensure quality
- `/harness-stack:code-review` - Run independent Standards and Spec subagent reviews of a defined change and feed the result back to the ticket or the conversation

**Deliberate** → Multi-agent reasoning
- `/harness-stack:debate` - Multi-agent debate among heterogeneous LLM agents on a single question
- `/harness-stack:decide` - Parallel multi-agent decision support: each agent answers independently, synthesis pass produces final decision with confidence and minority positions

**Ship** → Deploy and release
- `/harness-stack:changelog` - Changelog management
- `/harness-stack:git` - Git workflow and versioning
- `/harness-stack:pr-open` - Open a PR: sync, push, and write a body built on a visual summary, evidence, and merge danger
- `/harness-stack:merge` - Drive an approved PR to a clean merge (watch CI, handle feedback, squash-merge) and move its ticket to Done

**Productivity** → Capture visual evidence
- `/harness-stack:screenshot` - Capture and process macOS screenshots
- `/harness-stack:screen-record` - Record macOS screens and process videos

### Ticket workflow

Tickets move through one state machine: `Backlog → Todo → In Progress → In Review → Reviewed → Merging → Done` (see [state-machine.md](skills/engineering/setup-harness-stack/references/state-machine.md)). `implement` takes a ticket from `Todo` to `In Review`, `code-review` from `In Review` to `Reviewed`, a person approves `Merging`, and `merge` finishes at `Done`. Each skill also works without a ticket and then reports in the conversation. agent-workflow runs the same three skills unattended and owns the transitions there.

### Documentation workflow

Use current domain documentation and active decisions when changing a feature. Use `grill-with-docs` when you want an explicit design interview with durable notes. Capture agreed requirements and design decisions with `to-spec` when a complete spec issue helps execution. Use `to-tickets` when the work needs smaller tickets; neither skill requires the other. Keep current knowledge accurate with the implementation, and keep execution state and evidence in tickets and PRs. Use a design file only when the change needs one.

Make all repository edits in a dedicated worktree on a non-main branch, including documentation and skills. Review code and related knowledge in the same PR; main remains the merged baseline.

For document roles, placement, and lifecycle, read [Project Knowledge](references/project-knowledge.md). The documentation skills are independent; none requires another skill to run first.

### State

harness-stack is stateful. Per-project config and state live in `~/.harness-stack/<project>/`, never in the project repo. Skills must still run when the state is missing. See [references/state.md](references/state.md).

### Skill Layout

Skills are grouped by category: `skills/{engineering,productivity,ui}/<name>/SKILL.md`. Each category directory must be listed in the `skills` array of `.claude-plugin/plugin.json`; the default scan only finds `skills/<name>/SKILL.md` (`feedback`).

To add or change a skill in this repo, use the repo-local `/skill-create` (`.claude/skills/skill-create/`). It is not shipped with the plugin.

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
2. **Self-Contained** - A skill owns its goal and completion criteria; it may call specialist skills with explicit fallback or blocking behavior
3. **Progressive Disclosure** - AGENTS.md is a map, not a manual
4. **Repository Knowledge** - All context versioned in-repo
5. **Agent-Driven** - Everything is a Skill or Subagent
6. **Evidence Required** - Every verification needs proof
7. **Anti-Rationalization** - Address excuses preemptively
8. **Platform-Agnostic** - Read config, don't assume
9. **Self-Bootstrapping** - harness improves itself

## Getting Started

1. Build: `/harness-stack:implement` for a defined task; `/harness-stack:tdd` for focused test-driven work.
2. Review: `/harness-stack:code-review` for independent Standards and Spec reviews; `/harness-stack:implement` with the findings to fix them.
3. Ship: `/harness-stack:commit` → `/harness-stack:pr-open` → `/harness-stack:merge` → `/harness-stack:changelog`.

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
