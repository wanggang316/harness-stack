# Sync Reference (rebase + push)

Operational depth for keeping a feature branch up to date with its upstream and publishing the result. The slash command `/hs-git-sync` is the haiku-driven entry point that follows this flow; this file is the longer-form reference.

This is the **rebase-based** flow — keeps a linear history. Use [pull.md](pull.md) when project policy mandates merge commits, when the branch is shared with others, or when rewriting history would be hostile.

## Pre-Flight

1. **Working tree clean.** If `git status` shows uncommitted changes, stop — commit (see [commit.md](commit.md)) or stash first. Do not auto-stash, do not discard.
2. **Upstream exists.** If `git rev-parse --abbrev-ref --symbolic-full-name @{u}` errors, the branch has no upstream — set it with `git push -u origin <branch>` before syncing.
3. **Anything to do?** `git rev-list --left-right --count HEAD...@{u}`. If output is `0\t0`, already in sync — exit.

## Rebase

```bash
git pull --rebase
```

- Clean success → push.
- Conflicts → resolve, then `git rebase --continue`.

### Conflict Resolution

```bash
git status                                  # list conflicted files
git diff --name-only --diff-filter=U        # machine-readable list
```

For each conflicted file:

1. Open the file. Locate `<<<<<<<` / `=======` / `>>>>>>>` markers.
2. Read both sides. State the intent: what is each side trying to achieve? Is one a superset of the other? Are they orthogonal?
3. Edit to the **intended outcome**, not "pick one side". Preserve invariants and user-visible behavior unless the conflict deliberately changes them.
4. `git add <file>`.

When intent is unclear from the diff alone, broaden context — recent commit messages on both branches, callers, tests. If still unclear, stop and ask the user with the hunks attached.

After all conflicts resolved:

```bash
git rebase --continue
```

If the rebase spans multiple commits, conflicts may reappear on the next commit — repeat.

To bail out: `git rebase --abort`.

### Anti-Shortcuts

- **Don't** `git rebase --skip` — silently drops a commit.
- **Don't** delete conflict markers without resolving intent — leaves broken code that compiles.
- **Don't** `git checkout --ours` / `--theirs` wholesale unless certain one side fully supersedes the other.

## Push

```bash
git push
```

After a clean rebase, push should fast-forward. If it's rejected as non-fast-forward:

- The upstream moved again while you were rebasing, **or**
- Another agent is racing on the same branch.

**Stop.** Do not auto-`--force` or `--force-with-lease`. Surface the rejection and decide deliberately:

- If the rejection is from your own deliberate rewrite (the remote still has the pre-rebase shape and that's expected), `--force-with-lease` is the right tool.
- If someone else pushed work, fetch and rebase again first.

## Sync Failure vs Permission Failure

Not every push rejection is a sync problem. Classify before reacting.

| Symptom | Cause | Action |
|---|---|---|
| `non-fast-forward` | Upstream advanced | Re-rebase. |
| `403` / `permission denied` / `must allow workflow scope` | Auth / token scope | Surface to user. Do **not** rewrite remote URL or switch protocols. |
| `protected branch` rules | Branch policy | Surface. Do not bypass. |
| `Repository not found` | Wrong remote / no access | Surface. |

The default for auth / permission / policy failures is **stop and tell the user the exact error**, not "try a workaround". Rewriting `origin` to paper over auth is how broken push setups propagate.

## Verification

- [ ] Working tree clean before sync
- [ ] No `--skip` used during rebase
- [ ] No conflict markers remain (`git diff --check`)
- [ ] Push succeeded without `--force` (or with `--force-with-lease` deliberately)
