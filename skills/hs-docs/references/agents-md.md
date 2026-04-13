# AGENTS.md

The project entry point for AI agents. A map, not a manual — under 150 lines, pointing to deeper sources of truth.

## When to Write

- New project using AI coding agents
- AGENTS.md is missing or over 150 lines
- Project structure changed significantly

## Process

1. **Survey the project** — Identify key commands, structure, conventions, and documentation locations
2. **Write Quick Start** — The 3-4 commands an agent needs to build/test/lint
3. **Write Architecture Overview** — One paragraph: what the system does, how it's structured, link to full architecture doc
4. **Map Repository Structure** — Directory tree with one-line descriptions per directory
5. **List Golden Rules** — Top 5 rules inline, link to full list in docs/
6. **Link to Documentation** — Table of docs/ subdirectories and their purpose
7. **List Working Conventions** — Key workflows: what to do before making changes, before submitting PRs, when something fails
8. **List Build & Test Commands** — Full commands with comments
9. **List Code Style & Conventions** — Key coding conventions, one per line
10. **Validate length** — Must be under 150 lines. If over, move detail to docs/
11. **Save** — Write to `AGENTS.md` in project root

## Key Principles

- **Map, not manual** — Point to where information lives, don't repeat it
- **Progressive disclosure** — Agents start here, navigate deeper as needed
- **Under 150 lines** — If everything is "important," nothing is

## Structure

```markdown
# [Project Name]

## Quick Start

\```bash
npm run build
npm run lint
npm test
\```

## Architecture Overview

[One paragraph: what the system does, architectural style, key domains. Link to full architecture doc.]

See [Architecture](docs/architecture.md) for domains, layers, and dependency rules.

## Repository Structure

\```
project/
├── src/
│   ├── index.ts               # Entry point
│   ├── commands/               # CLI command implementations
│   ├── templates/              # Template definitions
│   └── utils/                  # Shared utilities
├── tests/                      # Test suites
├── docs/                       # Project documentation
└── .github/workflows/          # CI workflows
\```

## Golden Rules

1. **AGENTS.md is a map, not a manual** — keep this file under 150 lines
2. **Validate boundaries** — parse and validate data at system edges, never probe
3. **Prefer shared utilities** — centralize invariants, avoid hand-rolled duplicates
4. **Every complex change gets an execution plan** — plan before building
5. **Fix the environment, not the prompt** — when agents struggle, add missing tools/docs/guardrails

See [Golden Rules](docs/golden-rules.md) for the complete list with rationale and enforcement.

## Documentation

All project knowledge lives in `docs/`. Start with the area relevant to your task:

| Directory | Purpose |
|---|---|
| [docs/architecture.md](docs/architecture.md) | System architecture, domains, layers |
| [docs/golden-rules.md](docs/golden-rules.md) | Enforced principles and conventions |
| [docs/adrs/](docs/adrs/) | Architecture decision records |

## Working with This Repository

- Before making changes, read the relevant docs for the area you're touching
- For complex work, create an execution plan before starting
- Run lint and tests before submitting PRs
- Follow the dependency rules in architecture docs
- When something fails, ask: "What capability is missing?" — then add it

## Build & Test Commands

\```bash
npm run build          # Build project
npm run lint           # Run linter
npm test               # Run tests
npm run typecheck      # Type checking
\```

## Code Style & Conventions

- [Linter/formatter tool and key settings]
- [Key code patterns or conventions]
- [Naming conventions]
```

## Verification

- [ ] File is under 150 lines
- [ ] Quick start commands are correct
- [ ] Architecture overview links to full architecture doc
- [ ] Repository structure reflects actual layout
- [ ] Top golden rules listed with link to full list
- [ ] All docs/ subdirectories linked
- [ ] Working conventions and boundaries defined
- [ ] Build & test commands are complete
- [ ] Code style conventions listed
- [ ] No duplicated content — only pointers to deeper docs
