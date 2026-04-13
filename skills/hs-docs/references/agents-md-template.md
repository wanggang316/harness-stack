# [Project Name]

## Quick Start

```bash
npm run build
npm run lint
npm test
```

## Repository Structure

```
src/           → Application source code
tests/         → Unit and integration tests
docs/          → Documentation
  specs/       → Feature specifications
  plans/       → Execution plans
  adrs/        → Architecture decision records
  references/  → External references, API docs
```

## Documentation

All project knowledge lives in `docs/`. Start with the area relevant to your task:

| Directory | Purpose |
|---|---|
| [docs/specs/](docs/specs/) | Feature specifications |
| [docs/plans/](docs/plans/) | Execution plans with progress |
| [docs/adrs/](docs/adrs/) | Architecture decision records |
| [docs/references/](docs/references/) | External docs, API references |

## Conventions

- [List key coding conventions here]
- [One convention per line]
- [Link to detailed docs when needed]

## Boundaries

- **Always:** Run tests before commits, follow naming conventions, validate inputs
- **Ask first:** Database schema changes, adding dependencies, changing CI config
- **Never:** Commit secrets, edit vendor directories, remove failing tests without approval
