---
name: git
description: 规范 git 工作流实践。任何代码改动都适用。在提交、开分支、解决冲突，或需要把多条并行工作线组织起来时使用。
---

# Git Workflow and Versioning

## Overview

Git 是安全网。commit 是存档点，branch 是沙盒，history 是文档。当 agent 飞快地产出代码时，正是这套有纪律的版本控制让改动始终可审、可回退。

本技能讲的是**心法**——原则、约定、反模式。操作层面的细节（如何 commit、sync、pull、push）放在 `references/` 里。日常入口是 slash command `/harness-stack:commit` 和 `/harness-stack:git-sync`。

## When to Use

始终适用。每一次代码改动都流经 git。

## Core Principles

### Trunk-Based Development

让 `main` 始终可部署。在短命的 feature branch 上干活，1–3 天内 merge 回去。长命分支会累积 merge 风险；与其把未完成的工作在分支上搁好几周，不如用 feature flag。

```
main ──●──●──●──●──●──●──●──●──●──   (always deployable)
        ╲      ╱  ╲    ╱
         ●──●─╱    ●──╱              (short-lived feature branches)
```

release branch 在 main 继续前进、同时需要稳定某个发布时是可以接受的；其余一切都应尽快落地。

### Commit Early, Atomic, Concerns Separate

- 一个切片 → 一个 commit。不要攒下大量未提交的改动。
- 每个 commit 只做一件逻辑上的事。把 refactor + feature 混在一起，或把格式调整 + 行为变更混在一起，会让 review 和 revert 都更难。
- 别指望事后再 squash「收拾干净」——一边写就一边产出干净的 commit。

消息格式、拆分策略、提交前自检都在 [references/commit.md](references/commit.md)。

### Size Your Changes

| Diff 规模 | 处理 |
|---|---|
| ≤ ~100 行 | 好。一坐下就能审完。 |
| ~100–300 行 | 单个带测试的逻辑改动可以接受。 |
| > ~1000 行 | 太大了。拆开。 |

例外：完整删除、自动化 codemod、lockfile 更新——这些情况下审阅者核对的是意图，不是逐行。

### Save Point Pattern

```
implement slice → test → verify → commit → next slice
```

某个切片做坏了，`git reset --hard HEAD` 就能退回上一个已知良好的状态。永远不会损失超过一个增量。

### Worktrees for Parallel Work

```bash
git worktree add ../project-feature-a feature/task-creation
git worktree add ../project-feature-b feature/user-settings
git worktree remove ../project-feature-a   # when done
```

每个 worktree 是一个隔离的 checkout——agent 可以并行干活，无需来回切分支。某次试验失败了，删掉 worktree，什么都不丢。每个 worktree 的运行时隔离见 `harness-stack:env-init`。

### Branch Naming

```
feature/<short-description>
fix/<short-description>
chore/<short-description>
refactor/<short-description>
```

merge 之后删掉分支。有些仓库在 PR merge 时会自动删除 head 分支——别跟它对着干。

## References

| 操作 | 参考 | Slash command |
|---|---|---|
| 创建一个 commit | [references/commit.md](references/commit.md) | `/harness-stack:commit` |
| 同步（rebase + push） | [references/sync.md](references/sync.md) | `/harness-stack:git-sync` |
| Pull / merge 更新分支 | [references/pull.md](references/pull.md) | — |
| Push 语义 | [references/push.md](references/push.md) | — |

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「等 feature 做完我再 commit。」 | 一个巨型 commit 没法 review、没法 debug、没法 revert。每个切片都提交。 |
| 「消息无所谓。」 | 消息就是文档。未来的 agent 需要它们。 |
| 「我之后会全 squash 掉。」 | squash 会摧毁开发叙事。从一开始就写干净的 commit。 |
| 「分支增加开销。」 | 短命分支是免费的；长命分支才是代价。 |
| 「这个改动我之后再拆。」 | 大改动风险更高、更难 revert。提交前先拆。 |
| 「直接 `--force`，更快。」 | `--force` 会无条件覆盖队友的工作。只有在 history 是被有意重写时才用 `--force-with-lease`。 |
| 「认证失败——我改一下 remote URL 吧。」 | 这是遮掩，不是修复。把认证错误暴露出来，别糊弄过去。 |

## Red Flags

- 大量未提交的改动在累积
- commit 消息像 `fix`、`update`、`wip`、`misc` 这样
- 格式调整和行为变更混在一起
- 长命分支与 main 越分越远
- 未经授权就向共享分支 force-push
- commit 消息里带 `Co-Authored-By` / 模型 / 工具的署名 trailer
- 为绕开认证或权限错误而改写 remote URL
- 用 `git rebase --skip` 来躲 conflict（会悄悄丢掉一个 commit）
- 在 merge conflict 里手改生成文件，而不是重新生成
