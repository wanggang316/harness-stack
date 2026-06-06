---
name: design
description: 为某个具体实现决策撰写一份 design doc（docs/design-docs/）。独立、由人触发——不属于主 build 流程。当一个解法足够含糊、技术路线应在动工前先论证清楚时使用；涵盖 feature design、技术性重构、架构决策与迁移。
---

# design: Design Document

## Overview

在实现复杂改动前先写一份 design doc。design doc 记录高层实现策略与关键设计决策，重点在所权衡的 **trade-offs**。我们的工作不是产出代码，而是解决问题——design doc 逼你在投入某个解法之前把问题想清楚。

这是一份严肃的文档。它既是「系统当初为何如此设计」的 source of truth，也是工程师面对陌生系统时最易上手的入口。

## When to Use

回答下面这些问题。若有 3 个及以上为「是」，就写一份 design doc：

1. 你对正确设计没把握，且预先投入时间换取确定性是值得的吗？
2. 让资深工程师（无法逐条审查代码改动）参与设计会有帮助吗？
3. 设计是否含糊或有争议到值得形成组织层面的共识？
4. 是否存在需要显式权衡的 cross-cutting concerns（安全、性能、可观测性）？
5. 是否强烈需要一份文档来说明这个系统为何如此设计？

**何时不要用：** 解法显而易见、没有真正的 trade-offs。如果你的 design doc 只会写「我们就这么实现」、没有备选方案或权衡讨论，那就别写，直接写代码。

## Process

```
RESEARCH ──→ DESIGN ──→ APPROVE ──→ UPDATE
  │             │          │           │
  ▼             ▼          ▼           ▼
加载上下文     提出完整     人类确认     在 plan 触及现实时
读代码         的解法                  更新文档
问清问题
```

### Phase 1: Research

在提出任何方案前，先深入理解问题空间。这一阶段至关重要——建立在浅薄理解上的设计只会产出浅薄的解法。

**加载上下文：**
- 若存在全局产品定义，读它（`docs/product-spec.md`）
- 读相关系统已有的 design doc（`docs/design-docs/`）
- 读架构文档
- 加载并阅读相关源码——理解系统今天实际如何运作，而不是你以为它如何运作

**理解约束：**
- 现有架构长什么样？它的不变量是什么？
- 性能、可扩展性和安全方面的要求是什么？
- 牵涉哪些依赖——它依赖什么，又有什么依赖它？
- 团队能力和项目时间线的约束是什么？

**立刻把假设摆上台面：**

```
我正在做的假设：
1. 我们能在不停机迁移的前提下加一张新数据库表
2. 现有 auth 中间件支持这个新角色
3. 这里读延迟比写延迟更重要
→ 现在纠正我，否则我就按这些往下走。
```

**问清楚。** 别猜——有含糊就问。建立在错误假设上的 design doc 浪费的时间，远超那几个问题的成本。

### Phase 2: Design

提出一份完整、可执行的设计。想透彻——人类指望你考虑到他们没想到的角度。围绕细节与人类反复迭代，直到设计扎实。

按下面这个模板写 design doc，保存到 `docs/design-docs/<name>.md`：

```markdown
# Design Doc: [Title]

**Status:** Draft | Approved | Implemented | Deprecated
**Author:** [name]
**Date:** [date]

## Context and Scope

<!-- 客观的背景事实。对全局做粗略概述：正在构建或改动什么、已经
     存在什么。保持简洁——让读者跟上节奏，但不要重复他们已经知道的。 -->

## Goals and Non-Goals

<!-- 简短的要点列表。
     Goals：系统必须达成什么。
     Non-Goals：那些本可合理列为目标、但被刻意排除的东西。
     不是反向目标（「不该崩溃」），而是有意的范围裁剪
     （「ACID 合规不是目标」）。 -->

## Design

### Overview

<!-- 所选方案的高层概述。从这里起笔，好让读者自行决定往下读多深。
     说明为什么这个方案最能满足既定 goals——trade-offs 就活在这里。 -->

### System Context Diagram

<!-- 这个系统如何嵌入更大的技术版图？
     把系统画成它所处环境中的一个方框——外部系统、用户、进出的数据流。
     这能让读者用他们已知的东西来定位这份设计。

     用 ASCII 图：
     ┌─────────┐     ┌─────────┐     ┌──────────┐
     │  Client  │────→│   API   │────→│ Database │
     └─────────┘     └─────────┘     └──────────┘  -->

### API Design

<!-- 勾勒这个系统对外暴露或对内消费的 API。聚焦与设计 trade-offs 相关的部分——
     不要照搬正式的接口定义（冗长、细节多余、很快过时）。

     展示：endpoints/methods、关键参数、响应结构、错误处理方式。 -->

### Data Storage

<!-- 数据以何种形式、如何存储？聚焦与 trade-off 相关的部分，
     不要写完整的 schema 定义。

     覆盖：存储技术选型及理由、关键实体与关系、访问模式、
     以及（如适用）迁移策略。 -->

### Component Boundaries

<!-- 内部结构：有哪些组件、各自负责什么、各自又不负责什么？

     定义依赖方向（谁能 import 谁）、通信模式（API、事件、共享类型）、
     以及模块边界。 -->

## Alternatives Considered

<!-- 对每个备选方案：它做了哪些 trade-offs，这些 trade-offs 与所选设计
     相比如何？务必把为什么否决备选方案讲透——这正是日后避免重新
     翻案的关键。

     每个被否决的备选方案都需要一个具体理由，而不只是「感觉不对」。 -->

## Cross-Cutting Concerns

<!-- 这份设计如何应对那些横跨系统的关注点：安全、隐私、可观测性、
     错误处理、测试策略、迁移路径、回滚方案。
     只纳入与本设计相关的关注点。 -->

## Risks

<!-- 哪里可能出错？每条风险都需要一个缓解策略，而不只是一句担忧。 -->
```

