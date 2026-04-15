---
name: hs-docs
description: Initialize and maintain project documentation structure and base documents. Use when setting up docs for the first time, checking if documentation is complete, or updating README, AGENTS.md, CLAUDE.md, CHANGELOG, or golden-rules.
---

# hs-docs: Documentation Structure & Base Documents

## Overview

Initialize the standard documentation directory structure and maintain base documents that every project needs. This skill handles the scaffolding (`docs/` tree, templates) and the foundational files (README.md, AGENTS.md, CLAUDE.md, CHANGELOG.md, golden-rules.md). Documents that require explicit design decisions (product specs, architecture, API specs, UI specs) are handled by their respective `hs-define-xxx` skills.

## When to Use

- Setting up documentation structure for a new project
- Checking if docs structure is complete and standard
- README.md is missing or incomplete
- AGENTS.md / CLAUDE.md needs creation or update
- CHANGELOG.md needs creation or update
- Golden rules need to be established or updated
- Documentation structure is incomplete (missing directories or templates)

**Don't use when**:
- Writing product specs → use `hs-spec`
- Defining architecture → use `hs-define-architecture`
- Defining API specs → use `hs-define-api-spec`
- Defining UI design system → use `hs-define-ui-spec`
- Writing design docs → use `hs-design`

## Scope

| This skill maintains | Other skills maintain |
|---|---|
| `docs/` directory structure | Product specs content (`hs-spec`) |
| `docs/product-specs/_template.md` | Architecture content (`hs-define-architecture`) |
| `docs/design-docs/_template.md` | API spec content (`hs-define-api-spec`) |
| `docs/plans/_template.md` | UI design content (`hs-define-ui-spec`) |
| README.md | Design docs content (`hs-design`) |
| AGENTS.md / CLAUDE.md | Execution plans content (`hs-planner`) |
| CHANGELOG.md | |
| `docs/golden-rules.md` | |

## Process

### Step 1: Assess Current State

Check what exists. Report status for each item:

```
Directory structure:
- [ ] docs/ exists
- [ ] docs/product-specs/ exists with README.md and _template.md
- [ ] docs/design-docs/ exists with README.md and _template.md
- [ ] docs/plans/ exists with README.md and _template.md

Base documents:
- [ ] README.md exists and has required sections
- [ ] AGENTS.md exists and is under 150 lines
- [ ] CLAUDE.md exists (symlink or file pointing to AGENTS.md)
- [ ] CHANGELOG.md exists
- [ ] docs/golden-rules.md exists
```

If the user asked to initialize or check structure, report all items. If the user asked about a specific document, focus on that document.

### Step 2: Act on What's Missing

Based on assessment, either **initialize structure** or **update specific documents**.

#### 2a: Initialize Directory Structure

Create missing directories and scaffold files:

```bash
mkdir -p docs/product-specs
mkdir -p docs/design-docs
mkdir -p docs/plans
```

Create `docs/README.md` (if missing):

```markdown
# Documentation

Project documentation hub.

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

Create subdirectory READMEs and `_template.md` files (if missing). Templates follow the standard formats:

- **Product spec template**: Status, Summary, User Stories, Requirements (Must Have / Nice to Have), Acceptance Criteria, Design, Open Questions
- **Design doc template**: Status, Problem Statement, Goals, Non-Goals, Proposed Solution, Alternatives Considered, Dependencies, Risks, References
- **Execution plan template**: Status, Purpose / Big Picture, Context and Orientation, Plan of Work, Progress (checkboxes), Surprises & Discoveries, Decision Log, Outcomes & Retrospective

#### 2b: Create or Update Base Documents

For each missing or incomplete base document, read the corresponding guide and follow it:

| Document | Guide |
|---|---|
| README.md | [references/readme.md](references/readme.md) |
| AGENTS.md | [references/agents-md.md](references/agents-md.md) |
| CHANGELOG.md | [references/changelog.md](references/changelog.md) |
| docs/golden-rules.md | [references/golden-rules.md](references/golden-rules.md) |

**CLAUDE.md**: Always create as a symlink to AGENTS.md:

```bash
ln -s AGENTS.md CLAUDE.md
```

If symlinks are not supported, create CLAUDE.md with content directing to AGENTS.md.

### Step 3: Verify

After creating or updating, verify:

- [ ] `docs/` directory has README.md and three subdirectories with templates
- [ ] README.md covers quick start, commands, and development setup
- [ ] AGENTS.md exists, is under 150 lines, points to deeper docs
- [ ] CLAUDE.md exists and references AGENTS.md
- [ ] CHANGELOG.md exists with proper format
- [ ] docs/golden-rules.md exists with numbered rules
- [ ] All internal links are valid
- [ ] No existing files were overwritten without user confirmation

Report what was created, what was updated, and what was already in good shape.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The code is self-documenting" | Code shows what. It doesn't show why, what was rejected, or what constraints apply. |
| "We don't need structure yet, we're small" | Templates cost nothing. Having them when you need them saves setup time later. |
| "Nobody reads docs" | Agents do. Future engineers do. Your 3-months-later self does. |
| "I'll create docs as I go" | Without structure, docs end up scattered or missing. Templates provide consistent starting points. |

## Red Flags

- No `docs/` directory or empty `docs/` with no subdirectories
- No README or README that doesn't explain how to run the project
- No AGENTS.md in a project using AI coding agents
- AGENTS.md over 150 lines (it's a map, not a manual)
- Missing CLAUDE.md (agents may not discover AGENTS.md)
- Template files that have been modified into actual docs (keep templates clean)

## Verification

- [ ] `docs/` has README.md, product-specs/, design-docs/, plans/
- [ ] Each subdirectory has README.md and _template.md
- [ ] README.md has required sections (description, install, commands, development)
- [ ] AGENTS.md exists and is under 150 lines
- [ ] CLAUDE.md exists
- [ ] CHANGELOG.md exists with Keep a Changelog format
- [ ] docs/golden-rules.md exists with numbered rules and enforcement
- [ ] No stale documentation contradicting current code
- [ ] All internal links are valid
