---
name: docs-init
description: One-time initialization of the project's documentation structure and base documents. Scaffolds docs/ directory tree, AGENTS.md, CLAUDE.md, README.md, and foundational docs from templates in assets/.
---

# docs-init: Documentation Scaffolding

## Overview

A one-time initialization that scaffolds the standard documentation **Library** layout and base documents from templates in `assets/`, and ensures the project ignores the `.harness-runtime/` tree (where per-plan FDD state lives). After running, the project has the `docs/` Library tree, placeholder templates, and foundational docs (golden-rules) in place. Content belonging to other domains (architecture, design docs, changelog) is created by the skill that owns it; per-plan state (plans, contracts, features) is never in `docs/` — it lives in the gitignored `.harness-runtime/`.

## When to Use

- A project has no `docs/` directory, no AGENTS.md, or only a bare README
- A project is being bootstrapped for agent-first development
- The documentation layout is incomplete and needs the standard skeleton

**Not for re-running.** This skill initializes; it does not re-generate. If the structure already exists, the skill reports what is present and exits without changes. Ongoing maintenance of individual documents happens in the skill that owns each document.

## Scope

**This skill creates or fills (when missing):**

| Target | Source in assets/ |
|---|---|
| `AGENTS.md` | `assets/AGENTS.md` |
| `CLAUDE.md` | symlink → `AGENTS.md` |
| `README.md` | `assets/README.md` (only if no README exists) |
| `docs/README.md` | `assets/docs/README.md` |
| `docs/golden-rules.md` | `assets/docs/golden-rules.md` |
| `docs/design-docs/{README,_template}.md` | `assets/docs/design-docs/` |
| `docs/user-tests/README.md` | `assets/docs/user-tests/README.md` |
| `docs/user-tests/_shared/personas.yaml` | `assets/docs/user-tests/_shared/personas.yaml` |
| `docs/references/README.md` | `assets/docs/references/README.md` |
| `docs/generated/README.md` | `assets/docs/generated/README.md` |
| `.gitignore` entry `.harness-runtime/` | appended if missing (see Step 4b) |

**This skill does not create:**

- `docs/architecture.md` — architecture content is defined elsewhere
- `docs/design-docs/<doc>.md` — individual design docs are authored elsewhere
- `docs/user-test-patterns.md` — bootstrapped by `harness-stack:test-spec` on first run
- `.harness-runtime/` content — per-plan state is created by `harness-stack:feature-driven-development` and the `hs-plan` CLI; it is gitignored, not scaffolded
- `CHANGELOG.md` — changelog is maintained elsewhere

## Process

### Step 1: Survey the project

Read the project root and report what already exists. For each target in the scope table, record one of three states: **missing**, **present**, or **present but empty / placeholder**.

Also capture:
- Project name (from `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, or directory name)
- Build / test / lint / install commands (from the same sources, or by inspecting existing scripts)
- Whether an existing README or AGENTS.md carries content worth preserving

### Step 2: Decide per target

For every target in the scope table, apply this judgment:

| Current state | Action |
|---|---|
| Missing | Create from `assets/` template, substituting placeholders |
| Present but empty / placeholder only | Offer to overwrite; wait for confirmation |
| Present with real content | Leave untouched; report it was preserved |

Never overwrite a file with real content. If the user asked to "initialize" a project that already has meaningful docs, report the state and suggest targeted edits instead of a full rewrite.

### Step 3: Substitute placeholders

Templates in `assets/` use these placeholders:

| Placeholder | Source |
|---|---|
| `{{PROJECT_NAME}}` | Detected project name |
| `{{BUILD_COMMAND}}` | Detected build command, or `<build command>` if unknown |
| `{{TEST_COMMAND}}` | Detected test command, or `<test command>` |
| `{{LINT_COMMAND}}` | Detected lint command, or `<lint command>` |
| `{{INSTALL_COMMAND}}` | Detected install command, or `<install command>` |

If a command cannot be detected confidently, leave the bracketed placeholder and mention it in the verification report so the user can fill it in.

### Step 4: Write files

Copy each template to its target path and apply the substitutions above. For `CLAUDE.md`, create a symlink pointing to `AGENTS.md`. On platforms or filesystems that do not support symlinks, fall back to a one-line file: `See [AGENTS.md](AGENTS.md).`

### Step 4b: Ignore the runtime tree

Ensure the project's `.gitignore` contains `.harness-runtime/`. This is where
feature-driven-development keeps per-plan state (plans, contracts, features, handoffs);
it must never be committed. Idempotent: if the line is already present, do nothing; if
`.gitignore` is missing, create it with the entry; otherwise append it under a short
comment. Do not touch any other `.gitignore` entry.

### Step 5: Offer suggestions on conflict

When something blocks clean initialization, stop and surface the specific situation plus a short list of options. Do not silently choose. Typical cases:

| Situation | Suggestion |
|---|---|
| Existing AGENTS.md over 150 lines | Report the line count; suggest moving detail into `docs/` before replacing |
| Existing README.md with real content | Do not overwrite; suggest targeted edits the user can approve |
| `docs/` exists with non-standard layout | List the divergent directories; ask whether to normalize or keep as-is |
| Project name cannot be detected | List the sources checked; ask the user for the name |
| Filesystem does not support symlinks | Fall back to CLAUDE.md stub and note the fallback |
| Architecture / product / design content already partially scattered | Report locations; leave content alone and note which owner-skill should consolidate later |

### Step 6: Verify and report

After writing, print a table covering every target in the scope table with one of: **created**, **preserved**, **skipped (conflict)**, or **needs attention**. Include any placeholders that were left unresolved so the user can fill them in. Confirm that `CLAUDE.md` resolves to `AGENTS.md`.

## Verification

- [ ] `AGENTS.md` exists and is under 150 lines
- [ ] `CLAUDE.md` resolves to `AGENTS.md` (symlink or stub)
- [ ] `README.md` exists (either pre-existing or created from template)
- [ ] `docs/README.md` and `docs/golden-rules.md` exist
- [ ] `docs/design-docs/` contains `README.md` and `_template.md`
- [ ] `docs/user-tests/README.md` and `docs/user-tests/_shared/personas.yaml` exist
- [ ] `docs/references/README.md` and `docs/generated/README.md` exist
- [ ] `.gitignore` contains `.harness-runtime/`
- [ ] Every placeholder is either substituted or called out in the report
- [ ] No file with pre-existing real content was overwritten
