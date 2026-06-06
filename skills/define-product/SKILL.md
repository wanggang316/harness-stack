---
name: define-product
description: 在全局层面定义产品。在启动新产品、产品方向不清晰、或 product-spec.md 缺失或过时时使用。产出 docs/product-spec.md，作为「产品是什么」的唯一事实来源。
---

# define-product：产品定义

## Overview

在全局层面定义产品是什么。`docs/product-spec.md` 是一个项目里最重要的单一文档——它是所有设计、规划与实现的起点。它回答：这个产品服务谁、解决什么问题、核心能力有哪些、以及哪些明确不在范围内。

这不是 feature spec。每个 feature 的需求由 `harness-stack:feature-driven-development` 按 plan 维度捕获（落在 `.harness-runtime/plans/<slug>/`），而每个 feature 具体做什么，以代码为事实来源。本文档定义产品本身——所有 feature 存在于其中的框架。

## When to Use

- 启动一个新产品或新项目
- `docs/product-spec.md` 缺失
- 产品方向不清晰，或发生了重大转向
- 团队（或 agent）不理解产品根本上是什么
- 范围已经漂移，边界需要重新确立

**When NOT to use：** 产品已清晰且稳定。要构建一个 feature，用 `/harness-stack:feature-driven-development`。需要技术设计文档时，用 `/harness-stack:design`。

## Philosophy

你不是抄写员。你是带着 architect 视角的思考伙伴。

- **挑战每一个假设。**「一般都这么做」不是理由。逼着对方把「为什么」讲清楚。
- **先问 WHO，再问 WHAT。** 一个不知道自己用户是谁的产品，也无从知道自己的边界。
- **「不做什么」清单是最有价值的部分。** 聚焦的本质是对好点子说不。把取舍摆到明面上。
- **简洁是终极的复杂度掌控。** 推向那个仍能解决真问题的最简版本。
- **别做应声虫。** 如果一项能力追溯不到任何用户问题，就直说。诚实的反对比虚假的附和更有价值。
- **从用户价值出发，反推能力。** 不要从「我们能造什么」开始——从「人们有什么问题」开始。

## Process

```
UNDERSTAND ──→ CHALLENGE ──→ DEFINE ──→ APPROVE
  │               │            │           │
  ▼               ▼            ▼           ▼
Load context    Push back    Write        Human
Ask WHO/WHY     on scope     product-     confirms
                and gaps     spec.md
```

### Phase 1：Understand

在形成任何观点之前，先深入理解问题空间。

**加载上下文：**
- 读完所有已有的项目文档和代码
- 弄清已经造出了什么（如果有的话）、当前状态如何
- 找出「已有的」与「对外宣称的」之间的缺口

**提出根本性的问题。** 这些问题没有答案之前，不要往下走：

- **这是给谁用的？** 不是「开发者」——是哪类开发者、在做什么、在什么场景下？没有这个产品时，他们的一天是怎样的？
- **它解决什么问题？** 用「痛点」而非「方案」来表述。是「用户无法 X」而不是「我们提供 Y」。
- **它为什么需要存在？** 如果这个产品不存在会怎样？人们今天是用什么替代的？
- **成功是什么样子的？** 不是指标——是结果。用户的世界里有什么改变了？
- **为什么是现在？** 是什么变化让此刻成为合适的时机？

```
QUESTIONS I NEED ANSWERED:
1. Who specifically is the target user? Describe their role and daily workflow.
2. What is the core pain this product addresses?
3. What are they doing today to solve this problem?
4. What does success look like from the user's perspective?
→ I need these answers before I can define the product.
```

### Phase 2：Challenge

这是最关键的一个阶段。不要跳过。

**对产品边界做压力测试：**

- 对每一项拟定的能力，问：**「它能追溯到某个具体的用户问题吗？」** 如果不能，它就不该在这里。
- 对每一项排除掉的东西，问：**「把它加回来会从根本上改变产品价值吗？」** 如果会，就重新考虑。
- 找出**隐藏的假设**——那些被当成理所当然、却从未被验证的东西。
- 找出**伪装成需求的范围蔓延**——把「锦上添花」说成「必须有」。
- 找出**缺失的能力**——用户有、产品本该解决、却没被提及的问题。

**提尖锐的问题：**

- 「你列了 8 项能力。如果只能交付 3 项，会是哪 3 项？那些才是你的核心。」
- 「这项能力服务的用户和其它几项不一样。你是在做一个产品，还是两个？」
- 「如果缺了这项能力，用户会说什么？如果答案是『没什么』，砍掉它。」
- 「它和 [现有方案] 有什么不同？如果答案是『一样，只是换成我们做』，那还不够。」

**把假设显式摆出来：**

```
ASSUMPTIONS I'M CHALLENGING:
1. You assume [X] is a core user — but the capabilities described serve [Y] better. Which is the real target?
2. Capability [A] and capability [B] serve different use cases. Is there a unifying user need, or are these separate products?
3. You've excluded [Z] from scope, but users doing [workflow] would need it. Is that intentional?
→ Let's resolve these before writing the product definition.
```

### Phase 3：Define

写出产品定义。保存到 `docs/product-spec.md`：

