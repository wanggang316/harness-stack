---
name: land
description: 把一个已打开的 PR 推进到干净合入 base branch。当 PR 已准备好合并、你需要盯 CI、处理 review 反馈、解决冲突、并在全绿时 squash-merge 时使用。在 PR 合并或真正受阻之前，不要把控制权交还给用户。
---

# Land

## Overview

`harness-stack:pr` 打开 PR；`harness-stack:land` 把它带回家。盯 CI、处理 review 反馈、保持可合并状态，然后 squash-merge。

agent 在这里的职责是**坚持到底**：只要还有可处理的工作（待修的 CI 失败、待回的 comment、待解的冲突），就不要交还控制权。仅当 PR 已合并、或某事真正卡住进度并需要人类决策时才停下。

## When to Use

- 你有一个已打开、非 draft、打算尽快合并的 PR。
- CI 正在跑、即将跑、或已跑完。
- reviewer 已给出或可能给出反馈。
- 目标是「把它合掉」，而不是「探索其它方案」。

若只想做一次性检查（不进持续循环），改用 `/harness-stack:pr-watch`。

## Preconditions

- `gh` CLI 已认证。
- 你处在该 PR 的 head branch 上（或手上有它的编号）。
- 本地工作树干净。
- 本地全套检查（测试、lint、类型检查）在 head commit 上已通过——本地全绿是个便宜的信号，意味着 CI 不该给你惊喜。

## Workflow

1. **定位 PR**

   ```bash
   gh pr view --json number,url,headRefOid,mergeable,mergeStateStatus,title,body
   ```

   若该分支没有对应的 PR，停下——先用 `harness-stack:pr` 开一个。

2. **预检**
   - 工作树干净。若不干净，用 `/harness-stack:commit` 提交待办改动。
   - 跑本地全套检查（按项目而定：`npm test`、`pytest`、`make check` 等）。本地有任何失败，先修再推——别让 CI 去逮 `make check` 本可逮到的问题。

3. **冲突检查**
   - 若 `mergeable == "CONFLICTING"` 或 `mergeStateStatus == "DIRTY"`：
     - 同步分支——按项目策略参见 [git/references/sync.md](../git/references/sync.md)（rebase）或 [pull.md](../git/references/pull.md)（merge）。
     - 仅当历史是被刻意重写时才 force-push（[push.md](../git/references/push.md)）。
   - 若 `mergeable == "UNKNOWN"`，稍候（10–30s）再查；GitHub 正在计算。

4. **并行盯 CI、review 与 head 漂移**

   PR 打开期间，有三个独立信号可能触发：
   - **CI checks 完成**——通过、失败、或仍在 pending。
   - **reviewer 留下反馈**——inline comment、顶层 comment，或带状态的 review。
   - **PR head 移动**——有人（或某个 bot）推了。

   以 ~10s 间隔轮询这三者，谁先触发就先响应谁。

5. **响应**

   | 信号 | 动作 |
   |---|---|
   | Mergeable `CONFLICTING` | 同步、解决、推送。回到 step 4。 |
   | Mergeable `UNKNOWN` | 等待，重查。 |
   | CI check 失败（真失败） | 拉日志，本地修，用 `/harness-stack:commit` 提交，推送，回到 step 4。 |
   | CI check 失败（flake——孤立超时、瞬态基础设施问题） | 重跑那个具体 job。重试通过即继续。 |
   | head 上出现 CI 自动 commit | 见下文「Auto-Commit on Head」。 |
   | 有未处理的 review comment | 交给 `harness-stack:review-receive`。在确认并（如需要）处理前别合并。 |
   | 推送被拒（auth / permission / policy） | 把错误呈上来。别掩盖——见 [git/references/push.md](../git/references/push.md)。 |
   | 所有 check 通过、无未处理反馈 | 合并（step 6）。 |

6. **Squash-merge**

   ```bash
   title=$(gh pr view --json title -q .title)
   body=$(gh pr view --json body -q .body)
   gh pr merge --squash --subject "$title" --body "$body"
   ```

   - 用 PR *当前*的 title/body 作为 merge 的 subject/body。若范围有变，在 step 5 刷新它们。
   - 在没有 required checks 的 repo 里别开 `--auto`（auto-merge）——auto-merge 可能在 CI 跑之前就落地。
   - 若 repo 不会在合并时自动删除 head branch，手动删掉该分支。

## Review-Feedback Handling

在为某条 comment 改代码之前：

1. **上下文护栏。** 确认该反馈不与用户对本次改动的既定意图冲突。若冲突，先在 inline 里附理由回复并询问用户，再改代码。
2. **逐条 comment 选定模式。** 在推送改动*之前*于 inline 回复中表明：
   - **Accept**——会修，方案如下。
   - **Clarify**——需要更多信息，你具体指的是什么？
   - **Push back**——不同意，理由如下，并提出替代方案。
