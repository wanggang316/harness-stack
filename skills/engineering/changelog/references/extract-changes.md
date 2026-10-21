# Extract changes into [Unreleased]

Collect recent Git history in the `[Unreleased]` section of `CHANGELOG.md`.

## 1. Establish the range

- Default to `<latest version tag>..HEAD`. Find the tag with `git describe --tags --abbrev=0` or `git tag --sort=-v:refname | head -n 1`.
- Without a tag, infer the range from context, such as the first release or `main` since the last changelog update. Ask only when ambiguous.
- Show the resolved range and commit count for confirmation before reading the history.

## 2. Read Git history

```bash
git log --no-merges --pretty=format:'%h%x09%s%x09%b%x09%an' <range>
```

For each commit, collect:

- Conventional Commit type, scope, and breaking markers such as `feat!:` or a `BREAKING CHANGE:` footer.
- PR number from the subject, such as `(#123)`, or `gh pr list --search <sha>`.
- `Fixes #N` or `Closes #N` footers.

## 3. Filter: include or skip

**Include user-facing changes** observable by people running, integrating, or operating the product:

- New behavior, options, flags, commands, API endpoints, or UI screens.
- Changed defaults, output formats, schemas, or configuration keys.
- Removed or deprecated features.
- Bug fixes that change observable behavior.
- Security fixes and vulnerability patches.
- Noticeable performance changes.
- Dependency changes that affect runtime, such as a higher minimum version or a new peer dependency.

**Skip internal changes**:

- `chore:`, `refactor:`, `test:`, `ci:`, `build:`, and `style:` unless they change user-visible behavior.
- Documentation-only changes (`docs:`) unless they document a user-facing contract.
- Internal renames, dead-code removal, and lint or formatting sweeps.
- Reverts of commits in the same range. Compute the net effect and omit both.
- Typo fixes in internal code.

When uncertain, ask whether a user reading the entry would care.

## 4. Classify

| Category | Content | Typical commit signals |
| --- | --- | --- |
| Added | New features, capabilities, endpoints, options, or flags | `feat:`, "add", "introduce", "support" |
| Changed | Changes to existing functionality, compatible or breaking | `feat:` on existing interfaces, behavioral `refactor:`, `perf:` |
| Deprecated | Features still available but scheduled for removal | `deprecate:`, "deprecated", "will be removed" |
| Removed | Features removed in this release | "remove", "drop", "delete <public API>" |
| Fixed | Bug fixes that correct behavior | `fix:`, "correct", "resolve" |
| Security | Vulnerability fixes, CVE patches, or hardening | `security:`, CVE IDs, security advisory references |

Rules:

- Put breaking changes under **Changed**, or **Removed** if the feature is gone. Prefix the entry with `**BREAKING:**`.
- Do not invent deprecations. Include planned removal under Deprecated only when an existing commit explicitly declares it, and state the planned removal version.
- A single PR may contribute entries to several sections. Split them accordingly.

## 5. Consolidate and translate

- **Consolidate** follow-up fixes into the original entry within the same Unreleased window. `feat: X` plus `fix: X edge case` becomes one Added entry that reflects the fix.
- **Translate** commit language into user-facing language:
  - "Refactor `UserService` to use repository pattern" → skip as internal.
  - "feat(api): add cursor pagination to /v1/items" → Added: "Cursor pagination on `GET /v1/items` (#412)."
  - "fix: NPE in date parser when tz missing" → Fixed: "Date parser no longer crashes when the input lacks a timezone (#418)."
- **Name the interface**, not the file: the command, endpoint, flag, component, or configuration key users interact with.

## 6. Entry rules

- One line per change. No paragraphs, diffs, file paths, or SHAs.
- Use sentence case, start with a verb when natural, and end with a period.
- Link a PR or issue when available: `(#123)`.
- Order newest entries first within each section, with `**BREAKING:**` entries at the top.
- Group similarly shaped entries, such as several new endpoints, under a nested list only when it improves readability.

## 7. Draft, then confirm

- Show the exact proposed Markdown in the response.
- List intentionally skipped commits with a one-word reason: `refactor`, `test`, `ci`, `docs`, or `internal`, so the user can override the choice.
- Flag uncertain categories. For example: "Placed this `perf:` entry under Changed; use Fixed if it corrects a regression."
- **Do not write files before user confirmation.**

## Common excuses

| Excuse | Reality |
| --- | --- |
| "Git log is our changelog." | Git history includes merges, refactors, and typos. Users need a curated summary. |
| "Write it at release time." | Many changes will be forgotten by then. Record them incrementally. |
| "Nobody reads changelogs." | People upgrading and support engineers investigating incidents do. |
| "The PR title explains itself." | PR titles address reviewers, not end users. Translate them. |

## Validation

- [ ] `[Unreleased]` is the first version section.
- [ ] Every entry addresses users; no SHAs, file paths, or raw commit subjects remain.
- [ ] Each entry uses the correct category.
- [ ] Available PRs or issues are linked.
- [ ] Breaking changes use the `**BREAKING:**` prefix.
- [ ] Skipped commits and reasons are reported.
- [ ] A human confirmed the draft before the write.
