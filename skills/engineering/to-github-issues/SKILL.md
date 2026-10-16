---
name: to-github-issues
description: 把一份 plan、spec、已有 Issue 或当前会话拆成一组 tracer-bullet 式的 GitHub Issue，每条声明自己的 blocking 关系，并用 GitHub 原生的 blocked-by 与 sub-issue 关系发布。零配置、不侵入工程：不在仓库里写任何文件、不要求预先 setup、不擅自创建 label。在一项工作跨越多个会话、需要拆成可并行认领的 Issue 时使用。
disable-model-invocation: true
---

# to-github-issues：拆成 GitHub Issue

## Overview

把一份计划拆成一组 **Issue**：每条是一个 tracer-bullet 式的纵向切片，并声明哪些 Issue **block** 它。产物只落在 GitHub 上，blocking 关系用 GitHub 原生的 dependency（blocked-by）与 sub-issue 关系表达，而不是只写在正文里。

**不侵入工程**是本 skill 的硬约束：

- **零配置**：不需要 setup 步骤，不读也不写任何本 skill 专属的配置文件。目标仓库从 `gh` 当前上下文解析。
- **不写仓库**：不在工作区创建任何文件（没有 `.scratch/`、没有本地 ticket 文件、不改 `AGENTS.md` / `docs/`）。草稿只存在于会话里；`gh` 需要的 body 文件放进仓库之外的临时目录。
- **不改仓库元数据**：只使用仓库**已有**的 label、milestone、assignee；缺少时不擅自创建，提示用户自行决定。
- **不改已有 Issue**：来源是已有 Issue 时，只把新 Issue 挂为它的 sub-issue；绝不改写、关闭或重新打 label 父 Issue。

## When to Use

- 一项工作需要多个会话完成，想拆成可独立认领、可并行推进的 Issue。
- 计划只存在于当前会话里，从没写成文档——直接从会话拆。
- 已有一个 spec Issue（`#123` 或 URL），想把它拆成子 Issue。

**Don't use when**：

- 整个改动一个上下文窗口就能做完——直接实现（`harness-stack:tdd`），不要拆。
- 方向还没定——先讨论清楚（`harness-stack:decide` / `harness-stack:debate`），再拆。
- 目标不是 GitHub（Linear、Jira、本地文件）——本 skill 只发布到 GitHub。

## Process

### Step 1: Resolve the target

先确认环境，任何一项不满足就停下告诉用户，不要绕过：

```bash
gh auth status
repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"   # or the repo the user named
gh label list --repo "$repo" --limit 200 --json name -q '.[].name'
```

- 用户在参数里指定了仓库就用它；否则用当前目录对应的 GitHub 仓库。解析不出来就问，不要猜。
- 记下已有的 label 列表，Step 5 只从中挑选。

### Step 2: Gather context

以会话中已有的内容为准。用户传入了引用时，读全它：

- Issue 编号或 URL → `gh issue view <n> --repo "$repo" --comments`，读完正文与全部评论。它就是本次的 **parent**。
- 文件路径 → 读整个文件。

### Step 3: Explore the codebase（按需）

如果还没读过相关代码，先读，弄清现状。Issue 的标题与描述使用项目已有的领域词汇；仓库里若有架构文档或 ADR，尊重它们——但只读，不要求它们存在，也不补写它们。

找 prefactor 的机会：「先让改动变容易，再做容易的改动」。prefactor 排在最前。

### Step 4: Draft vertical slices

把工作拆成 **tracer bullet** 式的 Issue：

- 每个切片是一条窄而**完整**的路径，贯穿所有层（schema、API、UI、测试）——纵向切，**不要**按层横切。
- 每个切片完成后可以独立演示或验证。判据：「这条做完，我能演示什么？」答不出来的就是横切。
- 每个切片的大小放得进一个全新的上下文窗口——认领它的会话从没见过你的计划。
- 每条 Issue 给出它的 **blocking 边**：必须先完成的其他 Issue。没有 blocker 的可以立即开工。

**大范围重构是纵切的例外。** 一个机械改动（改列名、改共享类型）牵连整个代码库、单次改动就会打断大量调用点时，按 **expand–contract** 排序：

1. **Expand**：新形式与旧形式并存，什么都不破坏。
2. **Migrate**：按影响面分批迁移调用点（按包、按目录），每批一条 Issue，都被 expand block。旧形式仍在，CI 每批保持绿色。
3. **Contract**：没有调用方后删掉旧形式，这条被所有 migrate 批次 block。

连单批都无法独立保持绿色时，保留这个顺序，让各批共用一个集成分支，并都 block 一条最终的 integrate-and-verify Issue；只承诺它是绿的。

验收标准必须**能失败**：对每条标准，说出什么观察能证明它不成立，并确认它在开工时的 commit 上确实不成立。已经成立的、只能靠别的 Issue 满足的、只是复述需求的标准，都要改写。

### Step 5: Confirm with the user

发布是对外动作。先把拆分以编号列表呈现，每条包含：

