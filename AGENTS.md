# harness-stack

Agent-first development framework implementing the harness methodology.

**Philosophy**: Humans provide direction, agents execute.

## Quick Navigation

### Meta-Skills (Manage harness itself)
- `/h-init` - Initialize harness in any project
- `/h-check` - Validate structure and documentation
- `/h-score` - Generate quality scorecard
- `/h-skill-create` - Create new skills

### Lifecycle Skills

**Define** → Write specifications before code
- `/h-spec` - Spec-driven development

**Plan** → Break down work into tasks
- `/h-plan` - Planning and task breakdown
- `/h-architecture` - Architecture design

**Build** → Implement incrementally
- `/h-build` - Incremental implementation
- `/h-tdd` - Test-driven development

**Verify** → Debug and test
- `/h-debug` - Debugging and error recovery

**Review** → Ensure quality
- `/h-review` - Code review and quality
- `/h-security` - Security audit

**Ship** → Deploy and release
- `/h-git` - Git workflow and versioning
- `/h-ship` - Shipping and launch

### Specialized Agents

When you need expert judgment:
- `h-architect` - System design, technical decisions
- `h-code-reviewer` - PR review, quality checks
- `h-test-engineer` - Test strategy, coverage

## Golden Rules

1. **Progressive Disclosure** - AGENTS.md is a map, not a manual
2. **Repository Knowledge** - All context versioned in-repo
3. **Agent-Driven** - Everything is a Skill or Subagent
4. **Evidence Required** - Every verification needs proof
5. **Anti-Rationalization** - Address excuses preemptively
6. **Platform-Agnostic** - Read config, don't assume
7. **Self-Bootstrapping** - harness improves itself

## Getting Started

1. Initialize: `/h-init` in your project
2. Write spec: `/h-spec` for new features
3. Plan work: `/h-plan` to break down tasks
4. Build: `/h-build` with incremental implementation
5. Review: `/h-review` before merging
6. Ship: `/h-ship` to deploy

## Documentation

- [Golden Rules](docs/golden-rules.md) - Core principles
- [Architecture](ARCHITECTURE.md) - System design
- [Getting Started](docs/index.md) - Quick start guide
- [References](docs/references/) - Checklists and patterns

## How It Works

harness-stack uses **pure Agent-driven architecture**:
- No external CLI tools
- Skills handle all operations (init, check, build, etc.)
- Subagents provide specialized expertise
- Self-bootstrapping capability

All skills and agents use `h-` prefix to avoid conflicts.
