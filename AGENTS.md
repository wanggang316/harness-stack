# harness-stack

Agent-first development framework implementing the harness methodology.

**Philosophy**: Humans provide direction, agents execute.

## Quick Navigation

### Meta-Skills (Manage harness itself)
- `/harness-stack:docs-init` - One-time scaffold of docs structure and base documents
- `/harness-stack:env-init` - Initialize per-worktree isolated runtime environment
- `/harness-stack:skill-create` - Create new skills

### Lifecycle Skills

**Define** → Define product, architecture, API, UI
- `/harness-stack:define-product` - Product definition (global)
- `/harness-stack:define-architecture` - Architecture definition (global)
- `/harness-stack:define-api-spec` - API specification (global)
- `/harness-stack:define-ui-spec` - UI design system (DESIGN.md)
- `/harness-stack:spec` - Product specification, PM view (feature-level)
- `/harness-stack:design` - Design document, engineering view (feature-level)
- `/harness-stack:test-spec` - User-test set, QA view (feature-level, docs/user-tests/); first run also bootstraps docs/user-test-patterns.md

**Plan** → Create and execute plans
- `/harness-stack:planner` - Create execution plans (ExecPlans)
- `/harness-stack:exec-plan` - Execute an approved ExecPlan
- `/harness-stack:tdd` - Test-driven development

**Verify** → Debug and test
- `/harness-stack:debug` - Debugging and error recovery
- `/harness-stack:user-test` - Probe a running system against user-test cases; reports PASS/FAIL with evidence

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
- `harness-stack:architect` - System design, technical decisions
- `harness-stack:code-reviewer` - PR review, quality checks

## Golden Rules

1. **Progressive Disclosure** - AGENTS.md is a map, not a manual
2. **Repository Knowledge** - All context versioned in-repo
3. **Agent-Driven** - Everything is a Skill or Subagent
4. **Evidence Required** - Every verification needs proof
5. **Anti-Rationalization** - Address excuses preemptively
6. **Platform-Agnostic** - Read config, don't assume
7. **Self-Bootstrapping** - harness improves itself

## Getting Started

1. Write spec: `/harness-stack:spec` for new features
3. Plan work: `/harness-stack:planner` to create execution plan
4. Build: `/harness-stack:exec-plan` to execute the plan
5. Review: `/harness-stack:review-request` to dispatch, `/harness-stack:review-receive` after feedback
6. Ship: `/harness-stack:ship` to deploy

## Packages

TypeScript runtime packages live under `packages/` and are managed through pnpm workspaces.

- `@hs/llm` (`packages/hs-llm/`) — Stateless LLM provider abstraction (api / cli / sdk / mock). Library + CLI binary. Consumed by skills that need to invoke models. See `packages/hs-llm/README.md` and `docs/recipes/calling-hs-llm-from-a-skill.md`.

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

All skills and agents are addressed through the `harness-stack:` plugin namespace (e.g. `harness-stack:spec`, `harness-stack:code-reviewer`), which provides collision isolation — no per-skill prefix is needed.
