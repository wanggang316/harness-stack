# {{PROJECT_NAME}}

## Quick Start

<!-- The 3-4 commands an agent needs to build, test, and lint -->

```bash
{{BUILD_COMMAND}}
{{LINT_COMMAND}}
{{TEST_COMMAND}}
```

## Architecture Overview

<!-- One paragraph: what the system does, architectural style, key domains -->

See [Architecture](docs/architecture.md) for domains, layers, and dependency rules.

## Repository Structure

<!-- Directory tree with one-line comment per directory. Reflect actual layout -->

```
{{PROJECT_NAME}}/
├── src/                        # Source
├── tests/                      # Test suites
├── docs/                       # Project documentation
└── .github/workflows/          # CI workflows
```

## Golden Rules

<!-- Top 5 rules inline. Link to full list for the rest -->

1. **AGENTS.md is a map, not a manual** — keep this file under 150 lines
2. **Validate boundaries** — parse and validate data at system edges, never probe
3. **Prefer shared utilities** — centralize invariants, avoid hand-rolled duplicates
4. **Every complex change runs feature-driven development** — contract-first plan before building
5. **Fix the environment, not the prompt** — when agents struggle, add missing tools/docs/guardrails

See [Golden Rules](docs/golden-rules.md) for the complete list with rationale and enforcement.

## Documentation

<!-- Table of docs/ subdirectories. Start with the area relevant to your task -->

| Directory | Purpose |
|---|---|
| [docs/architecture.md](docs/architecture.md) | System architecture, domains, layers |
| [docs/golden-rules.md](docs/golden-rules.md) | Enforced principles and conventions |
| [docs/design-docs/](docs/design-docs/) | Technical design documents (human-authored) |
| [docs/user-tests/](docs/user-tests/) | Testing Library: personas + shared fixtures |
| docs/user-test-patterns.md | Project-wide testing conventions |
| [docs/references/](docs/references/) | External docs, API references |
| [docs/generated/](docs/generated/) | Auto-generated artifacts |
| `.harness-runtime/` | Per-plan FDD state (plans, contracts, features) — **gitignored**, not part of docs |

## Working with This Repository

<!-- Key workflows and boundaries -->

- Before making changes, read the relevant docs for the area you're touching
- For complex work, run feature-driven development (`harness-stack:feature-driven-development`) before starting
- Run lint and tests before submitting PRs
- Follow the dependency rules in architecture docs
- When something fails, ask: "What capability is missing?" — then add it

## Build & Test Commands

<!-- Full commands with inline comments -->

```bash
{{BUILD_COMMAND}}          # Build project
{{LINT_COMMAND}}           # Run linter
{{TEST_COMMAND}}           # Run tests
```

## Code Style & Conventions

<!-- Key coding conventions, one per line -->

- [Linter/formatter tool and key settings]
- [Key code patterns or conventions]
- [Naming conventions]
