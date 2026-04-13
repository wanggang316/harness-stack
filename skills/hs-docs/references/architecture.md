# ARCHITECTURE.md

Top-level map of the system for humans and agents. Describes domains, layers, dependency directions, and key design decisions. An agent reading this file should understand how the codebase is organized without reading every file.

Inspired by [matklad's ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html).

## When to Write

- New project with multiple domains or layers
- ARCHITECTURE.md is missing in a non-trivial project
- System structure changed significantly (new domain, new layer, major refactor)
- New team members or agents can't navigate the codebase

**Don't write for**: Single-file scripts, throwaway prototypes, or projects where README already covers the structure.

## Process

1. **Map the domains** — What are the major areas of the codebase? (auth, billing, tasks, etc.)
2. **Map the layers** — Within each domain, what are the layers? (types, repo, service, UI, etc.)
3. **Define dependency rules** — Which layers can import from which? (always one direction)
4. **Describe the entry points** — Where does execution start? What are the key files?
5. **Document cross-cutting concerns** — How do shared concerns (auth, logging, config) flow through the system?
6. **Save** — Write to `ARCHITECTURE.md` in project root

## Structure

```markdown
# Architecture

## Overview

[One paragraph: what this system does and what architectural style it follows.]

## Domains

| Domain | Purpose | Key files |
|--------|---------|-----------|
| auth | Authentication and authorization | src/auth/ |
| tasks | Task management CRUD | src/tasks/ |
| billing | Subscription and payment | src/billing/ |

## Layers

Within each domain, code is organized into layers with strict dependency directions:

\```
Types → Config → Repo → Service → Runtime → UI
\```

- **Types** — Data shapes, interfaces, enums
- **Config** — Domain-specific configuration
- **Repo** — Data access (database queries)
- **Service** — Business logic
- **Runtime** — HTTP handlers, queue consumers
- **UI** — Components, pages

Dependencies flow left to right only. UI can import Service, but Service cannot import UI.

## Cross-Cutting Concerns

| Concern | Mechanism |
|---------|-----------|
| Authentication | Middleware, injected via context |
| Logging | Structured logger, passed through providers |
| Configuration | Environment-based, loaded at startup |

## Entry Points

- `src/index.ts` — Application entry, wires domains together
- `src/api/` — HTTP route handlers
- `src/workers/` — Background job processors

```

## Key Principles

- **Map, not manual** — Describe structure, not implementation details
- **Dependency directions are the most important thing** — Who imports whom defines the architecture
- **Link to ADRs** — ARCHITECTURE.md says *what the structure is*, ADRs say *why*
- **Keep it current** — Stale architecture docs are worse than none

## Verification

- [ ] Domains listed with purpose and key files
- [ ] Layers defined with dependency direction rules
- [ ] Cross-cutting concerns documented
- [ ] Entry points identified
- [ ] Links to relevant ADRs
- [ ] Reflects the actual current structure (not aspirational)
