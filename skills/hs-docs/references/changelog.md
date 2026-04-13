# CHANGELOG.md

User-facing change history following [Keep a Changelog](https://keepachangelog.com/) format.

## When to Write

- Shipping a feature that changes user-facing behavior
- Fixing a user-visible bug
- Deprecating or removing functionality
- Security fixes

**Don't use for**: Internal refactors, test changes, or CI updates that don't affect users.

## Process

1. **Identify the change type** — Added / Changed / Deprecated / Removed / Fixed / Security
2. **Write one line per change** — Concise, user-facing language
3. **Link to PR or issue** — `(#123)` at end of line
4. **Place under correct version** — `[Unreleased]` for unshipped changes, version header for releases
5. **Save** — Write to `CHANGELOG.md` in project root

## Structure

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Task sharing: users can share tasks with team members (#123)

### Fixed
- Duplicate tasks appearing when rapidly clicking create button (#125)

## [1.1.0] - 2025-01-15

### Added
- Email notifications for task assignments (#120)

### Changed
- Task list now loads 50 items per page, was 20 (#121)
```

## Rules

- Newest entries first
- One line per change, not paragraphs
- User-facing language, not implementation details
- Every entry links to a PR or issue when possible
- `[Unreleased]` section always exists at top

## Verification

- [ ] Change type is correct (Added/Changed/Fixed/etc.)
- [ ] Description is user-facing, not technical
- [ ] PR or issue linked
- [ ] Entry is under correct version section
