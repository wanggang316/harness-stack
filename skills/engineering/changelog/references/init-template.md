# CHANGELOG.md initialization template

Use this scaffold for a new `CHANGELOG.md`. It follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## Template

Save as `CHANGELOG.md` at the project root.

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

## Section meanings

Use only these six categories. Omit empty sections in released versions. Keep all six under `[Unreleased]` so contributors know where to put entries.

| Section | Purpose |
| --- | --- |
| Added | New features, capabilities, endpoints, options, or flags |
| Changed | Changes to existing functionality, compatible or breaking |
| Deprecated | Features still available but scheduled for removal |
| Removed | Features removed in this release |
| Fixed | Bug fixes that correct behavior |
| Security | Vulnerability fixes, CVE patches, or hardening |

## Linkable versions

Under the KaC principle that versions and sections should be linkable, give each version heading a link definition at the bottom:

- `[Unreleased]` compares the latest tag with `HEAD`.
- Each released version compares its previous tag with its own tag. For the first release, link directly to the tag.
- Use the repository's compare URL pattern: GitHub `/compare/vA.B.C...vX.Y.Z`, GitLab `/-/compare/vA.B.C...vX.Y.Z`.

## Choose the initial version

- Use `0.1.0` for active development before 1.0.
- Use `1.0.0` only when committing to a stable public API.
- If releases exist without a changelog, start with the next planned version. Backfill older versions from Git history when practical; do not invent dates.

## SemVer reminder

Declare SemVer adherence in the header, as the template does. If the project uses another scheme, such as CalVer, replace that line with the actual scheme and a specification link. Do not leave a false SemVer claim.
