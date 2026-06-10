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
| `/harness-stack:feedback` | Reflect on a session and file an upstream issue for friction / bugs / suggestions |

### Lifecycle (Full development workflow)
| Phase | Command | Description |
|-------|---------|-------------|
| Define | `/harness-stack:define-product` | Product definition (global) |
| Define | `/harness-stack:define-architecture` | Architecture definition (global) |
| Design (optional) | `/harness-stack:design` | Standalone technical design doc (`docs/design-docs/`) |
| Build (main flow) | `/harness-stack:fdd` | Orchestrator: contract-first plan → features → milestone-gated execution loop |
| Build | `/harness-stack:fdd-planning` | Step 1: plan + features |
| Build | `/harness-stack:fdd-validation-contract` | Definition-of-done assertions (within step 1) |
| Build | `/harness-stack:fdd-execution` | Step 2: per-feature build loop |
| Build | `/harness-stack:fdd-validate` | Step 3: milestone & final gates (scrutiny / security / user-test) |
| Build | `/harness-stack:tdd` | Test-driven development |
| Verify | `/harness-stack:debug` | Debugging and error recovery |
| Verify | `/harness-stack:fdd-validate` | Validation pipeline: static → review → user-test against the running system |
| Review | `/harness-stack:review-request` | Dispatch fresh-context reviewers (code / security / tests) |
| Review | `/harness-stack:review-receive` | Handle reviewer feedback with rigor |
| Review | `/harness-stack:security` | Security audit |
| Ship | `/harness-stack:git` | Git workflow and versioning |
| Ship | `/harness-stack:pr` | Open a PR and drive it to a clean merge |
| Ship | `/harness-stack:ship` | Shipping and launch |

### Subagents (Expert judgment)
| Agent | Expertise |
|-------|-----------|
| `harness-stack:investigator` | Read-only codebase investigation & online research |
| `harness-stack:code-reviewer` | PR review, quality checks |

## Naming Convention

All skills and agents are addressed through the `harness-stack:` plugin namespace (e.g. `harness-stack:fdd`, `harness-stack:code-reviewer`), which isolates them from other plugins — no per-skill prefix is needed.

## Documentation

- [AGENTS.md](AGENTS.md) — Entry point map
- [ARCHITECTURE.md](ARCHITECTURE.md) — System design
- [Golden Rules](docs/golden-rules.md) — Core principles
- [References](docs/references/) — Checklists and patterns

## Feedback

Found friction, a bug, or have a suggestion? All feedback goes to this repo —
**[github.com/wanggang316/harness-stack/issues](https://github.com/wanggang316/harness-stack/issues)** — regardless of which project you were using harness-stack in. You don't need write access to open an issue.

- **From Claude Code**: run `/harness-stack:feedback`. It walks you through a short reflection, de-dups against existing issues, and files a structured report for you.
- **From GitHub directly**: open [a new issue](https://github.com/wanggang316/harness-stack/issues/new/choose) and pick a form — Bug, Friction/DX, Enhancement, or Docs.

## License

MIT
