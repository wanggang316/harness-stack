# Land the PR

一旦 PR 已打开且不是 draft、目标就是合并，进入推进循环：盯 CI、处理 review 反馈、保持可合并状态，全绿时 squash-merge。**坚持到底**——只在 PR 合并、或遇到 *Yield Conditions* 时才停。

## Preconditions

- `gh` CLI 已认证。
- 你处在该 PR 的 head branch 上（或手上有它的编号）。
- 本地工作树干净，本地全套检查在 head commit 上已通过——本地全绿是个便宜的信号，意味着 CI 不该给你惊喜。

## Workflow

1. **定位 PR**

   ```bash
   gh pr view --json number,url,headRefOid,mergeable,mergeStateStatus,title,body
   ```

2. **冲突检查**
   - 若 `mergeable == "CONFLICTING"` 或 `mergeStateStatus == "DIRTY"`：同步分支（rebase 见 [git/references/sync.md](../../git/references/sync.md)，merge 见 [pull.md](../../git/references/pull.md)），仅当历史是被刻意重写时才 force-push（[push.md](../../git/references/push.md)）。
   - 若 `mergeable == "UNKNOWN"`，稍候（10–30s）再查；GitHub 正在计算。

3. **并行盯 CI、review 与 head 漂移**

   PR 打开期间有三个独立信号：**CI checks 完成**（通过 / 失败 / pending）、**reviewer 留下反馈**（inline / 顶层 comment / 带状态的 review）、**PR head 移动**（有人或 bot 推了）。以 ~10s 间隔轮询这三者，谁先触发就先响应谁。

4. **响应**

   | 信号 | 动作 |
   |---|---|
   | Mergeable `CONFLICTING` | 同步、解决、推送。回到 step 3。 |
   | Mergeable `UNKNOWN` | 等待，重查。 |
   | CI check 失败（真失败） | 拉日志，本地修，用 `/harness-stack:commit` 提交，推送，回到 step 3。 |
   | CI check 失败（flake——孤立超时、瞬态基础设施问题） | 重跑那个具体 job。重试通过即继续。 |
   | head 上出现 CI 自动 commit | 见下文「Auto-Commit on Head」。 |
   | 有未处理的 review comment | 交给 `harness-stack:review-receive`。在确认并（如需要）处理前别合并。 |
   | 推送被拒（auth / permission / policy） | 把错误呈上来。别掩盖——见 [push.md](../../git/references/push.md)。 |
   | 所有 check 通过、无未处理反馈 | 合并（step 5）。 |

5. **Squash-merge**

   ```bash
   title=$(gh pr view --json title -q .title)
   body=$(gh pr view --json body -q .body)
   gh pr merge --squash --subject "$title" --body "$body"
   ```

   - 用 PR *当前*的 title/body 作为 merge 的 subject/body。若范围有变，先在 step 4 刷新它们。
   - 在没有 required checks 的 repo 里别开 `--auto`（auto-merge）——它可能在 CI 跑之前就落地。
   - 若 repo 不会在合并时自动删除 head branch，手动删掉该分支。

## Review-Feedback Handling

在为某条 comment 改代码之前：

1. **上下文护栏。** 确认该反馈不与用户对本次改动的既定意图冲突。若冲突，先在 inline 里附理由回复并询问用户，再改代码。
2. **逐条 comment 选定模式**（推送改动*之前*于 inline 回复中表明）：**Accept**（会修，方案如下）/ **Clarify**（需要更多信息）/ **Push back**（不同意，理由 + 替代方案）。
3. **分类。** correctness / design / style / clarification / scope。correctness 必须处理，或用具体验证反驳；design / style / clarification 可延后——明确说明并附理由。
4. **先回复再改动。** 推送代码前始终先表明打算做什么——这比「force-pushed；这是 10 个新 commit」更便于 reviewer 跟进。
5. **批量修复。** 一批修复之后一条汇总的「review addressed」comment，胜过十条零碎回复。

完整深度：`harness-stack:review-receive`。

## CI Failure Handling

- **先拉日志。** 概览用 `gh pr checks`，细节用 `gh run view <run-id> --log`。
- 可能的话**本地复现**——这是个便宜的信号，能证明你的修复真的修好了。
- **flaky 还是真失败。** 单平台、不复现的超时大概率是 flaky——重跑那个 job。本地能复现的失败断言是真失败。用判断力；别无限自动重试。
- **merge commit 上的 lockfile / 依赖同步错误**（例如 pnpm 报 lockfile 损坏）：通常的补救是 fetch 最新的 `origin/<base>`、同步、推送、重跑 CI。
- **别用 `--no-verify` 或跳过 job** 来让 CI 通过。修 root cause。

## Auto-Commit on Head

有些 CI 配置会把修复推回 PR（formatter、codegen、auto-changelog）。这些 commit 通常由某个 bot 账号署名，而**部分 CI 提供方不会对 bot 署名的推送重新触发新一轮运行**。

若 head 移动、且新 commit 是 bot 署名的：拉到本地 → 若 `origin/<base>` 也动了则同步 → 加一个真实作者署名的 commit（必要时 `--allow-empty`，但更建议有意义的 commit）来重新触发 CI → 若同步重写了历史用 `--force-with-lease` 否则普通 push → 继续盯。若 head 是因你自己早前的推送而移动，无需特殊处理。

## Anti-Patterns

| 别做 | 为什么 |
|---|---|
| 在没有 required checks 的 repo 里开 `gh pr merge --auto` | auto-merge 可能在 CI 还没开始就把 PR 落地。 |
| 用 `--merge` 而非 `--squash`（当 squash 是项目默认时） | 与项目历史策略不符。若 repo 偏好 merge commit 则相应调整。 |
| 回一句「好的会修」却始终不处理那条 comment | 接受了反馈就把活干了，或用一个后续引用明确延后。 |
| 在 PR 还有可处理工作时就把控制权交还用户 | 本技能的全部意义就在于推进到合并。只在受阻时才停。 |
| 在还有未处理的人类 review comment 时就合并 | 即便你不同意，合并前也要先确认。 |
| review 期间裸 `--force` 重触发 CI | 用 `--force-with-lease`，且仅对自己的分支；在 PR 线程里告知 rebase。 |

## Yield Conditions

在以下情况停下并呈给用户：

- 冲突需要产品层面的决策（API 形状变更、schema 迁移、数据丢失风险）。
- review 反馈与用户意图相悖，正确取舍不明朗。
- 推送因 auth / permission / policy 原因被拒（别掩盖）。
- 一次修复尝试后，CI 仍以同一错误反复失败——root cause 不明。
- 人类 reviewer 请求变更却没有具体的 inline comment——需要问清他们想要什么。
- 某项必需的改动只能在 base branch 上做（例如为整个 repo 升级一个依赖）。

否则：继续推进。

## Verification

- [ ] PR 在 base branch 上处于 `MERGED` 状态。
- [ ] 合并时 CI 为绿（不是在未受保护的 repo 里靠 auto-merge 绕过）。
- [ ] 无未处理的 review comment；合并前 PR title/body 已反映最终范围。
- [ ] head branch 已删除（或由 repo 设置自动删除）。
