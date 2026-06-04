# Cut a New Version

Move `[Unreleased]` content into a dated version header. This reference only edits `CHANGELOG.md`. Tagging, pushing, and releasing belong to the ship pipeline — not this skill.

## Inputs

- Current `CHANGELOG.md` with non-empty `[Unreleased]` content.
- The latest released version (from the previous version header or `git tag --sort=-v:refname | head -n 1`).
- The release date (today, `YYYY-MM-DD`, UTC by default).

If `[Unreleased]` is empty, stop and tell the user — there is nothing to release.

## Decide the version bump (SemVer)

Inspect the `[Unreleased]` sections and apply, in order:

| Trigger in [Unreleased] | Bump |
|---|---|
| Any entry marked `**BREAKING:**`, any `Removed` of a public surface, any incompatible change to a public API | **MAJOR** (`X.0.0`) |
| Otherwise, any `Added` entry, or a new option / endpoint / flag under `Changed` | **MINOR** (`x.Y.0`) |
| Only `Fixed`, `Security`, `Deprecated`, or non-functional `Changed` entries | **PATCH** (`x.y.Z`) |

Pre-1.0 (`0.y.z`) rules:
- `0.y.0` → `0.(y+1).0` for new features **and** breaking changes (no MAJOR exists yet).
- `0.y.z` → `0.y.(z+1)` for fixes only.
- Recommend `1.0.0` to the user when the API is being committed to.

If the inferred bump conflicts with the user's stated version, surface the conflict before writing.

## Transform the file

1. **Rename the header.** `## [Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD`.
2. **Prune empty sections** from the released version. Keep only the categories that have entries.
3. **Re-seed `[Unreleased]`** at the top, above the new version, with all six empty subsections:

   ```markdown
   ## [Unreleased]

   ### Added

   ### Changed

   ### Deprecated

   ### Removed

   ### Fixed

   ### Security
   ```

4. **Order the version block.** Within the released version, keep the canonical section order (Added → Changed → Deprecated → Removed → Fixed → Security). Inside each section, newest first; entries already prefixed `**BREAKING:**` float to the top.
5. **Update bottom-of-file links.** Two edits, both required for linkable versions (KaC principle 4):
   - `[Unreleased]: …/compare/vX.Y.Z...HEAD` (was `…/compare/v<prev>...HEAD`)
   - Insert `[X.Y.Z]: …/compare/v<prev>...vX.Y.Z` above the previous version's link

   For the very first release, use `…/releases/tag/vX.Y.Z` instead of a compare URL.

## Yanked releases

If a published version has to be withdrawn (broken, compromised, accidentally released), mark it instead of deleting:

```markdown
## [1.4.2] - 2026-05-12 [YANKED]
```

Keep the original content beneath the header so consumers can understand why downstream pins fail. Add a Fixed/Security entry in the next version explaining the yank.

## Validation before writing

- [ ] Version number conforms to SemVer (or the project's stated scheme).
- [ ] Date is `YYYY-MM-DD`, today's date in the project's release timezone.
- [ ] New version header is directly below the fresh `[Unreleased]`, above the previous version.
- [ ] No empty sections remain in the released version block.
- [ ] All entries are user-facing — no SHAs, file paths, or raw commit subjects.
- [ ] Breaking changes carry `**BREAKING:**` and the version bump reflects them.
- [ ] Anything in `Removed` was either previously in `Deprecated` or has a clear rationale called out.
- [ ] Bottom-of-file links updated: `[Unreleased]` now points at the new tag; new `[X.Y.Z]` link inserted.
- [ ] No duplicate version headers; versions remain in descending order.

Present the diff for confirmation. **Do not write until the user confirms.**

## Out of scope

This reference does not:
- Create or push git tags.
- Open a PR or trigger CI.
- Publish to a registry (npm, PyPI, crates.io, etc.).
- Update version strings in `package.json`, `pyproject.toml`, `Cargo.toml`, or similar manifests.

Those belong to `harness-stack:pr` and `harness-stack:ship`. Hand off after `CHANGELOG.md` is committed.
