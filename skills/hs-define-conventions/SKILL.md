---
name: hs-define-conventions
description: Defines coding conventions at the project level. Use when starting a new project, when conventions.md is missing or outdated, or when code reviews reveal inconsistent patterns. Produces docs/conventions.md as the authoritative reference for how code should be written.
---

# hs-define-conventions: Coding Conventions

## Overview

Define how code is written within the project's architecture. `docs/conventions.md` is the behavioral contract that every contributor — human or agent — follows when writing code. It answers: how do we name things, how do we handle errors, what patterns do we use, and what does tooling already enforce.

This is not an architecture document. Architecture defines structure (domains, layers, dependencies); conventions define behavior within that structure (naming, error handling, API patterns). Architecture lives in `docs/architecture.md` (via `/hs-define-architecture`). Conventions live here.

## When to Use

- Starting a new project with multiple contributors (human or agent)
- `docs/conventions.md` is missing in a project where agents write code
- Code reviews repeatedly flag inconsistent patterns
- New team members (or agents) can't infer how to write code that fits the project
- After a major refactor that changed established patterns

**When NOT to use:** Single-file scripts, throwaway prototypes, or projects where one person writes all code and patterns are self-consistent. If you need to define architecture, use `/hs-define-architecture`. If you need to configure a linter, just configure it.

## Philosophy

You are a pattern archaeologist, not a standards committee.

- **Discover, don't invent.** Read the codebase first. Conventions should codify what the project already does well, not impose an external standard. Generic "best practices" borrowed from the internet are not conventions — they're noise.
- **If a tool can enforce it, the tool should.** A linter rule beats a documented rule. If you can add an ESLint/Ruff/Clippy rule instead of writing a convention, do that. Document the tool, not the rule.
- **Specific beats general.** "Use descriptive names" is useless. "Files use kebab-case: `user-profile.ts`" is actionable. Every convention must include a concrete example.
- **Challenge accidental patterns.** Three files doing the same thing doesn't make it a convention. It might be copy-paste. Ask: "Is this intentional?"
- **Less is more.** 10 clear conventions > 50 that nobody reads. Every convention should earn its place by preventing a real, recurring problem.
- **Agent-readable is the bar.** A convention is good enough when an agent can follow it without asking a human for clarification. If the convention requires subjective judgment to apply, it's not specific enough.

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

**Sample source files for patterns:**

Don't scan the entire codebase. Sample strategically:

1. From `docs/architecture.md`, identify 3-4 domains or top-level directories
2. For each domain, read 2-3 files: one deep (types/models), one middle (services/logic), one outer (handlers/UI)
3. Read 2-3 test files separately
4. Read 2-3 API route files (if applicable)
5. Total: 8-15 files

**Extract patterns with confidence scoring:**

For each pattern category, check multiple files and score:

```
DISCOVERED PATTERNS:

Naming (sampled 12 files):
- Files: kebab-case (12/12) → Strong convention
- Functions: camelCase (12/12) → Strong convention
- Types: PascalCase (10/12) → Strong convention
- Constants: SCREAMING_SNAKE (7/12) → Emerging (needs decision)

Error handling (sampled 5 service files):
- Custom AppError class with typed codes (4/5) → Strong convention
- Errors caught at handler layer only (3/5) → Emerging (needs decision)

Testing (sampled 3 test files):
- Files named *.test.ts (2/3), *.spec.ts (1/3) → Inconsistent (needs decision)
- describe/it pattern with AAA structure (3/3) → Strong convention

Tooling-enforced (already handled):
- Prettier: semi, singleQuote, printWidth 100
- ESLint: no-unused-vars, no-explicit-any
→ These will be REFERENCED in Automated Enforcement, not documented as conventions.

INCONSISTENCIES FOUND:
1. Constants: Mixed SCREAMING_SNAKE and camelCase
2. Test file naming: .test.ts vs .spec.ts
3. Error logging: Some use console.error, some use logger
→ Which patterns are intentional? Which should become the convention?
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
- "This convention is already enforced by ESLint rule X. Documenting it would be duplication."
- "You have 3 lines of code that use this pattern. Is it really a project-wide convention?"

**Challenge under-specification:**
- "Your error handling has no consistent pattern. Three agents writing code in parallel will invent three different patterns."
- "API responses use different shapes. This will confuse consumers."

**Present categories for selection:**

```
CONVENTION CATEGORIES FOR YOUR PROJECT:

Required (inconsistencies found, needs decision):
☐ Naming — files, functions, types, constants
☐ Error handling — creating, catching, logging

Recommended (no strong convention found, would benefit from one):
☐ API patterns — response shapes, validation
☐ Testing — file naming, structure, test data

Optional (current patterns are consistent, documenting would preserve them):
☐ Imports & dependencies
☐ Comments & documentation

→ Which categories should we define conventions for?
```

### Phase 3: Define

Write `docs/conventions.md` using the template below. Only include sections the human approved in Phase 2.

```markdown
# Conventions

**Last Updated:** [date]

## Automated Enforcement

<!-- Conventions enforced by tooling. Reference the tool and config,
     don't restate the rules. Agents: follow these tools, don't override. -->

| Concern | Tool | Config |
|---|---|---|
| Formatting | [Prettier/Black/rustfmt] | [config path] |
| Linting | [ESLint/Ruff/Clippy] | [config path] |
| Type checking | [TypeScript/mypy] | [config path] |

## Naming

<!-- Naming patterns not enforced by tooling. One row per element.
     Every row MUST have a concrete example. -->

