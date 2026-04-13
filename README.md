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
/hs-init
```

This initializes harness-stack in your project, creating the full structure.

## Available Skills

### Meta (Manage harness itself)
| Command | Description |
|---------|-------------|
| `/hs-init` | Initialize harness in any project |
| `/hs-check` | Validate structure and docs |
| `/hs-score` | Generate quality scorecard |
| `/hs-skill-create` | Create new skills |

### Lifecycle (Full development workflow)
| Phase | Command | Description |
|-------|---------|-------------|
| Define | `/hs-spec` | Product specification |
| Define | `/hs-design` | Design document |
| Plan | `/hs-plan` | Planning and task breakdown |
| Build | `/hs-build` | Incremental implementation |
| Build | `/hs-tdd` | Test-driven development |
| Verify | `/hs-debug` | Debugging and error recovery |
| Review | `/hs-review` | Code review and quality |
| Review | `/hs-security` | Security audit |
| Ship | `/hs-git` | Git workflow and versioning |
| Ship | `/hs-ship` | Shipping and launch |

### Subagents (Expert judgment)
| Agent | Expertise |
|-------|-----------|
| `hs-architect` | System design, technical decisions |
| `hs-code-reviewer` | PR review, quality checks |
| `hs-test-engineer` | Test strategy, coverage |

## Naming Convention

All skills and agents use `h-` prefix to avoid conflicts with other tools.

## Documentation

- [AGENTS.md](AGENTS.md) — Entry point map
- [ARCHITECTURE.md](ARCHITECTURE.md) — System design
- [Golden Rules](docs/golden-rules.md) — Core principles
- [References](docs/references/) — Checklists and patterns

## License

MIT
