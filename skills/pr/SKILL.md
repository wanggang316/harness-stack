---
name: pr
description: 从一个就绪的 feature branch 打开一个 pull request。当 commit 已干净、代码已可供 review 时使用——它检测 base branch、同步、推送、撰写结构化的 PR body，并通过 gh 创建 PR。不涉及 commit、review 与发布相关事务。
---

# Open a Pull Request

## Overview

你是作者。你的分支已提交，工作已可供 review。本技能把那个分支变成一个 pull request——检测 base branch、同步并推送分支、撰写 title 与 body、通过 `gh` 打开 PR。仅此而已。

**核心原则：** PR 是一次 review 请求，不是工作的倾倒。title、body 和 diff 各自独立成章——reviewer 不读你的会话也应能理解这次改动。

## Scope

打开 PR，仅此而已。commit、CHANGELOG、code review 和部署都不在范围内。

## When to Use

- 分支有干净的原子 commit，本地测试通过。
- 改动已可供 review：没有调试打印、没有半成品切片、没有无关编辑。
- 你有一个目标 base branch（通常是 `main`）。

## When NOT to Use

- 还不可 review 的在制品——继续迭代。
- 混入无关改动的 diff——先拆到各自的分支。
- 带 `WIP`、`fixup!` 或 `Phase 1` 式 commit message 的分支——先理清历史。

## Preflight Checks

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

## The Process

### Step 1: Detect the base branch

别把 `main` 写死。动态检测：

```bash
# Default branch of the remote
BASE=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null \
       || git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@' \
       || echo main)
echo "base: $BASE"
```

若用户指定了不同的目标（例如某个 release 分支），改用那个。含糊时与用户确认——别在 `main` 和 `develop` 之间瞎猜。

### Step 2: Sync with the base

确保 PR 反映的是当前 diff，而非陈旧的：

```bash
git fetch origin "$BASE"
git log --oneline "HEAD..origin/$BASE" | head   # commits on base that you don't have
```

若 base 已往前走，按项目约定 rebase 或 merge。默认：`git rebase origin/$BASE`。若出现冲突，推送前先解决——别推一个无法干净合并的分支。

绝不 force-push 到共享分支。只对你自己的 feature branch 做 force-push，且仅在 rebase 之后。

### Step 3: Push the branch

```bash
BRANCH=$(git branch --show-current)
git push -u origin "$BRANCH"
```

若已有过推送、且你做了 rebase，用 `--force-with-lease`（不是 `--force`）：

```bash
git push --force-with-lease origin "$BRANCH"
```

### Step 4: Compose the PR title and body

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

### Step 5: Create the PR

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

draft PR（早期反馈，尚不可 review）加 `--draft`。

### Step 6: Verify and report

```bash
gh pr view --json number,url,title,state,isDraft,headRefName,baseRefName
```

回报：

- PR 编号与 URL
- base ← head 分支
- draft / ready 状态
- 一行概述打开了什么

## PR Size Guidance

阈值同 commit——见 [git/references/commit.md](../git/references/commit.md)：

| Diff 大小 | 动作 |
|---|---|
| ≤ ~300 行 | 照原样打开。 |
| ~300–800 行 | 若是一个带相关测试的逻辑改动则可接受。在 body 里点明范围。 |
| > ~1000 行 | 打开前先拆。叠 PR、把重构与 feature 分开，或按文件组拆。 |

例外：完整删除、lockfile 更新、自动化 codemod，这些 reviewer 验证的是意图而非逐行。在 body 里显式标注。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「diff 不言自明，body 我就省了。」 | reviewer 先读 body 才知道该聚焦哪里。空 body 浪费 reviewer 的时间。 |
| 「等 review 开始我再写描述。」 | reviewer 会以开局那一刻看到的内容为锚。打开前就把 body 写好。 |
| 「就一个 commit，不需要 Test Plan。」 | Test Plan 是给 reviewer 的，不是给你的。写清他们如何验证这次改动。 |
| 「review 期间我会 force-push 修复。」 | 只对你自己的分支用 `--force-with-lease`，并在 PR 线程里告知 rebase。绝不 force-push base。 |
| 「base 显然就是 main。」 | 带 release 分支的 repo、monorepo 和 fork 让这变得不显然。检测，别假设。 |
| 「Co-Authored-By 是工具要求的。」 | 并不是。authorship 由 git 记录。打开前剥掉署名。 |

## Red Flags

- 打开的 PR 在 title 或 commit 历史里带 `WIP`、`fixup!` 或 `Phase N`。
- `--body` 里是字面 `\n` 而非真实换行（用 `--body-file -`）。
- force-push 到 `main` 或任何共享分支。
- 捆绑无关改动（「auth 修复 + 依赖升级 + 新 feature」）。
- 空的或只有模板的 PR body。
- 分支未与 base 同步——diff 包含 base 上已有的 commit。
- PR 打到了错误的 base（例如团队用 `develop` 时却打到 `main`）。

## Verification

在回报 PR 已打开之前：

- [ ] 已检测分支、已检测 base，head 是一个 feature branch。
- [ ] 分支已与 base 同步（rebase 或 merge）。
- [ ] 本地测试通过；commit 是原子的、按约定格式书写。
- [ ] title 简短、祈使、独立；不超过 70 字符。
- [ ] body 通过 `--body-file -` 填写：Summary、Changes、Test Plan、Risks/Rollback、Linked Issues；可选的 Reviewer Focus 与 Context-not-in-the-diff 仅在能提供信号时纳入。
- [ ] title、body 或 commit 中没有 `Co-Authored-By`、模型或工具署名。
- [ ] 已返回 PR URL，并通过 `gh pr view` 确认可达。