**并非每份设计都需要每个小节。** 一次小重构可能只需 Overview + Component Boundaries。一个触及外部系统的新 feature 可能各节都要。把相关的写进来——拿不准时，就写。按需写到足够详尽，让它能作为可执行的实现指引。

**写作原则：**

- **聚焦 trade-offs。** 没有 trade-offs 的 design doc 不过是实现手册——它没抓住要点。给定 context（事实）与 goals（要求），文档应当展示为何某个解法最能满足这些 goals。
- **勾勒 API，不要照搬。** 正式接口定义冗长、细节多余、容易过时。聚焦与设计 trade-offs 相关的部分。
- **代码属于 prototype，不属于文档。** design doc 极少应当包含代码。「我试过了，能跑」是有力的设计论据——改为链接到 prototype。
- **给出方案，别留空。** 拿出一份完整建议。若确有未决问题，明确列出——但别把核心设计悬而未决、留给人类去填。

### Phase 3: Approve

把 design doc 呈给人类评审。在获批前，不要进入实现。

```
DESIGN DOC 待评审：
- 标题：[name]
- 关键 trade-off：[一行说清核心设计取舍]
- 已考虑的备选方案：[数量]
- 已处理的 cross-cutting concerns：[清单]
→ 批准，或告诉我要改什么。
```

### Phase 4: Update

实现期间 plan 触及现实，缺陷和未顾及的需求会浮现。**届时更新 design doc**——让文档与实际构建出来的东西保持一致。若发布后发生重大变更，加一节「Amendments」，链接到后续的 design doc。

获批的 design doc 作为持久 Library 存放在 `docs/design-docs/`。开始构建时，运行 `harness-stack:feature-driven-development`——它会读取已存在的 design doc（如果有）。

## Relationship to Other Skills

- **harness-stack:design** 是**独立且可选**的——它不是主 build 流程中的一步。当一个解法含糊到值得在动工前论证并记录技术路线时（非平凡的重构、迁移或架构决策），才取用它。
- 它的产物 `docs/design-docs/<name>.md` 是受版本管理的 Library：「系统当初为何如此设计」的 source of truth。
- **harness-stack:feature-driven-development** 是构建 feature 的主流程。它会读取相关的 design doc（如果有），但从不要求或调用 `design`。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「实现一目了然」 | 若真的一目了然，design doc 5 分钟就写完。写不快，就说明它并不那么显然。 |
| 「我构建完再补设计文档」 | 那是事后复盘，不是 design doc。价值在于在投入*之前*评估备选方案。 |
| 「design doc 是官僚主义」 | 因为选错路线而重写才是真正的官僚主义。design doc 通过避开编码上的死胡同来省钱。 |
| 「这事只有一种做法」 | 若你说不出一个备选方案，说明你还没探索过问题空间。 |
| 「我先开写、看哪种能用」 | 那是 prototype，不是实现。若你先做 prototype，在投入某个路线之前，把发现记进 design doc。 |

## Red Flags

- design doc 读起来像实现手册——只讲*怎么做*，不解释*为什么*、也不提考虑过哪些备选方案
- 没读相关源码就提出设计
- 缺少 Alternatives Considered 一节
- 列了 Risks 却没有缓解措施
- 状态写着「Approved」，实际没有人类评审过
- 代码都已合并了才补写 design doc

## Verification

- [ ] 设计前已读相关源码与文档
- [ ] Context and Scope 给出了客观的背景事实
- [ ] Goals 与 Non-Goals 已显式分开
- [ ] Design 一节包含 trade-off 分析，而不只是实现细节
- [ ] 视情况纳入相应的 Design 小节（system context、API、data storage、component boundaries）
- [ ] 至少考虑 2 个备选方案，并附具体的否决理由
- [ ] 已处理 cross-cutting concerns（安全、可观测性等）
- [ ] 已识别 Risks 并附缓解措施
- [ ] 人类已评审并批准 design doc
- [ ] design doc 已保存到 `docs/design-docs/`
