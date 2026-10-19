---
name: design-doc
description: 为一项重大功能或影响后续设计的修复撰写或更新设计文档（docs/design/NNN-slug/）：动工前写 plan，实现后补 action，之后的变化追加 amendment。
disable-model-invocation: true
---

# design-doc

`docs/design/` 记录「为什么这样设计」。每个编号目录对应一项重大功能，或一个根因、决策会指导后续实现的修复；目录里先有一份 plan，实现后有一份 action。不要因为工作量大、调研多就写；方案显而易见、没有可行替代时也不写。拿不准就不写，除非用户明确要求。

## 1. Gather

以会话里已经讨论过的内容和代码现状为准，直接综合，不对用户做访谈。有 `CONTEXT.md` 时用它的术语；不和 `docs/adr/` 中已有的决策冲突，确实要推翻时在文档里明说。

对照代码确认方案在现状下可行。会话里缺少会改变设计的信息时，写下你的假设，放进 Open questions，在第 3 步提出来让用户纠正。

## 2. Write the plan

编号取 `docs/design/` 中现有最大的三位编号加一。创建 `docs/design/NNN-<slug>/000-plan.md`，`Status: Proposed`。文档语言跟随仓库已有文档，没有先例就用英文。

```markdown
# NNN — <Title>: Plan

| | |
| --- | --- |
| **Status** | Proposed \| Accepted \| Implemented \| Superseded by <link> |
| **Date** | YYYY-MM-DD |
| **PRs** | (fill in as they merge) |
| **Related** | [NNN-other](../NNN-other/000-plan.md), ADR-NNNN |

## Problem
The problem from the user's perspective; for a fix, the observed symptom.

## Goals
Bullets.

### Non-goals
Things a reader could reasonably expect that are deliberately excluded.

## Behaviour
Numbered user stories: "As an <actor>, I want <feature>, so that <benefit>".
Cover the feature fully. Omit when Goals already say it, or for purely technical work.

## Design
Lead with an overview and the smallest visual that shows the shape.
Then only the parts that carry trade-offs: modules and their interfaces,
data and its access patterns, component boundaries and dependency direction.

## Alternatives & decisions
Each rejected option with the concrete reason it lost.

## Testing
The seams to test at: prefer existing seams, the highest possible, as few as possible.
Prior art in the codebase.

## Risks
Each risk with its mitigation. Include migration and rollback when relevant.

## Open questions

## Amendments
```

- 不是每份 plan 都需要每一节；没有内容的节删掉，不留占位。Amendments 例外，留给第 4 步追加。
- 写模块和接口，不写具体文件路径和代码片段，它们很快过时。原型产出的片段比文字更精确地表达了某个决策（状态机、schema、类型形状）时，只内联承载决策的部分，并注明来自原型。
- 给出完整的方案。真正未决的问题列在 Open questions，不把核心设计留空。

## 3. Review

把 plan 交给用户：一句话说清核心取舍，列出被否决的方案和需要用户纠正的假设。用户批准后把 Status 改为 `Accepted`；要修改就迭代。批准前不进入实现。

## 4. After implementation

- **实现完成**：在同一目录写 `001-action.md`（模板见 [references/templates.md](references/templates.md)），plan 的 Status 改为 `Implemented`，补上 PRs。尽量和改动放在同一个 PR。
- **后续修复或扩展**：追加下一个编号的 `00N-<topic>.md`，并在 plan 的 Amendments 末尾加一行 `- Updated YYYY-MM-DD: <one line> — see [00N-topic.md](00N-topic.md)`。后续变化让 plan 或 action 的某处不再成立时，就地改正并在 amendment 里注明。
- **方案被推翻**：新开一个编号目录，两边互相链接，旧 plan 的 Status 改为 `Superseded by <link>`。

action 中写到的每个仓库路径都必须存在，写之前先确认。没有亲自跑过的构建或测试结果不要写；无法确认的事实放进 Open questions。
