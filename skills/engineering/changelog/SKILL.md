---
name: changelog
description: Create and maintain CHANGELOG.md. Use when initializing a changelog, extracting unreleased changes from Git history, or preparing a version release.
---

# changelog

Maintain `CHANGELOG.md` using [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## Route by intent

| Situation | Procedure |
| --- | --- |
| No `CHANGELOG.md` exists | [references/init-template.md](references/init-template.md) |
| Collect recent Git changes under `[Unreleased]` | [references/extract-changes.md](references/extract-changes.md) |
| Move `[Unreleased]` into a dated version section | [references/new-version.md](references/new-version.md) |

After initialization, continue to extraction or a new version as needed. Each procedure owns its rules, draft, and validation. Do not write files before the user confirms the draft.

## When to skip

Skip internal refactors, tests, CI/build changes, and documentation-only changes that do not affect users.
