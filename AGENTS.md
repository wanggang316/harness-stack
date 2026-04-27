# harness-stack

Agent-first development framework implementing the harness methodology.

**Philosophy**: Humans provide direction, agents execute.

## Quick Navigation

### Meta-Skills (Manage harness itself)
- `/hs-docs-init` - One-time scaffold of docs structure and base documents
- `/hs-env-init` - Initialize per-worktree isolated runtime environment
- `/hs-skill-create` - Create new skills

### Lifecycle Skills

**Define** → Define product, architecture, and API
- `/hs-define-product` - Product definition (global)
- `/hs-define-architecture` - Architecture definition (global)
- `/hs-define-api-spec` - API specification (global)
- `/hs-spec` - Product specification (feature-level)
- `/hs-design` - Design document (technical)
- `/hs-define-ui-spec` - UI design system (DESIGN.md)

**Plan** → Create and execute plans
- `/hs-planner` - Create execution plans (ExecPlans)
- `/hs-exec-plan` - Execute an approved ExecPlan
- `/hs-tdd` - Test-driven development

**Verify** → Debug and test
- `/hs-debug` - Debugging and error recovery

**Review** → Ensure quality
- `/hs-review-request` - Dispatch fresh-context reviewers (code / security / tests) (author side)
- `/hs-review-receive` - Handle reviewer feedback (author side)
- `/hs-security` - Security audit

**Ship** → Deploy and release
- `/hs-changelog` - Changelog management
- `/hs-git` - Git workflow and versioning
- `/hs-ship` - Shipping and launch

### Specialized Agents

When you need expert judgment:
- `hs-architect` - System design, technical decisions
- `hs-code-reviewer` - PR review, quality checks
- `hs-test-engineer` - Test strategy, coverage

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

## Documentation

- [Golden Rules](docs/golden-rules.md) - Core principles
- [Architecture](docs/architecture.md) - System design
- [Getting Started](docs/index.md) - Quick start guide
- [References](docs/references/) - Checklists and patterns

## How It Works

harness-stack uses **pure Agent-driven architecture**:
- No external CLI tools
- Skills handle all operations (init, check, build, etc.)
- Subagents provide specialized expertise
- Self-bootstrapping capability

All skills and agents use `h-` prefix to avoid conflicts.