```markdown
# Product Spec: [Product Name]

**Last Updated:** [date]

## Product Overview

### Problem

<!-- 用户今天面对的痛点是什么？2-3 句话。
     用「痛点」而非「方案」表述。是「用户无法 X」而不是「我们提供 Y」。 -->

### Solution

<!-- 这个产品如何解决它？2-3 句话。
     不要写技术实现细节——描述体验。 -->

## Target Users

<!-- 要具体——不是「开发者」，而是「哪类开发者，在做什么」。 -->

| Role | Scenario | Core Need |
|---|---|---|
| [role] | [when/where they use it] | [what they need from it] |

## Core Capabilities

| # | Capability | Description | Status | Maturity |
|---|---|---|---|---|
| C1 | [name] | [one-line description] | Active / Planned / Deprecated | Alpha / Beta / Stable |

### Capability Dependencies

<!-- 展示各项能力之间如何相互依赖。
     用 ASCII 图或表格。哪些是基础性的？
     哪些是独立的？哪些组合在一起？ -->

\```
C1 (foundation)
├── C2
│   └── C4
└── C3
\```

## Product Boundaries

### In Scope
<!-- 产品做什么。要具体。 -->

### Out of Scope
<!-- 产品明确「不」做什么，以及为什么。
     每一项排除都需要一个理由——「不是我们的用户」、
     「未来阶段」、「已有工具解决」等等。 -->

### Future Consideration
<!-- 当前不在范围内、但日后可能重新考虑的东西。
     与永久性的排除项区分开。 -->

## Key Concepts

<!-- 核心领域术语。防止人与人、人与 agent、
     以及跨文档之间的沟通误解。 -->

| Term | Definition | Not to Be Confused With |
|---|---|---|
| [term] | [what it means in this product] | [common misinterpretation] |

## Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| Performance | [requirement] | [measurable target] |
| Security | [requirement] | [measurable target] |
| Availability | [requirement] | [measurable target] |

## Success Metrics

| Metric | Target | Current | Measurement |
|---|---|---|---|
| [metric] | [target value] | [current value or N/A] | [how to measure] |

## Open Questions

<!-- 尚未解决、需要答案的问题。每一条都应说明
     这个问题阻塞了哪个决策。 -->
```

**写作原则：**

- 每一项能力都必须追溯到某个用户问题。如果追溯不到，就挑战它或砍掉它。
- Capability Dependencies 展示产品如何构成一个连贯的整体，而不只是一张 feature 清单。
- 没有理由的 Out of Scope 条目毫无用处。永远写清楚为什么。
- Future Consideration 把「现在不做」和「永不做」区分开——两者都重要。
- Key Concepts 防止在所有下游文档中产生代价高昂的沟通误解。
- 如果 Problem 和 Solution 对不上，说明哪里出了问题。停下来修好它。

### Phase 4：Approve

把产品定义呈交人工评审。这是一道关键闸门。

```
PRODUCT DEFINITION READY FOR REVIEW:
- Product: [name]
- Target users: [count] roles defined
- Core capabilities: [count] (Active/Planned)
- Out of scope: [count] exclusions
- Future consideration: [count] items
- Open questions: [count] unresolved
→ This is the foundation for all feature specs and design docs.
   Approve, or tell me what to change.
```

## Relationship to Other Skills

- **harness-stack:define-product** 在全局定义产品 → `docs/product-spec.md`
- **harness-stack:feature-driven-development** 构建单个 feature → 按 plan 维度的状态存于 `.harness-runtime/plans/<slug>/`
- **harness-stack:define-architecture** 定义系统 architecture → `docs/architecture.md`
- **harness-stack:design** 为具体改动定义技术方案 → `docs/design-docs/<name>.md`

产品定义是根。Feature 构建、architecture 与 design 文档都从它派生而来。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「我们清楚自己在造什么。」 | 那写下来只要 15 分钟。如果花得更久，说明你并不清楚。 |
| 「产品会不断演进，何必现在定义。」 | 没有基线的演进就是漂移。先把当下的真相定义下来，再随变化更新。 |
| 「把 feature 列一列就行。」 | 一张 feature 清单不是产品定义。没有用户问题和范围边界，feature 只是一堆找不到问题的散装方案。 |
| 「我们是敏捷，不做大而全的前期文档。」 | 这不是 50 页的 PRD。它就一页，说清谁、什么、为什么。哪怕敏捷也需要一颗北极星。 |
| 「README 里已经写过了。」 | README 讲的是怎么用产品。Product spec 讲的是产品为什么存在、应该成为什么。 |

## Red Flags

- 产品定义里没有目标用户，或目标用户是「所有人」
- 能力追溯不到用户问题
- 没有 Out of Scope 小节，或 Out of Scope 没写理由
- Problem Statement 与 Value Proposition 对不上
- 核心能力超过 10 项——你描述的是多个产品
- 用技术而非用户来定义产品

## Verification

- [ ] 根本性问题已回答（谁、什么问题、为什么、为什么现在）
- [ ] 假设已浮出水面并被挑战
- [ ] 目标用户具体到 role、scenario 和 core need
- [ ] 每一项能力都能追溯到一个用户问题
- [ ] 能力依赖关系已梳理
- [ ] 产品边界已定义（in scope、带理由的 out of scope、future consideration）
- [ ] 已定义 key concepts 以防沟通误解
- [ ] 非功能性需求有可度量的目标
- [ ] success metrics 已定义并附度量方式
- [ ] Problem 和 Solution 对齐
- [ ] 人工已评审并批准
- [ ] 已保存到 `docs/product-spec.md`
