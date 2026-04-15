---
name: hs-docs-init
description: Initialize documentation structure for a project. Use when a project has no docs/ directory or is missing standard documentation scaffolding (product-specs, design-docs, plans, templates).
---

# hs-docs-init: Initialize Documentation Structure

## Overview

Scaffolds the standard documentation directory structure, AGENTS.md, CLAUDE.md, and document templates into a project. This creates the foundation that other skills (hs-spec, hs-design, hs-planner, hs-exec-plan) depend on.

## When to Use

- Project has no `docs/` directory
- Documentation structure is incomplete (missing product-specs, design-docs, or plans)
- AGENTS.md or CLAUDE.md does not exist
- Template files are missing from doc subdirectories

**Don't use when**: Documentation structure already exists and is complete (use `hs-check` to verify).

## Process

### Step 1: Assess Current State

Check what already exists. Do NOT overwrite existing files.

```
Check for:
- docs/ directory
- docs/product-specs/ directory and _template.md
- docs/design-docs/ directory and _template.md
- docs/plans/ directory and _template.md
- AGENTS.md at project root
- CLAUDE.md at project root
```

Record which items are missing. Only create what is needed.

### Step 2: Create Directory Structure

Create missing directories:

```bash
mkdir -p docs/product-specs
mkdir -p docs/design-docs
mkdir -p docs/plans
```

### Step 3: Create docs/README.md

If `docs/README.md` does not exist, create it:

```markdown
# Documentation

Project documentation hub. All project knowledge lives here.

## Structure

| Directory | Purpose |
|---|---|
| [product-specs/](product-specs/) | Product requirements and specifications |
| [design-docs/](design-docs/) | Technical design documents |
| [plans/](plans/) | Execution plans for complex work |

## Conventions

- Every document should be self-contained
- Use relative links between documents
- One concept per file
- Mark documents as deprecated rather than deleting
```

### Step 4: Create Subdirectory READMEs

**docs/product-specs/README.md** (if missing):

```markdown
# Product Specs

Product specs define **what** to build and **for whom**.

## Template

Use [_template.md](_template.md) as a starting point.

## Index

<!-- Add product specs here: [Title](filename.md) — summary -->
```

**docs/design-docs/README.md** (if missing):

```markdown
# Design Docs

Design docs capture the **why** and **how** behind features and systems.

## When to Write

- New feature touching multiple domains
- Significant architectural change
- Technical decision with long-term implications

## Template

Use [_template.md](_template.md) as a starting point.

## Index

<!-- Add design docs here: [Title](filename.md) — summary -->
```

**docs/plans/README.md** (if missing):

```markdown
# Execution Plans

Living documents for complex work. Track progress, record decisions, capture discoveries.

## When to Create

- Multi-step changes spanning multiple files
- Work where approach may evolve based on discoveries
- Tasks that benefit from checkpointed progress

## Template

Use [_template.md](_template.md) as a starting point.

## Active Plans

<!-- Add active plans here -->

## Completed Plans

<!-- Move completed plans here -->
```

### Step 5: Create Template Files

**docs/product-specs/_template.md** (if missing):

```markdown
# Product Spec: [Title]

**Status:** Draft | Approved | In Progress | Shipped
**Author:** [name]
**Date:** [date]

## Summary

<!-- One paragraph describing the feature/product -->

## User Stories

<!-- As a [role], I want [capability] so that [benefit] -->

## Requirements

### Must Have
- [ ] Requirement 1

### Nice to Have
- [ ] Requirement 2

## Acceptance Criteria

<!-- How do we know this is done? -->

## Design

<!-- Link to design doc if applicable -->

## Open Questions

<!-- Unresolved questions -->
```

**docs/design-docs/_template.md** (if missing):

```markdown
# Design Doc: [Title]

**Status:** Draft | In Review | Approved | Implemented | Deprecated
**Author:** [name]
**Date:** [date]

## Problem Statement

<!-- What problem does this solve? Who is affected? -->

## Goals

<!-- What are we trying to achieve? -->

## Non-Goals

<!-- What are we explicitly NOT trying to do? -->

## Proposed Solution

<!-- Describe the approach in detail -->

## Alternatives Considered

<!-- What other approaches were evaluated? Why rejected? -->

## Dependencies

<!-- What does this depend on? What depends on this? -->

## Risks

<!-- What could go wrong? How do we mitigate it? -->

## References

<!-- Links to related docs, specs, prior art -->
```

**docs/plans/_template.md** (if missing):

```markdown
# ExecPlan: [Title]

**Status:** Active | Completed | Abandoned
**Author:** [name]
**Created:** [date]
**Last Updated:** [date]

## Purpose / Big Picture

<!-- What someone gains after this change -->

## Context and Orientation

<!-- Current state, key files, definitions -->

## Plan of Work

<!-- Sequence of edits and additions -->

## Progress

<!-- Checkboxes with timestamps -->

- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

## Surprises & Discoveries

<!-- Unexpected findings with evidence -->

## Decision Log

<!-- Decision / Rationale / Date -->

## Outcomes & Retrospective

<!-- Results vs. original purpose -->
```

### Step 6: Create AGENTS.md

If `AGENTS.md` does not exist at project root, create it. Detect the project name from `package.json`, `Cargo.toml`, `go.mod`, or the directory name.

```markdown
# [Project Name]

[One-line project description]

## Quick Start

<!-- Project-specific build/run/test commands -->

## Documentation

- [Documentation Hub](docs/README.md)
- [Product Specs](docs/product-specs/)
- [Design Docs](docs/design-docs/)
- [Execution Plans](docs/plans/)

## Project Structure

<!-- High-level directory layout -->
```

Keep AGENTS.md under 150 lines. It is a map, not a manual.

### Step 7: Create CLAUDE.md

If `CLAUDE.md` does not exist at project root, create it as a symlink to AGENTS.md:

```bash
ln -s AGENTS.md CLAUDE.md
```

If symlinks are not supported, create CLAUDE.md with a redirect note:

```markdown
<!-- See AGENTS.md for project context -->
```

### Step 8: Verify

Check that all items were created:

- [ ] `docs/` directory exists
- [ ] `docs/README.md` exists
- [ ] `docs/product-specs/` exists with README.md and _template.md
- [ ] `docs/design-docs/` exists with README.md and _template.md
- [ ] `docs/plans/` exists with README.md and _template.md
- [ ] `AGENTS.md` exists at project root, under 150 lines
- [ ] `CLAUDE.md` exists at project root

Report what was created, what was skipped (already existed), and suggest next steps.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We don't need formal docs yet" | Templates cost nothing. Having them when you need them saves setup time later. |
| "Our project is too small for this" | Even small projects benefit from specs and design docs. Size doesn't reduce the need for clarity. |
| "I'll create docs as I go" | Without structure, docs end up scattered or missing. Templates provide consistent starting points. |

## Red Flags

- `docs/` exists but has no subdirectories or templates
- AGENTS.md over 150 lines (it's a map, not a manual)
- Template files that have been modified into actual docs (keep templates clean)
- Missing CLAUDE.md (agents may not find AGENTS.md)

## Verification

- [ ] `docs/` directory exists with README.md
- [ ] `docs/product-specs/` has README.md and _template.md
- [ ] `docs/design-docs/` has README.md and _template.md
- [ ] `docs/plans/` has README.md and _template.md
- [ ] AGENTS.md exists and is under 150 lines
- [ ] CLAUDE.md exists (symlink or file)
- [ ] No existing files were overwritten
