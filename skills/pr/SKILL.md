---
name: pr
description: 打开一个 pull request 并把它推进到干净合并。当 commit 已干净、代码可供 review 时使用——检测 base branch、同步推送、撰写结构化 PR body、通过 gh 创建 PR；随后盯 CI、处理 review 反馈、解决冲突，全绿时 squash-merge。在 PR 合并或真正受阻之前不要交还控制权。不涉及 commit、code review 与发布事务。
---

# Pull Request：open & land

## Overview

你是作者。分支已提交、工作可供 review。本技能走完一个 PR 的两段人生——

- **Part A · Open**：把分支变成一个结构化的 pull request（检测 base、同步并推送、撰写 title/body、`gh` 创建）。
- **Part B · Land**：盯 CI、处理 review 反馈、保持可合并状态，全绿时 squash-merge，带它回家。

**核心原则：** PR 是一次 review 请求，不是工作的倾倒——title、body、diff 各自独立成章，reviewer 不读你的会话也应能理解这次改动。开了之后，agent 的职责是**坚持到底**：只要还有可处理的工作（待修的 CI 失败、待回的 comment、待解的冲突），就不交还控制权；仅当 PR 已合并、或某事真正卡住进度并需要人类决策时才停。

## When to Use

- 分支有干净的原子 commit，本地全套检查（测试、lint、类型检查）已通过。
- 改动已可供 review：没有调试打印、没有半成品切片、没有无关编辑。
- 你有一个目标 base branch（通常是 `main`），且目标是「把它合掉」。

## When NOT to Use

- 还不可 review 的在制品——继续迭代。
- 混入无关改动的 diff——先拆到各自的分支。
- 带 `WIP`、`fixup!` 或 `Phase N` 式 commit message 的分支——先理清历史。
- 只想对一个已打开的 PR 做一次性检查、不进持续循环——改用 `/harness-stack:pr-watch`。

---

# Part A — Open the PR

## Preflight

动手之前，确认工作树可发布：

```bash
git status                          # clean, on the feature branch
git log --oneline @{u}..HEAD 2>/dev/null || git log --oneline   # commits to publish
git diff --stat $(git merge-base HEAD origin/HEAD)..HEAD        # diff size sanity check
```

遇到以下情况，先停下并解决再继续：

- 工作树是脏的（有未提交改动）。
- 分支是 `main` / `master` / 或 base branch 本身——PR 需要一个 feature branch。
- commit 含有 `Co-Authored-By:` trailer、模型署名，或 `WIP` / `fixup!` 式的 subject。
- diff 捆绑了无关关注点——拆到各自的分支。

## Step 1 — Detect the base branch

别把 `main` 写死。动态检测：

```bash
BASE=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null \
       || git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@' \
       || echo main)
echo "base: $BASE"
```

若用户指定了不同的目标（例如某个 release 分支），改用那个。含糊时与用户确认——别在 `main` 和 `develop` 之间瞎猜。

## Step 2 — Sync with the base

确保 PR 反映的是当前 diff，而非陈旧的：

```bash
git fetch origin "$BASE"
git log --oneline "HEAD..origin/$BASE" | head   # commits on base that you don't have
```

若 base 已往前走，按项目约定 rebase 或 merge。默认：`git rebase origin/$BASE`。出现冲突就在推送前解决——别推一个无法干净合并的分支。**绝不 force-push 到共享分支**；只对你自己的 feature branch 做 force-push，且仅在 rebase 之后用 `--force-with-lease`（不是 `--force`）。

## Step 3 — Push the branch

```bash
BRANCH=$(git branch --show-current)
git push -u origin "$BRANCH"
# 若此前推送过且做了 rebase：
git push --force-with-lease origin "$BRANCH"
```

## Step 4 — Compose the PR title and body

**Title：** 简短、祈使、独立成句。规则同 commit subject——`Add task creation endpoint`，而非 `Adding...` 或 `[WIP] tasks`。不超过 70 个字符。title 里不放 issue 编号；放到 body 里。

**Body：** 用下面的模板。每一节都填入真实内容——别留占位符。

```markdown
## Summary

<2–4 句：这个 PR 改了什么、为什么。以用户可见或系统可见的结果起头，
而非实现细节。>

## Changes

- <每个逻辑改动一条。一个 commit 一条是不错的起点。>
- <按路径 / 编号交叉引用 design doc、spec 或 issue。>

## Test Plan

- [ ] <reviewer 或 CI 如何验证它能用>
- [ ] <覆盖了哪些 edge case>
- [ ] <手动步骤（若有：URL、命令、fixture）>

## Risks / Rollback

- <已知风险、迁移说明、feature-flag 状态，或「低风险：纯重构」>
- <回滚路径：revert commit、翻 flag、重跑 migration down>

## Linked Issues

- Closes #<n>  /  Refs #<n>  /  (none)

## Reviewer Focus  (optional)

- <值得额外审视的文件、模块或维度——并发、错误路径、状态机等。>
- <对小的或不言自明的 diff，省略此节。>

## Context not in the diff  (optional)

- <上游约束、先前决策、已知折衷、延后的后续项。>
- <reviewer 单看代码无法推断的东西。没什么可补就省略。>
```

