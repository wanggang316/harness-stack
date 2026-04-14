# Architecture Template: Monorepo Project

Use this template for projects with multiple packages/apps in a single repository.

Root ARCHITECTURE.md covers **workspace-level** concerns only — dependency direction, invariants, cross-cutting patterns. Per-package internals (domains, layers, entry points) belong in `docs/design-docs/`.

Inspired by [matklad's ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html): keep it short so it survives.

Save to `docs/architecture.md`.

```markdown
# Architecture

## Overview

<!-- One paragraph: what this system does, architectural style,
     and why it's organized as a monorepo.
     Link to docs/product-spec.md for product context. -->

## Codemap

<!-- The heart of the document. Every package in one line.
     After reading this section, a contributor should know
     where to look for any piece of functionality. -->

### Apps

| Package | Purpose |
|---|---|
| `apps/web` | Next.js web application — user-facing dashboard |
| `apps/api` | Express API server — REST endpoints for web and mobile |

### Packages

| Package | Purpose |
|---|---|
| `packages/ui` | Shared React component library |
| `packages/db` | Database client and schema (Prisma) |
| `packages/shared-types` | TypeScript type definitions shared across all packages |
| `packages/config` | Shared ESLint, TSConfig, Tailwind configurations |

## Dependency Direction

<!-- The most important section. Who can import from whom
     defines the architecture. Visualize it. -->

\```
packages/shared-types
packages/config
    │
    ├── packages/ui
    ├── packages/db
    │
    ├── apps/web
    └── apps/api
\```

**Rules:**
- apps/ → packages/ only (packages must never import from apps)
- No circular dependencies between packages
- Leaf packages (shared-types, config) must have zero internal dependencies
- Package exports are contracts — breaking changes require updating all consumers first

**Enforcement:**
- <!-- How these rules are actually enforced:
     ESLint boundaries plugin, TypeScript path restrictions,
     CI checks, CODEOWNERS, etc. -->

## Architectural Invariants

<!-- Rules that don't appear in code. Write them down because
     if someone violates them, the bug won't show up immediately
     — the system will slowly rot. -->

- <!-- e.g. All apps share a single database instance -->
- <!-- e.g. Packages must not have runtime side effects at import time -->
- <!-- e.g. All HTTP endpoints must pass through auth middleware -->
- <!-- e.g. Shared types are the only cross-package contract — no shared runtime code -->

## Cross-Cutting Concerns

| Concern | Mechanism |
|---|---|
| Authentication | <!-- how it's shared across packages --> |
| Logging | <!-- where the logger lives, how it's configured --> |
| Error handling | <!-- shared error types, reporting --> |
| Configuration | <!-- per-package .env, shared config package --> |

## Technology Choices

<!-- Key dependencies with purpose and rationale.
     Scope distinguishes workspace-wide choices from per-app choices.
     Focus on WHY — "we chose X" without "because Y" is useless. -->

| Technology | Scope | Purpose | Rationale |
|---|---|---|---|
| TypeScript | all | Language | Type safety, ecosystem, agent-friendly |
| Turborepo | workspace | Build orchestration | Incremental builds, task caching |
| pnpm | workspace | Package manager | Workspace support, disk efficiency |
| Next.js | apps/web | Web framework | <!-- why this app uses Next.js --> |
| Fastify | apps/api | API framework | <!-- why this app uses Fastify --> |
```
