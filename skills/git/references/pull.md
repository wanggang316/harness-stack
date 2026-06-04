# Pull Reference (merge-based update-branch)

Operational depth for merging `origin/main` into the current branch when project policy prefers merge commits over rebases, when the branch is shared with others, or when rewriting history would be hostile.

Use [sync.md](sync.md) instead when the project keeps a linear history.

## One-Time Setup

```bash
git config rerere.enabled true
git config rerere.autoupdate true
```

`rerere` (reuse recorded resolution) remembers how a given conflict was resolved the first time and replays the resolution next time it appears. A free safety net for long-running branches that merge `main` repeatedly.

## Conflict Style

Set once globally or per-repo:

```bash
git config merge.conflictstyle zdiff3
```

`zdiff3` shows base + ours + theirs in the conflict block, with matching lines trimmed — much easier to read intent than the default 2-way style.

## Workflow

1. Working tree clean (commit or stash first).
2. Fetch:

   ```bash
   git fetch origin
   ```

3. Sync the **remote feature branch** first — absorbs auto-commits pushed by CI or other agents:

   ```bash
   git pull --ff-only origin "$(git branch --show-current)"
   ```

4. Merge `origin/main`:

   ```bash
   git merge origin/main
   ```

5. Resolve conflicts (see below), then `git add <files>` + `git commit` (or `git merge --continue`).
6. Verify with project gates (lint, type, test).

## Reading Conflicts

When a hunk is unclear, drop to file-level intent diffs:

```bash
git diff :1:path/to/file :2:path/to/file   # base vs ours
git diff :1:path/to/file :3:path/to/file   # base vs theirs
```

`:1` = merge base, `:2` = ours (current branch), `:3` = theirs (incoming). This shows each side's intent isolated, instead of the smashed-together hunk view.

### Resolution Order

1. **State intent on both sides** — bug fix, refactor, rename, behavior change.
2. **Decide the final behavior first** — what should the code do?
3. **Then craft the resolution** to match that decision.
4. Prefer preserving invariants, API contracts, and user-visible behavior unless the conflict clearly indicates a deliberate change.

### Generated Files

Resolve **source files first**, then regenerate. Don't merge generated artifacts by hand:

```bash
# 1. Resolve handwritten source conflicts; commit them.
# 2. Re-run the generator (codegen, prisma, openapi, ...).
# 3. Stage the regenerated output.
```

### Import Conflicts

When both branches added imports and intent is unclear:

1. Accept both sides temporarily (keep all candidate imports).
2. Finish the merge.
3. Run lint / type check — unused or duplicate imports surface cleanly there.

### When Both Sides Are Wrong

The conflict marker is not a multiple-choice question. Sometimes the correct resolution is a third option neither side wrote. That's normal.

## When to Ask the User

Default: make a best-effort decision, document the rationale in the merge commit body, proceed.

Ask only when:

- Correctness depends on product intent not inferable from code, tests, or docs.
- The conflict crosses a user-visible API, contract, or migration where a wrong choice breaks external consumers.
- Two mutually exclusive designs with equivalent technical merit and no local signal.
- The merge introduces data loss, schema changes, or irreversible side effects without an obvious safe default.

## Verification

- [ ] No conflict markers remain (`git diff --check`)
- [ ] Generated files were regenerated, not hand-merged
- [ ] Lint / type / test pass after merge
- [ ] Merge commit body notes any non-obvious resolution decisions