按改动调整各节——纯文档 PR 不需要 Risks；迁移 PR 必须有。两个 `(optional)` 节在会沦为填充时可整节删除。别用占位内容凑节数。

**不带工具 / 模型署名。** 规则同 commit message：不要 `Co-Authored-By:`、不要 `Generated with ...`、不要 banner。PR 的作者字段已记录了 authorship。

## Step 5 — Create the PR

始终通过 stdin 配合 `--body-file -` 传入 body。绝不在 `--body` 里内联 `\n`——`gh` 不会展开它们，PR 会变成一长行。

```bash
gh pr create \
  --base "$BASE" \
  --head "$BRANCH" \
  --title "<title>" \
  --body-file - <<'EOF'
## Summary
...

## Changes
- ...

## Test Plan
- [ ] ...

## Risks / Rollback
- ...

## Linked Issues
- (none)
EOF
```

draft PR（早期反馈，尚不可 review）加 `--draft`。打开后回报 PR 编号与 URL、base ← head、draft/ready 状态。

## PR Size Guidance

阈值同 commit——见 [git/references/commit.md](../git/references/commit.md)：

| Diff 大小 | 动作 |
|---|---|
| ≤ ~300 行 | 照原样打开。 |
| ~300–800 行 | 若是一个带相关测试的逻辑改动则可接受。在 body 里点明范围。 |
| > ~1000 行 | 打开前先拆。叠 PR、把重构与 feature 分开，或按文件组拆。 |

例外：完整删除、lockfile 更新、自动化 codemod，这些 reviewer 验证的是意图而非逐行。在 body 里显式标注。

---

# Part B — Land it

一旦 PR 已打开且不是 draft、目标就是合并，进入推进循环。**坚持到底**：只在 PR 合并、或遇到 *Yield Conditions* 时才停。

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
   - 若 `mergeable == "CONFLICTING"` 或 `mergeStateStatus == "DIRTY"`：同步分支（rebase 见 [git/references/sync.md](../git/references/sync.md)，merge 见 [pull.md](../git/references/pull.md)），仅当历史是被刻意重写时才 force-push（[push.md](../git/references/push.md)）。
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
   | 推送被拒（auth / permission / policy） | 把错误呈上来。别掩盖——见 [git/references/push.md](../git/references/push.md)。 |
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

---

## Anti-Patterns

| 别做 | 为什么 |
|---|---|
| `--body` 里写字面 `\n` 而非真实换行 | `gh` 不展开它们，PR body 会变成一长行。用 `--body-file -`。 |
| force-push 到 `main` 或任何共享分支 | 无条件覆盖队友的 commit。只对自己的 feature branch 用 `--force-with-lease`。 |
| 捆绑无关改动（「auth 修复 + 依赖升级 + 新 feature」） | 让 review 无从聚焦。先拆分。 |
| 空的或只有模板的 PR body | reviewer 先读 body 才知道该聚焦哪里。 |
| 在没有 required checks 的 repo 里开 `gh pr merge --auto` | auto-merge 可能在 CI 还没开始就把 PR 落地。 |
| 用 `--merge` 而非 `--squash`（当 squash 是项目默认时） | 与项目历史策略不符。若 repo 偏好 merge commit 则相应调整。 |
| 回一句「好的会修」却始终不处理那条 comment | 接受了反馈就把活干了，或用一个后续引用明确延后。 |
| 在 PR 还有可处理工作时就把控制权交还用户 | 本技能的全部意义就在于推进到合并。只在受阻时才停。 |
| 在还有未处理的人类 review comment 时就合并 | 即便你不同意，合并前也要先确认。 |

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「diff 不言自明，body 我就省了。」 | reviewer 先读 body 才知道该聚焦哪里。空 body 浪费 reviewer 的时间。 |
| 「就一个 commit，不需要 Test Plan。」 | Test Plan 是给 reviewer 的，不是给你的。写清他们如何验证这次改动。 |
| 「base 显然就是 main。」 | 带 release 分支的 repo、monorepo 和 fork 让这变得不显然。检测，别假设。 |
| 「Co-Authored-By 是工具要求的。」 | 并不是。authorship 由 git 记录。打开前剥掉署名。 |
| 「review 期间我会 force-push 修复。」 | 只对自己的分支用 `--force-with-lease`，并在 PR 线程里告知 rebase。绝不 force-push base。 |

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

**Part A — opened：**

- [ ] 已检测分支、已检测 base，head 是一个 feature branch，并已与 base 同步。
- [ ] title 简短、祈使、独立、≤70 字符；body 经 `--body-file -` 填好（Summary / Changes / Test Plan / Risks-Rollback / Linked Issues）。
- [ ] title、body 或 commit 中没有 `Co-Authored-By`、模型或工具署名。
- [ ] 已返回 PR URL，并通过 `gh pr view` 确认可达。

**Part B — landed：**

- [ ] PR 在 base branch 上处于 `MERGED` 状态。
- [ ] 合并时 CI 为绿（不是在未受保护的 repo 里靠 auto-merge 绕过）。
- [ ] 无未处理的 review comment；合并前 PR title/body 已反映最终范围。
- [ ] head branch 已删除（或由 repo 设置自动删除）。
