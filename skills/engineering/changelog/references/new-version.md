# Prepare a new version

Move `[Unreleased]` content into a dated version section. This reference edits only `CHANGELOG.md`. Tagging, pushing, and publishing belong to the shipping workflow, not this skill.

## Inputs

- Current `CHANGELOG.md` with nonempty `[Unreleased]` content.
- Latest released version, from the previous version heading or `git tag --sort=-v:refname | head -n 1`.
- Release date: today in `YYYY-MM-DD`, using UTC by default.

If `[Unreleased]` is empty, stop and tell the user there is nothing to release.

## Determine the version bump with SemVer

Inspect `[Unreleased]` and apply these rules in order:

| Trigger in [Unreleased] | Bump |
| --- | --- |
| Any `**BREAKING:**` entry, removal of a public interface, or incompatible public API change | **MAJOR** (`X.0.0`) |
| Otherwise, any Added entry or new option, endpoint, or flag under Changed | **MINOR** (`x.Y.0`) |
| Only Fixed, Security, Deprecated, or non-functional Changed entries | **PATCH** (`x.y.Z`) |

Before 1.0 (`0.y.z`):

- `0.y.0` → `0.(y+1).0` for both features and breaking changes; no major bump yet.
- `0.y.z` → `0.y.(z+1)` for fixes only.
- Recommend `1.0.0` when the project is ready to commit to the API.

Surface conflicts between the inferred bump and a user-specified version before writing.

## Rewrite the file

1. **Rename the heading.** `## [Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD`.
2. **Remove empty sections from the released version.** Keep only categories with entries.
3. **Add a fresh `[Unreleased]` above the new version**, with all six empty sections:

   ```markdown
   ## [Unreleased]

   ### Added

   ### Changed

   ### Deprecated

   ### Removed

   ### Fixed

   ### Security
   ```

4. **Order the version block.** Keep the standard section order: Added → Changed → Deprecated → Removed → Fixed → Security. Put newer entries first within a section and `**BREAKING:**` entries at the top.
5. **Update bottom-of-file links** to keep versions linkable:
   - Change `[Unreleased]: …/compare/v<prev>...HEAD` to `[Unreleased]: …/compare/vX.Y.Z...HEAD`.
   - Insert `[X.Y.Z]: …/compare/v<prev>...vX.Y.Z` above the previous version's link.

   For the first release, use `…/releases/tag/vX.Y.Z` instead of a compare URL.

## Yanked releases

If a published release must be withdrawn because it is broken, compromised, or accidental, mark it instead of deleting it:

```markdown
## [1.4.2] - 2026-05-12 [YANKED]
```

Retain the original content so consumers can understand why downstream version pins fail. Add a Fixed or Security entry in the next version explaining the withdrawal.

## Validate before writing

- [ ] The version follows SemVer or the project's declared scheme.
- [ ] The date uses `YYYY-MM-DD` and is today in the project's release timezone.
- [ ] The new version is directly below fresh `[Unreleased]` and above the previous version.
- [ ] No empty sections remain in the released block.
- [ ] Entries address users, without SHAs, file paths, or raw commit subjects.
- [ ] Breaking entries use `**BREAKING:**` and the version bump reflects them.
- [ ] Every Removed entry was previously Deprecated or has a clear explanation.
- [ ] Bottom links are updated: `[Unreleased]` starts at the new tag and `[X.Y.Z]` exists.
- [ ] Version headings are unique and remain in descending order.

Show the diff for confirmation. **Do not write before user confirmation.**

## Out of scope

This reference does not:

- Create or push Git tags.
- Open PRs or trigger CI.
- Publish to registries such as npm, PyPI, or crates.io.
- Update version strings in `package.json`, `pyproject.toml`, `Cargo.toml`, or similar manifests.

Those actions belong to `harness-stack:merge` and the release process. Hand off after `CHANGELOG.md` is committed.
