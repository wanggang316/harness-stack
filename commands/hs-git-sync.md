---
allowed-tools: Bash(git fetch:*), Bash(git pull:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git rebase:*), Bash(git add:*), Bash(git push:*), Bash(git rev-list:*), Bash(git ls-files:*)
description: Pull --rebase from upstream, resolve conflicts, then push
model: claude-haiku-4-5
---

## Context

- Branch: !`git branch --show-current`
- Status: !`git status`
- Upstream: !`git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "(no upstream)"`
- Ahead/behind: !`git rev-list --left-right --count HEAD...@{u} 2>/dev/null || echo "(no upstream)"`
- Recent commits: !`git log --oneline -10`

## Sync Flow

1. **Pre-flight**
   - If status shows uncommitted changes, **stop**. Tell the user to commit or stash first; do not auto-stash, do not discard.
   - If there is no upstream branch, **stop**. Tell the user to set one (`git push -u origin <branch>`).
   - If `ahead/behind` is `0\t0`, nothing to do — print "already in sync" and exit.

2. **Rebase**
   - Run `git pull --rebase`.
   - On clean success → go to step 4.
   - On conflict → step 3.

3. **Conflict resolution**
   - Run `git status` and `git diff --name-only --diff-filter=U` to list conflicted files.
   - For each conflicted file:
     - Read the file, locate `<<<<<<<` / `=======` / `>>>>>>>` markers.
     - Resolve based on intent — never blindly pick a side. If intent is unclear from the diff and surrounding code, **stop and ask the user** with the conflicting hunks shown.
     - Save the file, then `git add <path>`.
   - After all files are resolved, run `git rebase --continue`.
   - If new conflicts appear (multi-commit rebase), repeat this step.
   - If the user wants to bail out, run `git rebase --abort` and exit.

4. **Push**
   - Run `git push`.
   - If push is rejected as non-fast-forward after a clean rebase, **stop** — that means upstream moved again or local history was rewritten in a way that conflicts with shared history. Do **not** auto-`--force` or `--force-with-lease`. Show the user the rejection and ask.

5. **Report**
   - Summarize: how many commits rebased, which files had conflicts (if any), final HEAD vs. upstream state.

## Important

- **Never** `git push --force` / `--force-with-lease` without explicit user instruction.
- **Never** `git rebase --skip` to dodge a conflict — that drops a commit silently.
- **Never** delete or move conflict markers without resolving the underlying intent.
- If anything looks wrong (detached HEAD, wrong upstream, unexpected merge in progress), stop and surface it instead of pressing on.
