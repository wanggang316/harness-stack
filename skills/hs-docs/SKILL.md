---
name: hs-docs
description: Generates and maintains project documentation. Use when initializing docs structure, writing README, AGENTS.md, or CHANGELOG. Use when documentation is missing, outdated, or needs standardization.
---

# hs-docs: Project Documentation

## Overview

Generate and maintain project documentation that serves both humans and agents. Documentation captures the *why* — context, constraints, and trade-offs that code alone cannot express. Every document should be self-contained enough for an agent to act on it.

## When to Use

- Initializing documentation structure for a new project
- README is missing or incomplete
- AGENTS.md needs creation or update
- Shipping a feature that changes user-facing behavior (CHANGELOG)
- Establishing or updating project golden rules
- Documentation is stale or inconsistent with code

**Don't use when**: Code is self-explanatory and no external-facing behavior changed.

## Document Types

| Document | Purpose | Guide |
|---|---|---|
| README.md | Project entry point for humans | [references/readme.md](references/readme.md) |
| AGENTS.md | Project entry point for agents | [references/agents-md.md](references/agents-md.md) |
| CHANGELOG.md | User-facing change history | [references/changelog.md](references/changelog.md) |
| Golden Rules | Non-negotiable project principles | [references/golden-rules.md](references/golden-rules.md) |

## Process

### Step 1: Assess Current State

Check what documentation exists:

```
- README.md exists? Content adequate?
- AGENTS.md exists? Up to date with code?
- CHANGELOG.md exists? Last entry current?
- Public APIs documented?
- Golden rules defined and enforced?
```

### Step 2: Route to Guide

Based on what's needed, read and follow the corresponding guide in `references/`:

- Missing or incomplete README → [references/readme.md](references/readme.md)
- Missing or stale AGENTS.md → [references/agents-md.md](references/agents-md.md)
- Shipping a feature → [references/changelog.md](references/changelog.md)
- Establishing or updating golden rules → [references/golden-rules.md](references/golden-rules.md)

### Step 3: Validate

- All documents follow their guide guidelines
- No stale information contradicting current code
- Links between documents are valid
- AGENTS.md is under 150 lines

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The code is self-documenting" | Code shows what. It doesn't show why, what was rejected, or what constraints apply. |
| "We'll write docs when the API stabilizes" | APIs stabilize faster when you document them. The doc is the first test of the design. |
| "Nobody reads docs" | Agents do. Future engineers do. Your 3-months-later self does. |

## Red Flags

- No README or README that doesn't explain how to run the project
- No AGENTS.md in a project using AI coding agents
- AGENTS.md over 150 lines (it's a manual, not a map)
- Public APIs with no documentation or types
- Documentation that restates code instead of explaining intent

## Verification

- [ ] README covers quick start, commands, and architecture
- [ ] AGENTS.md exists, under 150 lines, points to deeper docs
- [ ] CHANGELOG is up to date with recent changes
- [ ] Public API functions have documentation
- [ ] Golden rules defined with enforcement mechanisms
- [ ] No stale documentation contradicting current code
- [ ] All internal links are valid
