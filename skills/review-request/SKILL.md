---
name: review-request
description: 在合并前派发一个全新上下文的 code-reviewer subagent。当你（作者）完成一项非平凡改动、需要对代码做审视时使用——固定 diff 区间、填写 brief 模板、通过 Task 派发，再把 findings 交出去应用。
---

# Request Code Review

## Overview

你是作者。派发一个全新上下文的 code-reviewer subagent，在合并前逮住问题。reviewer 只看到 diff、spec 和 brief——绝不看你的会话历史。全新上下文能逮住你遗漏的东西。

reviewer 的方法论存于 `harness-stack:code-reviewer` subagent 内部。brief 模板 `references/code-reviewer.md` 把那套方法论变成一份可填写的 prompt。

**核心原则：** 趁早 review，常常 review。

## When to Request Review

**强制：**

- 打开或合并 PR 之前。
- 完成一个 feature-driven-development 的 feature 或 milestone 之后（FDD 本就为每个 feature 设闸；此处用于一次独立的 review）。
- 完成一项非平凡的 feature、bug fix 或重构之后。
- 即将交付 AI 生成的代码时——它需要更多审视，而非更少。

**何时不要派发：**

- diff 不言自明的琐碎改动（typo、单文件重命名）。
- reviewer 无从增益的自动生成代码或 lockfile 升级。
- 同一 diff 与 reviewer 已来回两轮——停下，升级给人类。

## Integration with Workflows

**Feature-driven development：**

- 每个 feature 或 milestone 之后 review——问题在 feature 间累积得很快。
- 在开始下一个 task 之前应用 findings；别让未解决的 findings 一路带过去。

**并行 / 多 agent 实现：**

- 在把每个 agent 的分支合回之前，review 它的产出。
- 分支汇合后，再 review 一次整合结果——相互作用只在合并后才显现。

**临时开发：**

- 合并前 review。
- 卡住时 review——全新上下文能逮住你深陷其中的那个假设。
- 在触及承重代码的重构之前，可选地做一次基线 review。

## How to Request

### 1. Pin the diff range

```bash
BASE_SHA=$(git merge-base HEAD origin/main)   # or the PR base
HEAD_SHA=$(git rev-parse HEAD)
git diff --stat "$BASE_SHA..$HEAD_SHA"
```

若改动跨多个 commit，确认 base 与 reviewer 应看到的内容一致。别让 reviewer 去猜。

### 2. Fill the brief template

打开 `references/code-reviewer.md`，填入占位符：

| 占位符 | 填什么 |
|---|---|
| `{DESCRIPTION}` | 一段话说明实现了什么。 |
| `{SPEC_PATH}` | 为 review 提供依据的 spec / plan / PR 描述的路径，例如 `.harness-runtime/plans/<slug>/plan.md` 或某份 design doc。 |
| `{BASE_SHA}` | 来自 step 1 的 base SHA。 |
| `{HEAD_SHA}` | 来自 step 1 的 head SHA。 |
| `{FOCUS_AREAS}` | 值得额外审视的文件或维度。 |
| `{NOTES}` | reviewer 需要知道、但不在 diff 里的东西（约束、先前决策、已知局限）。 |

这份 brief 就是给 subagent 的 user-message prompt。它刻意精简——方法论存于 agent 的 system prompt 里。

### 3. Dispatch

```
Task(subagent_type="harness-stack:code-reviewer", prompt=<filled references/code-reviewer.md>)
```

该 subagent 在全新上下文里运行（独立窗口，不继承会话状态）。

### 4. Hand off the report

reviewer 返回的 findings 带有下面这套 severity 词汇的标签。把报告交给 `harness-stack:review-receive` 去应用。

## Severity Vocabulary

reviewer 发出的 finding 带有这些前缀标签。分诊报告时用它们。

| 前缀 | 作者动作 |
|---|---|
| **Critical** | 合并前解决——无一例外。 |
| **Important** | 合并前解决，或记录一条带可追踪后续项的延后。 |
| **Suggestion** | 酌情考虑；若延后则登记一个后续项。 |
| **Nit** | 作者自行决定。 |
| **FYI** | 无需动作。 |

若 reviewer 发出的 finding 没有 severity 标签或 `file:line` 引用，那是一份有缺陷的报告——push back，而非照着干。

## Round Budget and Escalation

**两轮。** 若 reviewer 到第三轮还在提 Critical / Important finding，停止派发，升级给人类：

- 这次改动也许该拆成更小的块。
- spec 也许有误或欠定义。
- reviewer 与作者之间也许有一处未决的技术分歧，需要第三方。

在上一轮的 Critical / Important finding 解决之前就重新派发，会浪费 reviewer 的产能、稀释信号。

## Example

```
[刚完成 Task 2：Add verification function]

你：合并前先请求一次 code review。

BASE_SHA=$(git merge-base HEAD origin/main)
HEAD_SHA=$(git rev-parse HEAD)
# BASE_SHA=a7981ec, HEAD_SHA=3df7661

[用从 references/code-reviewer.md 填好的 brief 派发 code-reviewer]
  DESCRIPTION:  Verification and repair functions for conversation index
  SPEC_PATH:    docs/specs/conversation-index.md
  BASE_SHA:     a7981ec
  HEAD_SHA:     3df7661
  FOCUS_AREAS:  Concurrency on repairIndex(), error path on verifyIndex()
  NOTES:        Migration from prior schema in db/0041; no rollback path.

[subagent 返回]：
  Strengths:    Clean architecture, real tests
  Important:    Missing progress indicators
  Suggestion:   Magic number (100) for reporting interval
  Verdict:      Approve with fixes

你：交给 harness-stack:review-receive 去应用 findings。
```

## The Round-Trip

```
作者 → 实现
   ↓
harness-stack:review-request（本技能）→ 填 brief，派发 code-reviewer
   ↓
code-reviewer（全新上下文）
   ↓
作者 → 运行 harness-stack:review-receive（应用 findings）
   ↓
人类 → 最终拍板
```

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「我写的我知道能用——我自己 review。」 | 作者对自己的假设是盲的。全新上下文能逮住你遗漏的东西。 |
| 「reviewer 已经有这次会话的上下文了。」 | 继承你线程的 reviewer 也继承了你的盲点。从头开始。 |
| 「这是 AI 生成的，大概没问题。」 | AI 代码需要更多审视，而非更少——它即使错了也自信而貌似有理。 |
| 「改动很小，跳过 reviewer。」 | 关键路径上的小改动仍需审视。大小不是判别标准。 |
| 「brief 在我会话里——reviewer 能读到。」 | 全新上下文里的 reviewer 没有你的任何会话。显式填好模板。 |

## Red Flags

- 派发 reviewer 却没有 spec 或 plan 来为 review 提供依据。
- 在上一轮 Critical / Important finding 解决之前就重新派发。
- 把跨两项无关改动的 diff 发给 reviewer——先拆。
- 把会话历史抄进 brief——那就废掉了全新上下文。

## Verification

在交给 `harness-stack:review-receive` 之前：

- [ ] brief 包含 `BASE_SHA`、`HEAD_SHA`、spec 路径、描述、focus、notes。
- [ ] reviewer 返回了一份带 severity 标签和 `file:line` 引用的结构化报告。
- [ ] verdict 是 Approve / Approve with fixes / Request changes 三者之一。
