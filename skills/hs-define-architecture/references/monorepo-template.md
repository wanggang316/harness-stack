# Architecture Template: Monorepo Project

Use this template for projects with multiple packages/apps in a single repository (Turborepo, Nx, pnpm workspaces, etc.).

Uses a **top-down structure**: overall architecture first, then per-package details. Apps get full domain/layer/entry-point sections; shared packages get purpose + public API.

Save to `docs/architecture.md`.

```markdown
# Architecture

## Overview

<!-- One paragraph: what this system does, architectural style,
     and why it's organized as a monorepo. -->

## Workspace Topology

| Package | Type | Purpose | Internal Deps |
|---|---|---|---|
| apps/web | app | Next.js web application | @repo/ui, @repo/config |
| apps/api | app | Express API server | @repo/db, @repo/shared-types |
| packages/ui | lib | Shared React components | @repo/config |
| packages/shared-types | lib | TypeScript type definitions | (leaf) |
| packages/config | lib | Shared ESLint/TSConfig | (leaf) |

### Package Dependency Graph

\```
packages/shared-types (leaf)
packages/config (leaf)
    │
    ├── packages/ui
    ├── packages/db
    │
    ├── apps/web
    └── apps/api
\```

### Cross-Package Rules

- apps/ → packages/ only (packages must never import from apps)
- No circular dependencies between packages
- Leaf packages must have zero internal dependencies
- Package exports are contracts — breaking changes require updating all consumers first

## Technology Choices

<!-- Shared across the workspace -->

| Technology | Purpose | Rationale |
|---|---|---|
| TypeScript | Language | Type safety, ecosystem, agent-friendly |
| Turborepo | Build orchestration | Incremental builds, task caching |
| pnpm | Package manager | Workspace support, disk efficiency |

## Cross-Cutting Concerns

<!-- Shared concerns that flow through multiple packages -->

| Concern | Mechanism |
|---|---|
| Authentication | Middleware in apps/, shared types in packages/ |
| Logging | Shared logger package, structured output |
| Configuration | Per-package .env, shared config package for lint/tsconfig |

---

<!-- Per-package architecture below. Each app gets full architecture
     detail; shared packages get purpose + public API description. -->

## apps/web

### Domains

| Domain | Purpose | Key Files |
|---|---|---|
| dashboard | Main user interface | apps/web/src/app/dashboard/ |
| settings | User preferences | apps/web/src/app/settings/ |

### Layers

\```
Types → Service → UI
\```

### Entry Points

- `apps/web/src/app/layout.tsx` — Root layout
- `apps/web/src/app/page.tsx` — Home page

## apps/api

### Domains

| Domain | Purpose | Key Files |
|---|---|---|
| auth | Authentication and authorization | apps/api/src/auth/ |
| tasks | Task management CRUD | apps/api/src/tasks/ |

### Layers

\```
Types → Config → Repo → Service → Runtime
\```

### Dependency Rules

- Runtime → Service → Repo → Types (one direction only)
- External services accessed only through adapters

### Entry Points

- `apps/api/src/index.ts` — Server entry, wires domains together

## packages/ui

### Purpose

Shared React component library used by apps/web and apps/admin.

### Public API

- Layout components (Sidebar, Header, PageContainer)
- Form components (Input, Select, Button)
- Data display (Table, Card, Badge)

## packages/shared-types

### Purpose

TypeScript type definitions shared across all packages. Leaf package — no internal dependencies.

### Public API

- Domain types (User, Task, Team)
- API request/response types
- Shared enums and constants
```
