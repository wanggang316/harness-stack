---
name: hs-docs
description: Generates and maintains project documentation. Use when initializing docs structure, writing README, AGENTS.md, CHANGELOG, or ADRs. Use when documentation is missing, outdated, or needs standardization.
---

# hs-docs: Project Documentation

## Overview

Generate and maintain project documentation that serves both humans and agents. Documentation captures the *why* — context, constraints, and trade-offs that code alone cannot express. Every document should be self-contained enough for an agent to act on it.

## When to Use

- Initializing documentation structure for a new project
- README is missing or incomplete
- AGENTS.md needs creation or update
- Shipping a feature that changes user-facing behavior (CHANGELOG)
- Making architectural decisions (ADR)
- Documentation is stale or inconsistent with code

**Don't use when**: Code is self-explanatory and no external-facing behavior changed.

## Document Types

| Document | Purpose | Template |
|---|---|---|
| README.md | Project entry point for humans | [references/readme-template.md](references/readme-template.md) |
| AGENTS.md | Project entry point for agents | [references/agents-md-template.md](references/agents-md-template.md) |
| CHANGELOG.md | User-facing change history | [references/changelog-template.md](references/changelog-template.md) |

## Process

### Step 1: Assess Current State

Check what documentation exists:

```
- README.md exists? Content adequate?
- AGENTS.md exists? Up to date with code?
- CHANGELOG.md exists? Last entry current?
- docs/ directory structure present?
```

### Step 2: Generate or Update

For each document type, use the corresponding template from `references/`.

**README.md** — The human entry point:
- One-paragraph project description
- Quick start (clone → install → run)
- Commands table
- Architecture overview
- Contributing guide

**AGENTS.md** — The agent entry point:
- Must be a **map, not a manual** (under 150 lines)
- Points to deeper sources of truth (docs/, specs, ADRs)
- Lists skills, commands, and conventions
- Provides progressive disclosure — agents start here, navigate deeper as needed

**CHANGELOG.md** — Follows [Keep a Changelog](https://keepachangelog.com/) format:
- Added / Changed / Deprecated / Removed / Fixed / Security
- Newest entries first
- Link each entry to PR or issue when possible

### Step 3: Validate

- All documents follow their templates
- No stale information contradicting current code
- Links between documents are valid
- AGENTS.md is under 150 lines

## Inline Documentation Guidelines

### Comment the *why*, not the *what*

```typescript
// BAD: Restates the code
// Increment counter by 1
counter += 1;

// GOOD: Explains non-obvious intent
// Sliding window rate limit — reset at window boundary,
// not fixed schedule, to prevent burst attacks at edges
if (now - windowStart > WINDOW_SIZE_MS) {
  counter = 0;
  windowStart = now;
}
```

### Document Known Gotchas

```typescript
/**
 * IMPORTANT: Must be called before first render.
 * If called after hydration, causes flash of unstyled content
 * because theme context isn't available during SSR.
 *
 * See ADR-003 for design rationale.
 */
export function initializeTheme(theme: Theme): void {
  // ...
}
```

### When NOT to Comment

- Self-explanatory code
- TODO for things you should just do now
- Commented-out code (delete it, git has history)

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The code is self-documenting" | Code shows what. It doesn't show why, what was rejected, or what constraints apply. |
| "We'll write docs when the API stabilizes" | APIs stabilize faster when you document them. The doc is the first test of the design. |
| "Nobody reads docs" | Agents do. Future engineers do. Your 3-months-later self does. |
| "ADRs are overhead" | A 10-minute ADR prevents a 2-hour debate about the same decision six months later. |
| "Comments get outdated" | Comments on *why* are stable. Comments on *what* get outdated — only write the former. |

## Red Flags

- No README or README that doesn't explain how to run the project
- No AGENTS.md in a project using AI coding agents
- AGENTS.md over 150 lines (it's a manual, not a map)
- Architectural decisions with no written rationale
- Commented-out code instead of deletion
- Documentation that restates code instead of explaining intent

## Verification

- [ ] README covers quick start, commands, and architecture
- [ ] AGENTS.md exists, under 150 lines, points to deeper docs
- [ ] CHANGELOG is up to date with recent changes
- [ ] No stale documentation contradicting current code
- [ ] All internal links are valid