3. **分类。** correctness / design / style / clarification / scope。
   - correctness 必须处理，或用具体验证（测试、日志、推理）反驳。
   - design / style / clarification 可以延后——明确说明并附理由。
4. **先回复再改动。** 推送代码前始终先表明打算做什么。这比「force-pushed；这是 10 个新 commit」更便于 reviewer 跟进。
5. **批量修复。** 一批修复之后一条汇总的「review addressed」comment，胜过十条零碎回复。

完整深度：`harness-stack:review-receive`。

## CI Failure Handling

- **先拉日志。** 概览用 `gh pr checks`，细节用 `gh run view <run-id> --log`。
- 可能的话**本地复现**。本地复现是个便宜的信号，能证明你的修复真的修好了。
- **flaky 还是真失败。** 单平台、不复现的超时大概率是 flaky——重跑那个 job。本地能复现的失败断言是真失败。用判断力；别无限自动重试。
- **merge commit 上的 lockfile / 依赖同步错误**（例如 pnpm 报 lockfile 损坏）：通常的补救是 fetch 最新的 `origin/<base>`、同步、推送、重跑 CI。
- **别用 `--no-verify` 或跳过 job** 来让 CI 通过。修 root cause。

## Auto-Commit on Head

有些 CI 配置会把修复推回 PR（formatter、codegen、auto-changelog）。这些 commit 通常由某个 bot 账号署名，而**部分 CI 提供方不会对 bot 署名的推送重新触发新一轮运行**。

若 head 移动、且新 commit 是 bot 署名的：

1. 把 bot commit 拉到本地。
2. 若 `origin/<base>` 也动了，做同步（rebase 或 merge）。
3. 加一个真实作者署名的 commit（有时一个空操作的 `--allow-empty` 就够——但更建议一个有意义的 commit）来重新触发 CI。
4. 若同步步骤重写了历史，用 `git push --force-with-lease`，否则普通 push。
5. 继续盯。

若 head 是因你自己早前的推送而移动：无需特殊处理，继续盯即可。

## Anti-Patterns

| 别做 | 为什么 |
|---|---|
| 在没有 required checks 的 repo 里开 `gh pr merge --auto` | auto-merge 可能在 CI 还没开始就把 PR 落地。 |
| 用 `gh pr merge --merge` 而非 `--squash`（当 squash 是项目默认时） | 与项目的历史策略不符。若你的 repo 偏好 merge commit，则相应调整。 |
| 用 `git push --force`（裸的）来重触发 CI | 会无条件覆盖队友的 commit。用 `--force-with-lease`，且仅在历史被刻意重写时。 |
| 回一句「好的会修」却始终不处理那条 comment | 若你接受了反馈，就把活干了，或用一个后续引用明确延后。 |
| 不先核对就实现与用户意图冲突的 review 反馈 | reviewer 未必了解用户的上下文。该 push back 时就 push back。 |
| 在 PR 还有可处理工作时就把控制权交还用户 | `harness-stack:land` 的全部意义就在于推进到合并。只在受阻时才停。 |
| 在还有未处理的人类 review comment 时就合并 | 即便你不同意，合并前也要先确认。 |

## Yield Conditions

在以下情况停下并呈给用户：

- 冲突需要产品层面的决策（API 形状变更、schema 迁移、数据丢失风险）。
- review 反馈与用户意图相悖，正确取舍不明朗。
- 推送因 auth / permission / policy 原因被拒（别掩盖）。
- 一次修复尝试后，CI 仍以同一错误反复失败——root cause 不明。
- 人类 reviewer 请求变更却没有具体的 inline comment——需要问清他们想要什么。
- PR 已打开足够久，范围或 base branch 已明显漂移。
- 某项必需的改动只能在 base branch 上做（例如为整个 repo 升级一个依赖）。

否则：继续推进。

## Verification

- [ ] PR 在 base branch 上处于 `MERGED` 状态
- [ ] 合并时 CI 为绿（不是在未受保护的 repo 里靠 auto-merge 绕过）
- [ ] 无未处理的 review comment
- [ ] 合并前 PR title/body 已反映最终范围
- [ ] head branch 已删除（或由 repo 设置自动删除）

## Future Work

一个并行 watcher 脚本（用 asyncio 轮询 CI + reviews + head SHA，每个信号有不同的退出码）可以把 step 4 机械化。前人之作见 `raw/symphony/.codex/skills/land/land_watch.py`。v1 未随附；上面的 workflow 即可执行的 spec。
