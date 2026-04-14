---
name: hs-define-conventions
description: Defines coding conventions at the project level. Use when starting a new project, when conventions.md is missing or outdated, or when code reviews reveal inconsistent patterns. Produces docs/conventions.md as the authoritative reference for how code should be written.
---

# hs-define-conventions: Coding Conventions

## Overview

Define the shared rules that every contributor — human or agent — follows across the project. `docs/conventions.md` is the cross-cutting behavioral contract that sits above any single language or domain.

In monorepo and multi-language projects, language-specific conventions (naming, error handling, code style) belong in **tooling configs** — ESLint, Ruff, Clippy, etc. The conventions doc focuses on what tooling can't enforce: API contracts, database patterns, and the tooling inventory itself. The principle is simple: **maximize Automated Enforcement, minimize documented rules.**

This is not an architecture document. Architecture defines structure (domains, layers, dependencies); conventions define cross-cutting behavioral patterns within that structure. Architecture lives in `docs/architecture.md`.

## When to Use

- Starting a new project with multiple contributors (human or agent)
- `docs/conventions.md` is missing in a project where agents write code
- Code reviews repeatedly flag inconsistent patterns
- New team members (or agents) can't infer how to write code that fits the project
- After a major refactor that changed established patterns

**When NOT to use:** Single-file scripts, throwaway prototypes, or projects where one person writes all code and patterns are self-consistent.

## Philosophy

You are a tooling-first thinker, not a standards committee.

- **Automated Enforcement first.** Every convention you're about to write — ask first: "Can a tool enforce this?" If yes, configure the tool and list it in the Automated Enforcement table. Only document what tools can't catch.
- **Cross-cutting only.** In a monorepo with TypeScript, Python, and Go, don't write naming conventions — each language has its own linter. Write API response shapes and database naming patterns — those span all languages.
- **Discover, don't invent.** Read the codebase first. Conventions should codify what the project already does well, not impose an external standard.
- **Specific beats general.** "Use consistent API responses" is useless. Show the exact JSON shape. Every convention must include a concrete example.
- **Less is more.** 5 cross-cutting rules > 50 language-specific rules. If your conventions doc exceeds one screen, it's too long.
- **Agent-readable is the bar.** A convention is good enough when an agent can follow it without asking a human for clarification.

## Process

```
DISCOVER ──→ CHALLENGE ──→ DEFINE ──→ APPROVE
  │               │            │          │
  ▼               ▼            ▼          ▼
Scan code      Question     Write       Human
Read configs   patterns     conventions confirms
Sample files   and gaps     .md
```

### Phase 1: Discover

Before writing any conventions, understand what the project actually does.

**Load context:**
- Read `docs/architecture.md` — conventions exist within architecture, not alongside it
- Read `docs/product-spec.md` — understand what domains matter
- Read existing `docs/conventions.md` if it exists — update, don't rewrite from scratch

**Identify tooling already in place:**

Scan for linter/formatter config files:

```
Tooling configs to check:
- .eslintrc* / eslint.config.* / biome.json     (JS/TS linting)
- .prettierrc* / .editorconfig                   (formatting)
- tsconfig.json / jsconfig.json                  (type checking)
- pyproject.toml / setup.cfg / .flake8 / ruff.toml  (Python)
- Cargo.toml / rustfmt.toml / clippy.toml        (Rust)
- .golangci.yml                                   (Go)
- package.json scripts (lint, format, check)
```

List what these tools already enforce. These go into the Automated Enforcement section — not into conventions prose.

**Sample cross-cutting patterns:**

Focus on patterns that span multiple languages/domains — these are the only things worth documenting:

1. **API patterns** (if applicable) — Read 3-5 API route handlers across different domains. Check: response shapes, error response format, validation approach, authentication pattern.
2. **Database patterns** (if applicable) — Read schema files or migration files. Check: table naming, column naming, index conventions, relationship patterns.

**Present discovery results:**

