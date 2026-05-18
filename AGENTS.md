# harness-stack

Agent-first development framework implementing the harness methodology.

**Philosophy**: Humans provide direction, agents execute.

## Quick Navigation

### Meta-Skills (Manage harness itself)
- `/hs-docs-init` - One-time scaffold of docs structure and base documents
- `/hs-env-init` - Initialize per-worktree isolated runtime environment
- `/hs-skill-create` - Create new skills

### Lifecycle Skills

**Define** → Define product, architecture, API, UI, testing
- `/hs-define-product` - Product definition (global)
- `/hs-define-architecture` - Architecture definition (global)
- `/hs-define-api-spec` - API specification (global)
- `/hs-define-ui-spec` - UI design system (DESIGN.md)
- `/hs-define-test-spec` - User-test conventions per platform (docs/user-test-patterns.md)
- `/hs-spec` - Product specification, PM view (feature-level)
- `/hs-design` - Design document, engineering view (feature-level)
- `/hs-test-spec` - User-test set, QA view (feature-level, docs/user-tests/)

**Plan** → Create and execute plans
- `/hs-planner` - Create execution plans (ExecPlans)
- `/hs-exec-plan` - Execute an approved ExecPlan
- `/hs-tdd` - Test-driven development

**Verify** → Debug and test
- `/hs-debug` - Debugging and error recovery
- `/hs-user-test` - Probe a running system against user-test cases; reports PASS/FAIL with evidence

**Review** → Ensure quality
- `/hs-review-request` - Dispatch fresh-context reviewers (code / security / tests) (author side)
- `/hs-review-receive` - Handle reviewer feedback (author side)
- `/hs-security` - Security audit

**Deliberate** → Multi-agent reasoning
- `/hs-debate` - Multi-agent debate among heterogeneous LLM agents on a single question
- `/hs-decide` - Parallel multi-agent decision support: each agent answers independently, synthesis pass produces final decision with confidence and minority positions

**Ship** → Deploy and release
- `/hs-changelog` - Changelog management
- `/hs-git` - Git workflow and versioning
- `/hs-land` - Drive an open PR to a clean merge
- `/hs-ship` - Shipping and launch

### Specialized Agents

When you need expert judgment:
- `hs-architect` - System design, technical decisions
- `hs-code-reviewer` - PR review, quality checks

## Golden Rules

1. **Progressive Disclosure** - AGENTS.md is a map, not a manual
2. **Repository Knowledge** - All context versioned in-repo
3. **Agent-Driven** - Everything is a Skill or Subagent
4. **Evidence Required** - Every verification needs proof
5. **Anti-Rationalization** - Address excuses preemptively
6. **Platform-Agnostic** - Read config, don't assume
7. **Self-Bootstrapping** - harness improves itself

## Getting Started

1. Write spec: `/hs-spec` for new features
3. Plan work: `/hs-planner` to create execution plan
4. Build: `/hs-exec-plan` to execute the plan
5. Review: `/hs-review-request` to dispatch, `/hs-review-receive` after feedback
6. Ship: `/hs-ship` to deploy

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

All skills and agents use `h-` prefix to avoid conflicts.
