# Push Reference

Lower-level push semantics. The high-level "push + open PR" flow lives in [hs-pr](../../hs-pr/SKILL.md); this file covers `git push` itself — force variants, rejection classification, auth-vs-sync distinction.

## Initial Push

```bash
git push -u origin HEAD
```

`-u` sets the upstream so future `git push` / `git pull` know where to go. Do this once per branch.

## Subsequent Pushes

```bash
git push
```

If rejected, classify before reacting.

| Symptom | Cause | Action |
|---|---|---|
| `non-fast-forward` | Upstream advanced normally | Sync first ([sync.md](sync.md) or [pull.md](pull.md)). Then push. |
| `non-fast-forward` after a deliberate rebase | History was rewritten | `git push --force-with-lease` |
| `403` / `permission denied` | Token scope / auth | Surface error. Do **not** rewrite remote URL or switch protocols. |
| `protected branch` | Repo policy | Surface. Do not bypass. |
| `Repository not found` | Wrong remote / no access | Surface. |

## Force-Push Discipline

- **Never** plain `git push --force`. It overwrites teammates' commits unconditionally.
- **`--force-with-lease`** is the only acceptable force variant. It refuses to push if the remote moved since the last fetch — protecting against the "force-pushed over a teammate" footgun.
- Use force only when history was **deliberately rewritten** (after a rebase, after `git commit --amend`). Not as a generic "make it go through" tool.
- Don't force-push to shared branches (`main`, `develop`, release branches) without explicit authorization.

## Auth vs Sync — Don't Confuse Them

A `permission denied` is **not** a sync problem. The common AI shortcut is:

> Push failed → maybe I should change the remote to use a different protocol → maybe I should clone with a token in the URL ...

Stop. Auth errors mean credentials, token scope, or repo policy are wrong. Surface the exact error. Rewriting `origin` to paper over auth is how secrets end up in `.git/config` and how broken push setups propagate.

## When the Remote Branch Already Advanced

If `git fetch` shows the remote feature branch moved (CI auto-commit, another agent), and local has new commits too:

1. **First**: pull the remote feature branch into local (fast-forward or merge — see [pull.md](pull.md) step 3).
2. **Then**: rebase or merge `origin/main` if needed.
3. **Finally**: push.

Pushing without absorbing the remote feature branch first will reject as non-fast-forward — and a `--force-with-lease` past that erases the CI auto-commit (or the other agent's work).

## Verification

- [ ] Push succeeded without plain `--force`
- [ ] No remote URL rewriting was used to work around auth
- [ ] If `--force-with-lease` was used, history rewrite was deliberate
