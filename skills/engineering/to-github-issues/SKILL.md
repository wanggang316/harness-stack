---
name: to-github-issues
description: 把一份 plan、spec、已有 Issue 或当前会话拆成一组 tracer-bullet 式的 GitHub Issue，用 GitHub 原生的 blocked-by 与 sub-issue 关系发布。
disable-model-invocation: true
---

# to-github-issues

把一份计划拆成一组 **Issue**：每条是一个 tracer-bullet 式的纵向切片，并声明哪些 Issue **block** 它。

## 1. Resolve the target

读项目配置 `~/.harness-stack/<project>/`（`<project>` 是 `origin` 的 `<owner>.<repo>`）：

- `issue-tracker.md` 给出目标仓库；不存在时用 `origin` 对应的仓库。用户指定了仓库时以用户为准。
- `triage-labels.md` 给出 triage 角色对应的 label；不存在时不打 triage label。

确认 `gh` 已登录，并记下目标仓库已有的 label。只使用已有的 label；想用的 label 不存在时，在第 5 步列出来让用户决定。

## 2. Gather context

以会话中已有的内容为准。用户传入 Issue 编号或 URL 时，`gh issue view <n> --repo "$repo" --comments` 读全正文与评论，它就是 **parent**；传入文件路径时读整个文件。

## 3. Explore the codebase（按需）

还没读过相关代码就先读。标题与描述使用项目已有的领域词汇。找 prefactor 的机会：「先让改动变容易，再做容易的改动」。

## 4. Draft vertical slices

- 每个切片是一条窄而完整的路径，贯穿所有层（schema、API、UI、测试），完成后可以独立演示或验证。
- 每个切片的大小放得进一个全新的上下文窗口。
- prefactor 排在最前。
- 每条给出它的 **blocking 边**：必须先完成的其他 Issue。
- 验收标准必须在开工时的 commit 上不成立。

**大范围重构是例外。** 一个机械改动（改列名、改共享类型）牵连整个代码库时，按 **expand–contract** 排序：先 expand（新旧形式并存），再按包或目录分批 migrate（每批一条，都被 expand block），最后 contract（删掉旧形式，被所有 migrate 批次 block）。连单批都无法独立保持绿色时，各批共用一个集成分支，并都 block 一条最终的 integrate-and-verify Issue。

## 5. Confirm with the user

以编号列表呈现，每条包含 **Title**、**Blocked by**、**What it delivers**、**Labels**。问粒度是否合适、blocking 边是否正确、是否需要合并或再拆。迭代到用户明确同意后再发布。

## 6. Publish

按依赖顺序（blocker 在前）逐条创建，body 文件放在仓库之外的临时目录。有 `agent-todo` 角色对应的 label 时，给每条打上它。每条创建后，用 GitHub 原生的 blocked-by 关系连到它的 blocker；来源是已有 Issue 时，再挂为它的 sub-issue。

- 关系建立失败时继续发布，body 里的 Blocked by 已记录依赖；最后报告失败项。
- 一条 Issue 创建失败时停下，报告已创建的 Issue。
- 不修改、不关闭 parent Issue。

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

不要写具体文件路径或代码片段，它们很快过时。例外：原型产出的片段比文字更精确地表达了某个决策（状态机、schema、类型形状）时，只内联承载决策的部分，并注明来自原型。

## 7. Report

按依赖顺序列出每条 Issue 的编号、标题、URL 与 blocker，标出可以立即认领的 Issue，并列出没能建立的原生关系。