```
DISCOVERED PATTERNS:

Automated Enforcement (tooling inventory):
- packages/api: ESLint + Prettier (.eslintrc.js, .prettierrc)
- packages/worker: Ruff + Black (pyproject.toml)
- packages/cli: Clippy + rustfmt (Cargo.toml)
→ Language-specific conventions are handled by these tools.

API patterns (sampled 5 route handlers):
- Response shape: { data, error, meta } (4/5) → Strong convention
- Error codes: HTTP status + app-specific code (3/5) → Emerging (needs decision)
- Validation: Zod schemas at handler layer (5/5) → Strong convention

Database patterns (sampled schema files):
- Tables: snake_case plural (users, order_items) (8/8) → Strong convention
- Columns: snake_case (created_at, user_id) (8/8) → Strong convention
- Foreign keys: <table>_id pattern (6/8) → Emerging (needs decision)

INCONSISTENCIES FOUND:
1. Error response format differs between /api/v1 and /api/v2
2. Some tables use UUID PKs, some use auto-increment
→ Which patterns are intentional?
```

Confidence thresholds:
- **80%+ of sampled files** → Strong convention (document as-is)
- **50-80%** → Emerging convention (present to human for decision)
- **<50%** → Inconsistent (present to human — pick one or leave undefined)

### Phase 2: Challenge

This is the most critical phase. Do not skip it.

**For each discovered pattern, ask:**
- "Is this intentional, or did it just happen?" Copy-paste creates false patterns.
- "Should this be a linter rule instead of a documented convention?" (Golden Rule 11: fix environment, not prompts)

**For each inconsistency, ask:**
- "Which variant should become the convention, or do we need neither?"
- "Is the inconsistency a migration in progress? If so, what's the target?"

**For missing areas, ask:**
- "Do you need a convention here, or is the current approach working?"
- Not every category needs a convention. The human decides which ones matter.

**Challenge over-specification:**
- "This convention is language-specific. It belongs in the linter config, not in conventions.md."
- "You have 3 files that use this pattern. Is it really a project-wide cross-cutting convention?"

**Challenge under-specification:**
- "API responses use different shapes across domains. This will confuse consumers and agents."
- "Database tables follow two different naming patterns. Which is the convention?"

**Push language-specific conventions to tooling:**
- Naming, formatting, imports, error handling patterns → linter/formatter configs
- Only conventions that span multiple languages or that tools can't enforce belong here

**Confirm which cross-cutting sections apply:**

```
CROSS-CUTTING CONVENTIONS FOR YOUR PROJECT:

Always included:
✓ Automated Enforcement — tooling inventory across all packages

If applicable:
☐ API Patterns — response shapes, error format, validation, auth
☐ Database Patterns — table/column naming, key strategy, migrations

→ Which sections apply to your project?
   Everything else is handled by per-language tooling.
```

### Phase 3: Define

Write `docs/conventions.md` using the template below. Only include sections the human confirmed as applicable in Phase 2.

```markdown
# Conventions

**Last Updated:** [date]

## Automated Enforcement

<!-- This is the most important section. Language-specific conventions
     (naming, formatting, error handling, imports, etc.) are enforced
     by tooling. List every tool and its config. Agents: follow these
     tools, don't override. Don't restate tool rules here. -->

| Package / Scope | Concern | Tool | Config |
|---|---|---|---|
| packages/api | Linting | ESLint | `packages/api/.eslintrc.js` |
| packages/api | Formatting | Prettier | `.prettierrc` |
| packages/api | Type checking | TypeScript | `packages/api/tsconfig.json` |
| packages/worker | Linting | Ruff | `packages/worker/pyproject.toml` |
| packages/worker | Formatting | Black | `packages/worker/pyproject.toml` |
| root | Commit messages | commitlint | `commitlint.config.js` |

## API Patterns

<!-- Include only if the project exposes APIs (REST, GraphQL, RPC).
     These patterns span all services regardless of language. -->

### Response shape

<!-- Standard success and error response format.
     Show exact JSON examples — agents copy these directly. -->

\```json
// Success
{ "data": { ... }, "meta": { "request_id": "..." } }

// Error
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
\```

### Error codes

<!-- Enumerated error codes used across all services. -->

| Code | HTTP Status | Meaning |
|---|---|---|
| VALIDATION_ERROR | 400 | Request failed validation |
| NOT_FOUND | 404 | Resource does not exist |
| INTERNAL_ERROR | 500 | Unexpected server error |

### Versioning

<!-- API versioning strategy: URL path, header, or query param. -->

### Authentication

<!-- How auth is applied to routes. Reference the mechanism. -->

## Database Patterns

<!-- Include only if the project uses databases.
     These patterns span all services that access the database. -->

### Naming

| Element | Pattern | Example |
|---|---|---|
| Tables | [pattern] | `user_profiles` |
| Columns | [pattern] | `created_at`, `user_id` |
| Foreign keys | [pattern] | `<table_singular>_id` |
| Indexes | [pattern] | `idx_<table>_<columns>` |
| Enums | [pattern] | `order_status` |

### Primary keys

<!-- UUID vs auto-increment, generation strategy. -->

### Migrations

<!-- Migration file naming, ordering, rollback requirements. -->
```

