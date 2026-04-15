---
name: hs-docs
description: Initialize and maintain project documentation structure and base documents. Use when setting up docs for the first time, checking if documentation is complete, or updating README, AGENTS.md, CLAUDE.md, or golden-rules.
---

# hs-docs: Documentation Structure & Base Documents

## Overview

Initialize the standard documentation directory structure and maintain base documents that every project needs. This skill handles the scaffolding (`docs/` directory tree) and the foundational files (README.md, AGENTS.md, CLAUDE.md, golden-rules.md). Content in each subdirectory is created by the corresponding skill — not by this skill.

## When to Use

- Setting up documentation structure for a new project
- Checking if docs structure is complete and standard
- README.md is missing or incomplete
- AGENTS.md / CLAUDE.md needs creation or update
- Golden rules need to be established or updated
- Documentation structure is incomplete (missing directories)

**Don't use when**:
- Writing product specs → use `hs-spec`
- Defining architecture → use `hs-define-architecture`
- Defining API specs → use `hs-define-api-spec`
- Defining UI design system → use `hs-define-ui-spec`
- Writing design docs → use `hs-design`
- Managing changelog → use `hs-changelog`

## Scope

**This skill maintains:**
- `docs/` directory structure (directories + `docs/README.md`)
- README.md, AGENTS.md / CLAUDE.md, `docs/golden-rules.md`

**Content in each directory is created by its corresponding skill:**

| Directory / Document | Use this skill |
|---|---|
| `docs/product-specs/` | `hs-spec` |
| `docs/design-docs/` | `hs-design` |
| `docs/plans/` | `hs-planner` |
| Architecture | `hs-define-architecture` |
| API spec | `hs-define-api-spec` |
| UI design | `hs-define-ui-spec` |
| CHANGELOG.md | `hs-changelog` |

## Process

### Step 1: Assess Current State

Check what exists. Report status for each item:

```
Directory structure:
- [ ] docs/ exists with README.md
- [ ] docs/product-specs/ exists
- [ ] docs/design-docs/ exists
- [ ] docs/plans/ exists

Base documents:
- [ ] README.md exists and has required sections
- [ ] AGENTS.md exists and is under 150 lines
- [ ] CLAUDE.md exists (symlink or file pointing to AGENTS.md)
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

Subdirectory content (specs, design docs, plans) is not created here — guide the user to the appropriate skill:
- Product specs → `hs-spec`
- Design docs → `hs-design`
- Execution plans → `hs-planner`

#### 2b: Create or Update Base Documents

For each missing or incomplete base document, read the corresponding guide and follow it:

| Document | Guide |
|---|---|
| README.md | [references/readme.md](references/readme.md) |
| AGENTS.md | [references/agents-md.md](references/agents-md.md) |
| docs/golden-rules.md | [references/golden-rules.md](references/golden-rules.md) |

**CLAUDE.md**: Always create as a symlink to AGENTS.md:

```bash
ln -s AGENTS.md CLAUDE.md
```

If symlinks are not supported, create CLAUDE.md with content directing to AGENTS.md.

### Step 3: Verify

After creating or updating, verify:

- [ ] `docs/` directory has README.md and three subdirectories
- [ ] README.md covers quick start, commands, and development setup
- [ ] AGENTS.md exists, is under 150 lines, points to deeper docs
- [ ] CLAUDE.md exists and references AGENTS.md
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
- Content created directly in subdirectories without using the corresponding skill

## Verification

- [ ] `docs/` has README.md, product-specs/, design-docs/, plans/
- [ ] README.md has required sections (description, install, commands, development)
- [ ] AGENTS.md exists and is under 150 lines
- [ ] CLAUDE.md exists
- [ ] docs/golden-rules.md exists with numbered rules and enforcement
- [ ] No stale documentation contradicting current code
- [ ] All internal links are valid
