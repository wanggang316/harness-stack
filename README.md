# harness-stack

Agent-first development framework implementing the harness methodology.

> **Philosophy**: Humans provide direction, agents execute.

## What is harness-stack?

harness-stack is a collection of **Skills** and **Subagents** that enable AI coding agents to autonomously handle the full software development lifecycle — from writing specs to shipping code.

Based on the [harness methodology](https://openai.com/index/harness-engineering/) from OpenAI's Codex team, it implements three core principles:

1. **Progressive Disclosure** — AGENTS.md as a short map, not a giant manual
2. **Repository Knowledge** — All context versioned in-repo, accessible to agents
3. **Pure Agent-Driven** — No external CLI; everything is a Skill or Subagent

## Quick Start

```bash
# In Claude Code, run:
/h-init
```

This initializes harness-stack in your project, creating the full structure.

## Available Skills

### Meta (Manage harness itself)
| Command | Description |
|---------|-------------|
| `/h-init` | Initialize harness in any project |
| `/h-check` | Validate structure and docs |
| `/h-score` | Generate quality scorecard |
| `/h-skill-create` | Create new skills |

### Lifecycle (Full development workflow)
| Phase | Command | Description |
|-------|---------|-------------|
| Define | `/h-spec` | Spec-driven development |
| Plan | `/h-plan` | Planning and task breakdown |
| Build | `/h-build` | Incremental implementation |
| Build | `/h-tdd` | Test-driven development |
| Verify | `/h-debug` | Debugging and error recovery |
| Review | `/h-review` | Code review and quality |
| Review | `/h-security` | Security audit |
| Ship | `/h-git` | Git workflow and versioning |
| Ship | `/h-ship` | Shipping and launch |

### Subagents (Expert judgment)
| Agent | Expertise |
|-------|-----------|
| `h-architect` | System design, technical decisions |
| `h-code-reviewer` | PR review, quality checks |
| `h-test-engineer` | Test strategy, coverage |

## Naming Convention

All skills and agents use `h-` prefix to avoid conflicts with other tools.

## Documentation

- [AGENTS.md](AGENTS.md) — Entry point map
- [ARCHITECTURE.md](ARCHITECTURE.md) — System design
- [Golden Rules](docs/golden-rules.md) — Core principles
- [References](docs/references/) — Checklists and patterns

## License

MIT
