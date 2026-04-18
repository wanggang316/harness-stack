---
name: hs-changelog
description: Create and maintain CHANGELOG.md. Use when initializing changelog, extracting unreleased changes from git history, or preparing a release version.
---

# hs-changelog: Changelog Management

## Overview

Create and maintain CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/) format. Supports initializing changelog, extracting unreleased changes from git history, and cutting release versions.

## When to Use

- Project has no CHANGELOG.md
- Shipping a feature that changes user-facing behavior
- Fixing a user-visible bug
- Deprecating or removing functionality
- Security fixes
- Preparing a release (move [Unreleased] to a version)
- Catching up changelog with recent git history

**Don't use when**:
- Internal refactors, test changes, or CI updates that don't affect users

## Process

### Step 1: Check CHANGELOG.md

- **Does not exist** → Step 2 (Create)
- **Exists** → Step 3 (Update)

### Step 2: Create CHANGELOG.md

Create `CHANGELOG.md` in project root:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

<!-- Unshipped changes go here. Move to a version header on release -->

### Added
<!-- New features or capabilities -->

### Changed
<!-- Changes to existing functionality -->

### Deprecated
<!-- Features marked for future removal -->

### Removed
<!-- Features that were removed -->

### Fixed
<!-- Bug fixes -->

### Security
<!-- Security-related fixes -->

## [1.0.0] - YYYY-MM-DD

<!-- Repeat the same sections per version. Newest first -->
```

Then proceed to Step 3.

### Step 3: Determine Intent

Infer the user's intent from context and prompt. If clear, proceed directly:

- **Extract changes** — Pull recent git changes into [Unreleased] → Step 4
- **Cut a release** — Move [Unreleased] to a version header → Step 5

Only ask the user if intent cannot be inferred.

### Step 4: Extract Changes to [Unreleased]

1. Determine scope: since latest version tag; if no tag exists, infer from context or ask user for range
2. Show the commit range and count for confirmation
3. Read git history: `git log --oneline --no-merges <range>`
4. Classify each user-facing change into categories:

| Category | What belongs here |
|---|---|
| Added | New features or capabilities |
| Changed | Changes to existing functionality |
| Deprecated | Features marked for future removal |
| Removed | Features that were removed |
| Fixed | Bug fixes |
| Security | Security-related fixes |

5. Write entries following Entry Rules below
6. **Present draft to user for confirmation — do NOT write to file until confirmed**

### Step 5: Cut a Release

1. Determine version number from context (e.g., user prompt, tag history); ask only if unclear (follow SemVer)
2. Move all [Unreleased] content under a new version header: `## [X.Y.Z] - YYYY-MM-DD`
3. Add a fresh empty [Unreleased] section above
4. Present the result for confirmation before writing

## Entry Rules

- One line per change, not paragraphs
- User-facing language, not implementation details
- Link to PR or issue when possible: `(#123)`
- Skip internal refactors, test-only changes, CI updates
- Group related commits into a single entry when appropriate
- Newest entries first
- `[Unreleased]` section always exists at top

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Git log is our changelog" | Git log has noise — merge commits, refactors, typo fixes. Users need a curated summary. |
| "We'll write it at release time" | You'll forget half the changes. Capture incrementally. |
| "Nobody reads changelogs" | Users deciding whether to upgrade do. Support teams debugging issues do. |
| "The changes are obvious from the PR titles" | PR titles are written for reviewers, not end users. Translate to user-facing language. |

## Red Flags

- CHANGELOG.md missing in a project with releases
- [Unreleased] section missing or empty when there are unshipped changes
- Entries describing implementation details instead of user-facing behavior
- Version entries without dates
- Changes not categorized (Added/Changed/Fixed/etc.)

## Verification

- [ ] CHANGELOG.md exists with Keep a Changelog format
- [ ] [Unreleased] section present at top
- [ ] Change type is correct (Added/Changed/Fixed/etc.)
- [ ] Entries are user-facing, not technical
- [ ] PR or issue linked when possible
- [ ] Entry is under correct version section
- [ ] Version entries have dates in YYYY-MM-DD format
- [ ] Human confirmed content before writing
