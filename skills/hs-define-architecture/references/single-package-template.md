# Architecture Template: Single-Package Project

Use this template for projects with a single deployable unit and no workspace structure.

Save to `docs/architecture.md`.

```markdown
# Architecture

## Overview

<!-- One paragraph: what this system does and what architectural
     style it follows. Link to docs/product-spec.md for product context. -->

## Domains

<!-- Major areas of the codebase. Each domain has a clear boundary,
     a single responsibility, and a reason for existing separately. -->

| Domain | Purpose | Key Files |
|---|---|---|
| auth | Authentication and authorization | src/auth/ |
| tasks | Task management CRUD | src/tasks/ |

## Layers

<!-- Layers within each domain, with strict dependency direction.
     Show the direction visually — this is the most important
     part of the architecture. -->

\```
Types → Config → Repo → Service → Runtime → UI
\```

- **Types** — Data shapes, interfaces, enums
- **Config** — Domain-specific configuration
- **Repo** — Data access (database queries)
- **Service** — Business logic
- **Runtime** — HTTP handlers, queue consumers
- **UI** — Components, pages

Dependencies flow left to right only.

## Dependency Rules

<!-- Explicit rules about who can import from whom.
     These rules are the architecture. -->

- UI → Service → Repo → Types (one direction only)
- Shared types can be imported by any layer
- No circular dependencies between domains
- External services accessed only through adapters

## Cross-Cutting Concerns

<!-- Shared concerns that flow through multiple domains -->

| Concern | Mechanism |
|---|---|
| Authentication | Middleware, injected via context |
| Logging | Structured logger, passed through providers |
| Configuration | Environment-based, loaded at startup |

## Entry Points

<!-- Where does execution start? Key files that wire everything together -->

- `src/index.ts` — Application entry, wires domains together
- `src/api/` — HTTP route handlers

## Technology Choices

<!-- Key dependencies with purpose and rationale. Focus on WHY
     this technology was chosen over alternatives. -->

| Technology | Purpose | Rationale |
|---|---|---|
| TypeScript | Language | Type safety, ecosystem, agent-friendly |
| PostgreSQL | Database | ACID compliance, relational model fits domain |
```
