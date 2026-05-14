---
name: hs-git
description: Structures git workflow practices. Use when making any code change. Use when committing, branching, resolving conflicts, or when you need to organize work across multiple parallel streams.
---

# Git Workflow and Versioning

## Overview

Git is the safety net. Commits are save points, branches are sandboxes, history is documentation. With agents generating code fast, disciplined version control is what keeps changes reviewable and reversible.

This skill covers the **mindset** — principles, conventions, anti-patterns. Operational depth (how to commit, sync, pull, push) lives in `references/`. Day-to-day entry points are the slash commands `/hs-commit` and `/hs-git-sync`.

## When to Use

Always. Every code change flows through git.

## Core Principles

### Trunk-Based Development

Keep `main` always deployable. Work in short-lived feature branches that merge back within 1–3 days. Long-lived branches accumulate merge risk; prefer feature flags over keeping incomplete work on a branch for weeks.

```
main ──●──●──●──●──●──●──●──●──●──   (always deployable)
        ╲      ╱  ╲    ╱
         ●──●─╱    ●──╱              (short-lived feature branches)
```

Release branches are acceptable when stabilizing a release while main moves forward; everything else should land fast.

### Commit Early, Atomic, Concerns Separate

- One slice → one commit. Don't accumulate large uncommitted changes.
- Each commit does one logical thing. Mixing refactor + feature, or formatting + behavior, makes review and revert harder.
- Don't squash later "to clean up" — write clean commits as you go.

Message format, splitting strategies, and pre-commit hygiene live in [references/commit.md](references/commit.md).

### Size Your Changes

| Diff size | Action |
|---|---|
| ≤ ~100 lines | Good. Reviewable in one sitting. |
| ~100–300 lines | Acceptable for one logical change with tests. |
| > ~1000 lines | Too large. Split it. |

Exceptions: complete deletions, automated codemods, lockfile updates — where reviewers verify intent, not lines.

### Save Point Pattern

```
implement slice → test → verify → commit → next slice
```

If a slice goes wrong, `git reset --hard HEAD` returns to the last known-good state. Never lose more than one increment.

### Worktrees for Parallel Work

```bash
git worktree add ../project-feature-a feature/task-creation
git worktree add ../project-feature-b feature/user-settings
git worktree remove ../project-feature-a   # when done
```

Each worktree is an isolated checkout — agents can work in parallel without branch switching. If an experiment fails, delete the worktree, nothing is lost. See `hs-env-init` for per-worktree runtime isolation.

### Branch Naming

```
feature/<short-description>
fix/<short-description>
chore/<short-description>
refactor/<short-description>
```

Delete branches after merge. Some repos auto-delete head branches on PR merge — don't fight that.

## References

| Operation | Reference | Slash command |
|---|---|---|
| Create a commit | [references/commit.md](references/commit.md) | `/hs-commit` |
| Sync (rebase + push) | [references/sync.md](references/sync.md) | `/hs-git-sync` |
| Pull / merge update-branch | [references/pull.md](references/pull.md) | — |
| Push semantics | [references/push.md](references/push.md) | — |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll commit when the feature is done" | One giant commit is impossible to review, debug, or revert. Commit each slice. |
| "The message doesn't matter" | Messages are documentation. Future agents need them. |
| "I'll squash it all later" | Squashing destroys the development narrative. Write clean commits from the start. |
| "Branches add overhead" | Short-lived branches are free; long-lived branches are the cost. |
| "I'll split this change later" | Large changes are riskier and harder to revert. Split before submitting. |
| "Just `--force`, it's faster" | `--force` overwrites teammates' work. Use `--force-with-lease` only when history was deliberately rewritten. |
| "Auth failed — let me change the remote URL" | Cover-up, not fix. Surface the auth error; don't paper over it. |

## Red Flags

- Large uncommitted changes accumulating
- Commit messages like `fix`, `update`, `wip`, `misc`
- Formatting changes mixed with behavior changes
- Long-lived branches diverging from main
- Force-pushing to shared branches without authorization
- `Co-Authored-By` / model / tool attribution trailers in commit messages
- Rewriting the remote URL to work around an auth or permission error
- `git rebase --skip` to dodge a conflict (silently drops a commit)
- Manually editing generated files inside a merge conflict instead of regenerating
