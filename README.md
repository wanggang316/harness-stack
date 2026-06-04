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

## Available Skills

### Meta (Manage harness itself)
| Command | Description |
|---------|-------------|
| `/harness-stack:skill-create` | Create new skills |

### Lifecycle (Full development workflow)
| Phase | Command | Description |
|-------|---------|-------------|
| Define | `/harness-stack:define-product` | Product definition (global) |
| Define | `/harness-stack:define-architecture` | Architecture definition (global) |
| Design (optional) | `/harness-stack:design` | Standalone technical design doc (`docs/design-docs/`) |
| Build (main flow) | `/harness-stack:feature-driven-development` | Contract-first plan → features → milestone-gated execution loop |
| Build | `/harness-stack:tdd` | Test-driven development |
| Verify | `/harness-stack:debug` | Debugging and error recovery |
| Verify | `/harness-stack:user-test` | Probe running system against contract assertions |
| Review | `/harness-stack:review-request` | Dispatch fresh-context reviewers (code / security / tests) |
| Review | `/harness-stack:review-receive` | Handle reviewer feedback with rigor |
| Review | `/harness-stack:security` | Security audit |
| Ship | `/harness-stack:git` | Git workflow and versioning |
| Ship | `/harness-stack:ship` | Shipping and launch |

### Subagents (Expert judgment)
| Agent | Expertise |
|-------|-----------|
| `harness-stack:architect` | System design, technical decisions |
| `harness-stack:code-reviewer` | PR review, quality checks |

## Naming Convention

All skills and agents are addressed through the `harness-stack:` plugin namespace (e.g. `harness-stack:feature-driven-development`, `harness-stack:code-reviewer`), which isolates them from other plugins — no per-skill prefix is needed.

## Documentation

- [AGENTS.md](AGENTS.md) — Entry point map
- [ARCHITECTURE.md](ARCHITECTURE.md) — System design
- [Golden Rules](docs/golden-rules.md) — Core principles
- [References](docs/references/) — Checklists and patterns

## License

MIT
