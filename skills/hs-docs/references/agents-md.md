# AGENTS.md

The project entry point for AI agents. A map, not a manual — under 150 lines, pointing to deeper sources of truth.

## When to Write

- New project using AI coding agents
- AGENTS.md is missing or over 150 lines
- Project structure changed significantly

## Process

1. **Survey the project** — Identify key commands, structure, conventions, and documentation locations
2. **Write Quick Start** — The 3-4 commands an agent needs to build/test/lint
3. **Map Repository Structure** — Directory layout with one-line descriptions
4. **Link to Documentation** — Table of docs/ subdirectories and their purpose
5. **List Conventions** — Key coding conventions, one per line
6. **Define Boundaries** — Always / Ask first / Never rules
7. **Validate length** — Must be under 150 lines. If over, move detail to docs/
8. **Save** — Write to `AGENTS.md` in project root

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

## Repository Structure

\```
src/           → Application source code
tests/         → Unit and integration tests
docs/          → Documentation
  specs/       → Feature specifications
  plans/       → Execution plans
  adrs/        → Architecture decision records
\```

## Documentation

| Directory | Purpose |
|---|---|
| docs/specs/ | Feature specifications |
| docs/plans/ | Execution plans with progress |
| docs/adrs/ | Architecture decision records |

## Conventions

- [Key convention 1]
- [Key convention 2]

## Boundaries

- **Always:** Run tests before commits, follow naming conventions
- **Ask first:** Database schema changes, adding dependencies
- **Never:** Commit secrets, remove failing tests without approval
```

## Verification

- [ ] File is under 150 lines
- [ ] Quick start commands are correct
- [ ] All docs/ subdirectories linked
- [ ] Conventions and boundaries defined
- [ ] No duplicated content — only pointers to deeper docs
