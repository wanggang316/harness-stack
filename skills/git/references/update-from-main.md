# Update-from-main Reference (catch a worktree branch up with trunk)

在 worktree 上让当前 feature 分支跟上 `main`（trunk）最新进展的完整规则。

和 [sync.md](sync.md) 区分清楚：

- **sync** = 把当前分支与它的 **upstream**（同名远端分支）对齐，再 push 发布。
- **update-from-main**（本文）= 把 **trunk** 的新进展整合进当前分支，让一条落后的 feature 分支追上 `main`。

## 核心洞见（worktree-specific）

- 你**不需要**切回主 worktree 去 `git checkout main && git pull`。worktree 的全部意义就是免去来回切分支。
- 你真正需要的只是 `origin/main` 的最新状态——一次 `git fetch` 即可——然后直接对这条 remote-tracking ref 做 rebase / merge。本地 `main` 分支是否最新**无关紧要**。
- 所有 worktree 共享同一个 `.git` object store 与 remote-tracking refs，所以在任意一个 worktree `git fetch` 一次，其余 worktree 立刻都能看到最新的 `origin/main`。

## Pre-Flight

1. **工作区干净。** 若 `git status` 有未提交改动，停下——先 commit（见 [commit.md](commit.md)）或 stash。不自动 stash，不丢弃。
2. **Fetch trunk。**

   ```bash
   git fetch origin
   ```

3. **有事可做吗？**

   ```bash
   git rev-list --left-right --count HEAD...origin/main
   ```

   左数=你领先 main 的 commit 数，右数=main 领先你的 commit 数。右数为 `0` 表示已是最新——退出。

## Default: rebase onto origin/main

```bash
git fetch origin
git rebase origin/main
```

- 干净成功 → 完成。
- 有 conflict → 按 [sync.md](sync.md) 的 *Conflict Resolution* 处理（陈述两侧意图、改成期望结果、`git add <file>`、`git rebase --continue`）。中止用 `git rebase --abort`。

这是默认路线，因为它保持线性 history，与 [SKILL.md](../SKILL.md) 的 trunk-based 原则、以及 `git-sync` 命令的 rebase 路线一致。

**注意——rebase 改写了你这条分支的 history。** 若该分支**尚未** push，更新后直接 `git push -u origin HEAD` 即可。若该分支**已经** push 到远端，把更新发布上去需要 `git push --force-with-lease`（见 [push.md](push.md)），且**仅对你自己的 feature 分支**——绝不对 `main` 或任何共享分支。

## Alternative: merge origin/main

当分支已与他人共享、项目策略偏好 merge commit、或重写 history 会造成麻烦时，改走 merge：

```bash
git fetch origin
git merge origin/main
```

conflict 解决规范见 [pull.md](pull.md)（含 `rerere` / `zdiff3` 的一次性设置）。merge **不改写 history**，因此后续是普通 `git push`，无需 force。

## Optional: keep a local `main` ref fresh

有时你要更新的不是 feature 分支，而是想让**本地 `main` 分支**追上 `origin/main`（例如准备基于最新 main 开一条新分支）。在 worktree 里不必 checkout main：

```bash
git fetch origin main:main
```

这条 refspec 把本地 `main` **fast-forward** 到 `origin/main`，且**不切换任何工作区**。

- **陷阱：** 若 `main` 当前正被某个 worktree checkout（git 不允许同一分支在两个 worktree 同时 checkout），这条命令会被拒绝：`refusing to fetch into branch 'refs/heads/main' checked out at ...`。典型布局里主 worktree 就停在 `main` 上，所以这很常见。此时要么去那个 worktree 里 `git pull --ff-only`，要么**根本不必更新本地 main**——直接拿 `origin/main` 当 rebase / merge 的基点，正如上面两节所做。
- 仅当 `origin/main` 是本地 main 的快进时这条才成立。若 fetch 因 non-fast-forward 被拒，说明本地 `main` 上有了分叉 commit——main 本不该承载 commit，排查它，别 force。

## Worktree notes

- 同一分支不能在两个 worktree 同时 checkout。用 `git worktree list` 查看谁占用了什么。
- 每个 worktree 的运行时隔离（端口 / 数据库 / 缓存）见 `harness-stack:env-init`。

## Verification

- [ ] 更新前工作区干净
- [ ] fetch 过 `origin`（确保基于最新的 `origin/main` 操作）
- [ ] rebase 期间没用 `--skip`
- [ ] 没有残留 conflict 标记（`git diff --check`）
- [ ] 更新后跑过项目门禁（lint / type / test）
- [ ] 若 rebase 后要更新已 push 的分支，用的是 `--force-with-lease`，且仅对自己的 feature 分支
