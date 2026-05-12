---
name: hs-changelog
description: Create and maintain CHANGELOG.md. Use when initializing changelog, extracting unreleased changes from git history, or preparing a release version.
---

# hs-changelog

Maintain `CHANGELOG.md` following [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## Route by intent

| Situation | Sub-flow |
|---|---|
| No `CHANGELOG.md` in the project | [references/init-template.md](references/init-template.md) |
| Capture recent git changes into `[Unreleased]` | [references/extract-changes.md](references/extract-changes.md) |
| Release — move `[Unreleased]` to a dated version header | [references/new-version.md](references/new-version.md) |

After init, route again to extract or new-version as needed. Each sub-flow owns its own rules, draft, and validation; never write to file before the user confirms the draft.

## Skip when

Internal refactors, tests, CI/build, or pure docs that don't affect users.
