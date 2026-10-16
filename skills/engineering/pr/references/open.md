# Open the PR

把一个就绪的 feature branch 变成一个结构化的 pull request：检测 base、同步并推送、撰写 title/body、通过 `gh` 创建。

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

阈值同 commit——见 [git/references/commit.md](../../git/references/commit.md)：

| Diff 大小 | 动作 |
|---|---|
| ≤ ~300 行 | 照原样打开。 |
| ~300–800 行 | 若是一个带相关测试的逻辑改动则可接受。在 body 里点明范围。 |
| > ~1000 行 | 打开前先拆。叠 PR、把重构与 feature 分开，或按文件组拆。 |

例外：完整删除、lockfile 更新、自动化 codemod，这些 reviewer 验证的是意图而非逐行。在 body 里显式标注。

## Anti-Patterns

| 别做 | 为什么 |
|---|---|
| `--body` 里写字面 `\n` 而非真实换行 | `gh` 不展开它们，PR body 会变成一长行。用 `--body-file -`。 |
| force-push 到 `main` 或任何共享分支 | 无条件覆盖队友的 commit。只对自己的 feature branch 用 `--force-with-lease`。 |
| 捆绑无关改动（「auth 修复 + 依赖升级 + 新 feature」） | 让 review 无从聚焦。先拆分。 |
| 空的或只有模板的 PR body | reviewer 先读 body 才知道该聚焦哪里。 |
| 打到错误的 base（团队用 `develop` 却打到 `main`） | 检测 base，别假设。 |

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「diff 不言自明，body 我就省了。」 | reviewer 先读 body 才知道该聚焦哪里。空 body 浪费 reviewer 的时间。 |
| 「就一个 commit，不需要 Test Plan。」 | Test Plan 是给 reviewer 的，不是给你的。写清他们如何验证这次改动。 |
| 「base 显然就是 main。」 | 带 release 分支的 repo、monorepo 和 fork 让这变得不显然。检测，别假设。 |
| 「Co-Authored-By 是工具要求的。」 | 并不是。authorship 由 git 记录。打开前剥掉署名。 |

## Verification

- [ ] 已检测分支、已检测 base，head 是一个 feature branch，并已与 base 同步。
- [ ] title 简短、祈使、独立、≤70 字符；body 经 `--body-file -` 填好（Summary / Changes / Test Plan / Risks-Rollback / Linked Issues）。
- [ ] title、body 或 commit 中没有 `Co-Authored-By`、模型或工具署名。
- [ ] 已返回 PR URL，并通过 `gh pr view` 确认可达。