- **Title**：简短的描述性标题
- **Blocked by**：依赖哪几条（编号），或「None」
- **What it delivers**：这条打通的端到端行为
- **Labels**：从 Step 1 的已有 label 中挑选（可为空）

然后问：

- 粒度合适吗？（太粗 / 太细）
- blocking 边对吗？每条只依赖真正卡住它的 Issue 吗？
- 有没有该合并或再拆的？
- 想用的 label 仓库里没有时，列出来让用户决定：用户自己创建，或者不打。

反复迭代，直到用户明确同意。**未经同意不发布任何 Issue。**

### Step 6: Publish

按依赖顺序（blocker 在前）逐条创建，这样每条创建时它的 blocker 已经有真实的编号。body 文件写到仓库之外的临时目录：

```bash
tmp="$(mktemp -d)"   # outside the working tree; never write drafts into the repo

cat > "$tmp/01.md" <<'EOF'
<body from the template below>
EOF
url="$(gh issue create --repo "$repo" --title "<title>" --body-file "$tmp/01.md" [--label <existing-label>])"
n="${url##*/}"
```

每条创建后，立即建立原生关系（`gh api` 在所有 `gh` 版本上可用）：

```bash
issue_id() { gh api "repos/$repo/issues/$1" --jq .id; }   # REST id, not the #number

# For each blocker b of issue n:
gh api -X POST "repos/$repo/issues/$n/dependencies/blocked_by" -F issue_id="$(issue_id "$b")"

# When the source was an existing issue p:
gh api -X POST "repos/$repo/issues/$p/sub_issues" -F sub_issue_id="$(issue_id "$n")"
```

- 两个接口都要的是 Issue 的 REST `id`，不是 `#number`。
- 某个关系接口失败（例如 GitHub Enterprise Server 未开放该功能）时，不要中断：body 里的 Blocked by 段已经记录了依赖。继续发布，并在最后报告哪些关系没能建立。
- 一条 Issue 创建失败时停下，报告已经创建的 Issue，不要重复创建。
- 完成后 `rm -rf "$tmp"`。

<issue-template>

## Parent

#<parent number>（来源是已有 Issue 时填写，否则删掉本节）

## What to build

这条打通的端到端行为，从用户视角描述，不是逐层的实现清单。

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- #<blocker number>，或 "None (can start immediately)"

</issue-template>

body 自包含：认领者不读你的会话也能动手。不要写具体文件路径或代码片段——它们很快过时。例外：原型产出的片段比文字更精确地表达了某个决策（状态机、reducer、schema、类型形状）时，内联它，只保留承载决策的部分，并注明来自原型。

### Step 7: Report

把结果交给用户：

- 按依赖顺序列出每条 Issue 的编号、标题、URL 与 blocker。
- 标出当前的 **frontier**：所有 blocker 都已完成、可以立即认领的 Issue。
- 列出没能建立的原生关系（如有）。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「先在仓库里建个 `.scratch/` 存草稿，方便。」 | 违反不侵入原则。草稿留在会话里，body 文件放仓库外的临时目录。 |
| 「这个 label 不存在，顺手建一个。」 | label 是仓库的公共词汇，不归本 skill 管。列出来让用户决定。 |
| 「Blocked by 写进正文就够了。」 | 正文只是可读副本。GitHub 有原生 blocked-by 与 sub-issue 关系，能让看板据此算出 frontier。 |
| 「拆细一点总没错。」 | 过度拆分是最常见的失败：丢了让各切片有意义的分组。整件事一个上下文窗口能做完就别拆。 |
| 「按层拆更清楚：一条 schema、一条 API、一条 UI。」 | 横切的每条都无法独立验证，验收标准会伸进别的 Issue。按「能演示什么」纵切。 |
| 「用户大概会同意，直接发了。」 | 发布 Issue 是对外、公开的动作。Step 5 不可跳过。 |
| 「顺便把父 Issue 的描述更新一下。」 | 不改已有 Issue。只把新 Issue 挂成它的 sub-issue。 |

## Red Flags

- 在工作区里创建了任何文件
- 未经用户同意创建了 label、milestone 或 Issue
- 修改、关闭或重新打 label 父 Issue
- 某条 Issue 答不出「做完能演示什么」
- 验收标准在开工时就已经成立
- 依赖只写在正文里，没有尝试原生关系
- 把 `#number` 当成 `issue_id` / `sub_issue_id` 传给 REST 接口

## Verification

- [ ] 目标仓库已确认，`gh auth status` 通过
- [ ] 每条 Issue 都是纵向切片，能说出做完后演示什么
- [ ] prefactor（如有）排在最前
- [ ] 发布前已取得用户对拆分的明确同意
- [ ] 按 blocker 在前的顺序创建，每条的 Blocked by 引用真实编号
- [ ] 原生 blocked-by 关系已建立；来源是已有 Issue 时，sub-issue 关系已建立；失败项已报告
- [ ] 工作区没有新增或修改任何文件（`git status` 无变化）
- [ ] 已把 Issue 列表、URL 与当前 frontier 交给用户
