# CHANGELOG.md Init Template

Use this scaffold when creating a new `CHANGELOG.md`. It follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## Template

Save as `CHANGELOG.md` in the project root.

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [0.1.0] - YYYY-MM-DD

### Added

- Initial release.

[Unreleased]: https://github.com/<org>/<repo>/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/<org>/<repo>/releases/tag/v0.1.0
```

## Section meaning

Use these six categories — no others. Omit a section when empty in a released version; keep all six in `[Unreleased]` so contributors know where to file entries.

| Section | Purpose |
|---|---|
| Added | New features, capabilities, endpoints, options, flags |
| Changed | Changes in existing functionality (non-breaking and breaking) |
| Deprecated | Features still working but scheduled for removal |
| Removed | Features removed in this release |
| Fixed | Bug fixes that correct wrong behavior |
| Security | Vulnerability fixes, CVE remediation, hardening |

## Linkable versions

Per KaC principle 4 ("Versions and sections should be linkable"), every version header has a matching link at the bottom of the file:

- `[Unreleased]` compares the latest tag to `HEAD`.
- Each released version compares its predecessor's tag to its own tag, or — for the first release — links to the tag itself.
- Use the repository's compare URL pattern (GitHub: `/compare/vA.B.C...vX.Y.Z`, GitLab: `/-/compare/vA.B.C...vX.Y.Z`).

## Initial version choice

- `0.1.0` for projects still in active pre-1.0 development.
- `1.0.0` only when committing to a stable public API.
- If the project already has releases without a changelog, start the file at the next planned version and backfill prior versions from git history when capacity allows; do not fabricate dates.

## SemVer reminder

State SemVer adherence in the header (the template already does). When the project does not follow SemVer (e.g., CalVer), replace the SemVer line with the actual scheme and link to its spec — never leave the line claiming SemVer if it isn't true.