**Writing principles:**

- **Automated Enforcement is the primary section.** It should be comprehensive — list every tool across every package. This is the "language-specific conventions are handled" declaration.
- Every convention must have a concrete example. "Do X" without showing X is not actionable.
- Sections that don't apply are **omitted entirely**, not left as TODOs or placeholders.
- If the entire project is a single-language repo with strong tooling, conventions.md may be just the Automated Enforcement table. That's fine — it means tooling is doing its job.

### Phase 4: Approve

Present the conventions for human review.

```
CONVENTIONS READY FOR REVIEW:
- Automated Enforcement: [count] tools across [count] packages
- API Patterns: [defined/not applicable]
- Database Patterns: [defined/not applicable]
→ Language-specific conventions are handled by tooling.
   Cross-cutting patterns are documented above.
   Approve, or tell me what to change.
```

## Keeping Conventions Current

Conventions drift when patterns evolve but the doc doesn't. Update when:

- **New package or language added** — add its tooling to the Automated Enforcement table
- **API contract changes** — new response shape, new error codes, versioning strategy change
- **Database schema evolves** — new naming pattern, new key strategy, new migration approach
- **Tooling changes** — new linter, formatter swap, config migration
- **Convention becomes tool-enforceable** — remove it from prose, add the tool to Automated Enforcement

The conventions doc describes how code IS written, not how it was or should be.

## Relationship to Other Skills

- **hs-define-product** defines WHAT the product is → `docs/product-spec.md`
- **hs-define-architecture** defines HOW the system is structured → `docs/architecture.md`
- **hs-define-conventions** defines HOW code is written → `docs/conventions.md`
- **hs-review** checks code against conventions — `docs/conventions.md` is the reference
- **hs-build** follows conventions during implementation — `docs/conventions.md` is the guide
- **hs-plan** identifies conventions during planning — `docs/conventions.md` is the source

The dependency chain: product-spec → architecture → **conventions** → all downstream skills.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The linter already handles everything" | Linters handle language-specific rules. They don't enforce cross-cutting patterns like API response shapes or database naming. Those are the conventions that matter in a multi-language project. |
| "We should document naming and error handling too" | If a linter can enforce it, the linter should. Documenting what tooling already catches is duplication that drifts. Conventions.md covers what tools can't — cross-cutting shared patterns. |
| "Conventions will emerge naturally" | Emergent conventions are inconsistent conventions. Three agents writing code in parallel will invent three different API response shapes if you don't define one. |
| "This project is too small for conventions" | Even small projects benefit from an Automated Enforcement inventory. If APIs or databases exist, defining shared patterns takes 10 minutes and prevents drift. |
| "Just read the existing code" | Which existing code? The Go service that returns `{data, error}` or the Python service that returns `{result, message}`? Implicit cross-cutting patterns create ambiguity. |
| "I'll just use best practices from [framework]" | External best practices are not your project's conventions. Conventions come from your codebase, your team, your trade-offs — not a blog post. |

## Red Flags

- Language-specific conventions documented instead of configured in tooling
- Conventions doc that restates linter rules (duplicate of tooling)
- Conventions with no examples (too abstract to follow)
- Automated Enforcement section missing or incomplete (the most important section)
- API Patterns section in a project with no APIs
- Database Patterns section in a project with no database
- Naming, error handling, or testing conventions written in prose when a linter could enforce them
- Conventions defined without reading the actual codebase (aspirational, not real)

## Verification

- [ ] `docs/architecture.md` read before defining conventions
- [ ] All linter/formatter/type-checker configs identified across all packages
- [ ] Automated Enforcement table is comprehensive — every tool, every package
- [ ] Language-specific conventions are handled by tooling, not documented in prose
- [ ] API Patterns defined with concrete JSON examples (if project has APIs)
- [ ] Database Patterns defined with naming table and examples (if project has databases)
- [ ] Cross-cutting inconsistencies surfaced and resolved with human
- [ ] Sections that don't apply are omitted, not left as TODOs
- [ ] Human has reviewed and approved
- [ ] Saved to `docs/conventions.md`
