# Extract Changes to [Unreleased]

Pull recent git history into the `[Unreleased]` section of `CHANGELOG.md`.

## 1. Determine scope

- Default range: `<latest version tag>..HEAD`. Resolve via `git describe --tags --abbrev=0` or `git tag --sort=-v:refname | head -n 1`.
- No tag found: infer from context (first release, `main` since `CHANGELOG.md` last touched). Ask only if ambiguous.
- Show the resolved range and commit count for confirmation before reading history.

## 2. Read git history

```
git log --no-merges --pretty=format:'%h%x09%s%x09%b%x09%an' <range>
```

For each commit, capture:
- Conventional Commit type/scope/breaking marker (`feat!:`, `BREAKING CHANGE:` footer).
- PR number from subject (`(#123)`) or `gh pr list --search <sha>`.
- `Fixes #N` / `Closes #N` footers.

## 3. Filter: include vs. skip

**Include** (user-facing — visible to anyone running, integrating with, or operating the product):
- New behavior, options, flags, commands, API endpoints, UI surfaces.
- Changed defaults, output formats, schemas, configuration keys.
- Removed or deprecated functionality.
- Bug fixes that change observable behavior.
- Security fixes, vulnerability patches.
- Performance changes large enough that a user would notice.
- Dependency changes that affect runtime (minimum version bumps, new peer deps).

**Skip** (internal only):
- `chore:`, `refactor:`, `test:`, `ci:`, `build:`, `style:` unless they change user-visible behavior.
- Pure docs changes (`docs:`) unless documenting a user-facing contract.
- Internal renames, dead-code removal, lint/format passes.
- Reverts of commits also in the same range (resolve net effect, list neither).
- Typo fixes in internal code.

When ambiguous, ask: "would a consumer reading this care?"

## 4. Classify

| Category | What belongs here | Typical commit signals |
|---|---|---|
| Added | New features, capabilities, endpoints, options, flags | `feat:`, "add", "introduce", "support" |
| Changed | Changes in existing functionality (non-breaking and breaking) | `feat:` on existing surface, `refactor:` with behavior change, `perf:` |
| Deprecated | Features still working but scheduled for removal | `deprecate:`, "deprecated", "will be removed" |
| Removed | Features removed in this release | "remove", "drop", "delete <public API>" |
| Fixed | Bug fixes that correct wrong behavior | `fix:`, "correct", "resolve" |
| Security | Vulnerability fixes, CVE remediation, hardening | `security:`, CVE IDs, advisory references |

Rules:
- Breaking change → **Changed** (or **Removed** if the feature is gone). Prefix the line with `**BREAKING:**`.
- Never invent a deprecation. List a planned removal under Deprecated only when an existing commit declares it; name the planned removal version.
- A single PR may produce entries in multiple sections — split it.

## 5. Consolidate and translate

- **Merge** follow-up fixes into the originating entry within the same Unreleased window. `feat: X` + `fix: X edge case` → one Added entry that already reflects the fix.
- **Translate** commit-speak to user-facing language:
  - "Refactor `UserService` to use repository pattern" → skip (internal).
  - "feat(api): add cursor pagination to /v1/items" → Added: "Cursor pagination on `GET /v1/items` (#412)."
  - "fix: NPE in date parser when tz missing" → Fixed: "Date parser no longer crashes when the input lacks a timezone (#418)."
- **Name the surface**, not the file: command, endpoint, flag, component, or config key the user interacts with.

## 6. Entry rules

- One line per change; no paragraphs, no diffs, no file paths, no SHAs.
- Sentence case; start with a verb when natural; end with a period.
- Link to PR or issue when possible: `(#123)`.
- Newest entries first within each section; entries prefixed `**BREAKING:**` float to the top.
- Group identical-shape entries (e.g., several new endpoints) under one bullet with a nested list, only when it improves readability.

## 7. Draft, then confirm

- Produce the draft in-message as the exact final markdown.
- List intentionally skipped commits with a one-word reason (`refactor` / `test` / `ci` / `docs` / `internal`) so the user can override.
- Flag uncertain classifications (e.g., "Listed `perf:` change under Changed — move to Fixed if it corrects a regression").
- **Do not write to file until the user confirms.**

## Common rationalizations

| Rationalization | Reality |
|---|---|
| "Git log is our changelog" | Git log has noise — merge commits, refactors, typo fixes. Users need a curated summary. |
| "We'll write it at release time" | Half the changes are forgotten by then. Capture incrementally. |
| "Nobody reads changelogs" | Upgraders do. Support engineers debugging an incident do. |
| "PR titles are self-explanatory" | PR titles are written for reviewers, not end users. Translate to user-facing language. |

## Validation

- [ ] [Unreleased] section is at the top of the file.
- [ ] Every entry is user-facing — no SHAs, file paths, or raw commit subjects.
- [ ] Each entry sits under the correct category.
- [ ] PR / issue linked where available.
- [ ] Breaking changes prefixed `**BREAKING:**`.
- [ ] Skipped commits reported with a reason.
- [ ] Human confirmed the draft before writing.