| Element | Pattern | Example |
|---|---|---|
| Files | [pattern] | `user-profile.ts` |
| Functions | [pattern] | `getUserProfile()` |
| Components | [pattern] | `UserProfile` |
| Types/Interfaces | [pattern] | `UserProfileProps` |
| Constants | [pattern] | `MAX_RETRY_COUNT` |
| Test files | [pattern] | `user-profile.test.ts` |
| Database tables | [pattern] | `user_profiles` |
| API endpoints | [pattern] | `GET /api/users/:id/profile` |

## Error Handling

<!-- How errors flow through the system. An agent reading this
     should know exactly what code to write. -->

### Creating errors
<!-- How to create/throw errors. Show the pattern with code example. -->

### Catching errors
<!-- Where errors are caught (handler layer? middleware?).
     What happens when they're caught. -->

### Logging errors
<!-- What gets logged, at what level, with what context.
     Reference the logging library/approach. -->

### User-facing errors
<!-- How errors are presented to API consumers or users.
     Show the response shape. -->

## API Patterns

<!-- Include only if the project has APIs.
     Focus on patterns not enforced by tooling. -->

### Response shape
<!-- Standard success/error response format. Show JSON example. -->

### Validation
<!-- Where and how request validation happens. -->

### Authentication
<!-- How auth is applied to routes. -->

## Testing

<!-- Testing conventions beyond what the test framework enforces. -->

### What to test
<!-- Policy: unit tests for logic, integration for APIs, E2E for flows. -->

### Test structure
<!-- Naming pattern for describe/it blocks. File organization. -->

### Test data
<!-- How to create test data (factories, fixtures, builders). -->

## Imports & Dependencies

<!-- Import ordering and path conventions not enforced by linter.
     Omit if tooling handles this. -->

## Comments & Documentation

<!-- When to write comments, when NOT to. Code-level docs only —
     project-level docs are covered by /hs-docs. -->

## Project-Specific

<!-- Conventions unique to this project that don't fit above.
     Keep this section small. If it grows, promote to its own section. -->
```

**Writing principles:**

- Every convention must have a concrete example. "Do X" without showing X is not actionable.
- Tables for naming, prose for patterns. Naming is lookup; error handling is process.
- Sections the human didn't select in Phase 2 are **omitted entirely**, not left as TODOs.
- If a convention can be expressed in one line, use one line. Verbose conventions get ignored.
- The Automated Enforcement section is always first. It sets the "tooling handles this" firewall before any prose conventions.

### Phase 4: Approve

Present the conventions for human review.

```
CONVENTIONS READY FOR REVIEW:
- Tooling already enforces: [list tools]
- Naming conventions: [count] patterns defined
- Error handling: [defined/not defined]
- API patterns: [defined/not defined]
- Testing conventions: [defined/not defined]
- Project-specific: [count] entries
→ This is the behavioral reference for all code in this project.
   /hs-review and /hs-build will use this as their standard.
   Approve, or tell me what to change.
```

## Keeping Conventions Current

Conventions drift when patterns evolve but the doc doesn't. Update when:

- **New patterns introduced** — new error type, new API style, new naming convention
- **Technology changes** — new library, new framework, different tooling
- **Repeated review friction** — if `/hs-review` keeps flagging the same convention violation, either fix the code or update the convention
- **Convention becomes tool-enforceable** — move it from prose to the Automated Enforcement table and add the linter rule

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
| "The linter already handles conventions" | Linters handle formatting and syntax. They don't handle naming semantics, error handling strategies, API response shapes, or testing philosophy. Those are the conventions that matter most. |
| "Conventions will emerge naturally" | Emergent conventions are inconsistent conventions. Three agents writing code in parallel will invent three different error handling patterns if you don't define one. |
| "This project is too small for conventions" | Small projects grow. Conventions written at 1,000 lines save pain at 10,000. The document takes 15 minutes. |
| "I'll describe conventions in AGENTS.md" | AGENTS.md is a map, not a manual (Golden Rule 1). It can summarize 3-5 top conventions and link to the full doc. |
| "Every file already follows the same pattern" | Consistency today doesn't mean consistency tomorrow. Document what the pattern IS so future code matches it. |
| "Just read the existing code" | Which existing code? The 3 files that do it one way or the 2 that do it differently? Implicit conventions create ambiguity. |
| "I'll just use best practices from [framework]" | External best practices are not your project's conventions. Conventions come from your codebase, your team, your trade-offs — not a blog post. |

## Red Flags

- Conventions doc that restates linter rules (duplicate of tooling)
- Conventions with no examples (too abstract to follow)
- More than 30 conventions defined (scope explosion — focus on what causes real friction)
- Conventions that contradict `docs/architecture.md` dependency rules
- Conventions defined without reading the actual codebase (aspirational, not real)
- No Automated Enforcement section (misses the tooling relationship)
- Conventions copied from an external style guide without project-specific discovery
- All sections filled in when the project clearly doesn't need some (e.g. API Patterns for a CLI tool)

## Verification

- [ ] Existing codebase scanned — conventions reflect actual patterns, not generic rules
- [ ] `docs/architecture.md` read before defining conventions
- [ ] Linter/formatter configs identified and listed in Automated Enforcement
- [ ] No convention duplicates what tooling already enforces
- [ ] Each convention has a concrete example
- [ ] Naming conventions defined with pattern and example for each element type
- [ ] Error handling strategy defined (if selected) with create/catch/log/user-facing
- [ ] Inconsistencies in existing code surfaced and resolved with human
- [ ] Sections that don't apply are omitted, not left as TODOs
- [ ] Human has reviewed and approved
- [ ] Saved to `docs/conventions.md`
