---
name: define-architecture
description: 在全局层面定义系统 architecture。在启动新项目、architecture.md 缺失或过时、或系统结构发生重大变化时使用。产出 docs/architecture.md，作为系统的结构地图。
---

# define-architecture：Architecture Definition

## Overview

在全局层面定义系统 architecture。`docs/architecture.md` 是整个系统的结构地图——它描述各 domain、各 layer、依赖方向、cross-cutting concerns 以及关键技术选型。读这份文件的 agent 或工程师，应当不必通读每个文件就理解代码库是如何组织的。

这不是某个具体 feature 的 design 文档。feature 级的技术设计放在 `docs/design-docs/`。本文档定义系统的总体结构——所有组件存在于其中的骨架。

灵感来自 [matklad 的 ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html)。

## When to Use

- 启动一个有多个 domain 或多个 layer 的新项目
- 一个非平凡项目缺少 `docs/architecture.md`
- 系统结构发生重大变化（新增 domain、新增 layer、大规模重构）
- agent 或工程师无法在代码库中导航
- 需要做出或重新审视技术选型

**When NOT to use：** 单文件脚本、一次性原型、或 README 已覆盖结构的项目。需要 feature 级技术设计时，用 `/harness-stack:design`。

## Philosophy

你是 architect，不是文档抄写员。你的职责是做出能比任何单个 feature 活得更久的结构性决策。

- **依赖方向是最重要的事。** 谁 import 谁，定义了 architecture。这一点搞错，一切都会腐烂。
- **挑战结构性决策。**「我们一直这么做」不是 architecture——是惯性。每一条边界都需要一个理由。
- **是地图，不是手册。** 描述结构，而非实现细节。ARCHITECTURE.md 讲 *结构是什么*；design 文档讲 *某个决策为什么这么做*。
- **以约束思考，而非以 feature 思考。** 好的 architecture 能撑起尚未被设想的 feature。它靠定义规则、阻止错误的耦合来做到这一点。
- **行得通的最简结构。** 过早的架构复杂度比没有架构更糟。两层清晰胜过五层含糊。
- **对复杂度反向施压。** 如果某个 domain 边界不清，就直说。如果各 layer 不遵循一致的规则，就挑战它。

## Process

```
UNDERSTAND ──→ ANALYZE ──→ DEFINE ──→ APPROVE
  │               │           │          │
  ▼               ▼           ▼          ▼
Read product    Design or   Write       Human
Determine       evaluate    architecture confirms
mode            structure   .md
```

### Phase 1：Understand

**读 product spec：**
- `docs/product-spec.md` 是首要输入——architecture 服务于产品，而非相反

**判定模式**，方法是检查 `docs/architecture.md` 是否存在：

**没有 architecture.md → 新项目。** 从零设计 architecture。
- 若已有代码，扫描目录结构、关键文件、import 模式、配置
- 若无代码，完全依据 product spec 与约束来做
- 进入 Phase 2

**已有 architecture.md → 推断意图。** 读现有文档，再从用户请求与上下文中推断他们想要什么：
- **整体重设计**——系统结构发生根本变化。加载：完整代码库扫描、`docs/design-docs/` 中的 design 文档
- **局部更新**——新增 domain、技术选型变更、重构后同步。加载：发生变化的相关代码库部分

在往下走之前，与用户确认你的理解。

**理解约束：**
- 产品的核心能力有哪些？（来自 `docs/product-spec.md`）
- 性能、可扩展性、可靠性的要求是什么？
- 团队的专长与产能如何？
- 它必须与哪些现有系统集成？
- 部署模型是什么？

**把假设摆出来：**

```
ASSUMPTIONS I'M MAKING:
1. The system is deployed as a single service (not microservices)
2. PostgreSQL is the primary data store based on existing schema
3. The team has strong TypeScript experience
→ Correct me now or I'll proceed with these.
```

### Phase 2：Analyze

**新项目——设计结构：**

依据 product spec 与约束，提出 architecture：
- domain 分解——基于产品能力，自然的边界在哪里？
- layer 与依赖方向——每个 domain 需要哪些 layer？依赖规则是什么？
- 技术选型——什么契合需求、团队专长与约束？
- 对 monorepo：什么算 app（可部署）、什么算 package（共享库）？package 之间的依赖方向如何？

带着取舍呈现建议：

```
PROPOSED ARCHITECTURE:
1. Three domains: auth, tasks, billing — boundaries follow product capabilities
2. Four layers: Types → Repo → Service → Runtime — strict left-to-right dependency
3. PostgreSQL — ACID compliance, relational model fits domain
→ Feedback before I write the doc?
```

**已有项目——评估结构：**

把实际存在的与应当如此的相互对照：
- 实际的 domain、layer 与依赖方向是什么？有没有违例？
- 哪里边界清晰？哪里含混？
- 对 monorepo：package 之间有依赖环吗？所有 package 都配得上自己的存在吗？

质询结构性决策：
- 「这两个 domain 共享 15 个 type。它们真是两个独立 domain，还是一个 domain 被人为拆开了？」
- 「这个 layer 在两个方向上依赖另外 3 个 layer。那不是一个 layer——是一团乱麻。」
- 「你有个 utils/ 目录装了 40 个文件。那不是 domain——是杂物抽屉。」
- 「这个技术选型是 2 年前定的。上下文变了吗？」
- 「apps/web 和 apps/admin 共享 80% 的代码。它们真是两个独立的 app 吗？」
- 「这个 package 只有 2 个 export、1 个 consumer。它配得上自己的存在吗？」

呈现结构性疑虑：

```
STRUCTURAL CONCERNS:
1. Domain [X] and [Y] have high coupling — 12 shared types, 8 cross-domain calls. Should they merge?
2. The "service" layer has both HTTP handlers and business logic. That's two responsibilities.
3. There's no clear boundary between config and runtime — config is loaded lazily throughout.
→ How do you want to address these?
```

### Phase 3：Define

写 architecture 文档。保存到 `docs/architecture.md`。

选用与项目结构匹配的模板，读它，并照着做：

| Project Type | Template |
|---|---|
| Single-package | [references/single-package-template.md](references/single-package-template.md) |
| Monorepo | [references/monorepo-template.md](references/monorepo-template.md) |

monorepo 模板只覆盖 **workspace 层级** 的事项（codemap、依赖方向、invariants）。每个 package 的内部细节归 `docs/design-docs/`。

**写作原则：**

- **先 domain，再 layer，最后细节。** 读者应当先理解全局，再深入。
- **依赖方向必须可视化。** ASCII 图、箭头、表格——怎么能让它一目了然就用什么。
- **每个 domain 都需要单独存在的理由。**「感觉它是个独立的东西」不是理由。
- **Technology Choices 必须附带理据。**「我们选了 X」却没有「因为 Y」毫无用处。
- **描述「是」什么，而非「应该」是什么。** 如果 architecture 有瑕疵，把它记录下来。理想化的 architecture 归 design 文档。
- **记录 architectural invariants。** 不出现在代码里的规则最该写下来——一旦被违反，bug 不会立刻显现，但系统会腐烂。
- **monorepo 根文档停在 workspace 层级。** codemap、依赖方向、invariants、cross-cutting concerns。每个 package 的 architecture（domain、layer、entry point）放在 `docs/design-docs/`。

### Phase 4：Approve

把 architecture 定义呈交人工评审。

```
ARCHITECTURE DEFINITION READY FOR REVIEW:
- Domains: [count] with boundaries defined
- Layers: [count] with dependency direction rules
- Key technology choices: [count] with rationale
- Cross-cutting concerns: [list]
→ This is the structural foundation for all implementation.
   Approve, or tell me what to change.
```

## Keeping Architecture Current

architecture 文档会与现实漂移。当漂移变得显著时：

- **大规模重构之后**——更新发生变化的 domain、layer 或边界
- **新增 domain 之后**——把它们加进地图
- **技术变更之后**——更新 Technology Choices 并附新的理据
- architecture 文档应始终描述系统 **当下的样子**，而非它曾经或应该的样子

## Relationship to Other Skills

- **harness-stack:define-product** 在全局定义产品 → `docs/product-spec.md`——architecture 服务于产品
- **harness-stack:define-architecture** 定义系统结构 → `docs/architecture.md`——结构地图
- **harness-stack:design** 为具体改动定义技术方案 → `docs/design-docs/<name>.md`——讲 *为什么* 某个决策这么做
- **harness-stack:docs-init** 在项目初始化时搭起文档骨架（README、AGENTS.md、docs/ 目录树）

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「代码就是 architecture。」 | 代码展示存在什么。它不展示规则——哪些依赖被允许、哪些是违例、边界在哪里。 |
| 「architecture 会自然涌现。」 | 涌现式 architecture 是「意外复杂度」的别名。显式的结构才能避免一团烂泥。 |
| 「等规模上来再做架构。」 | 架构级重构比一开始就把边界做对贵 10 倍。哪怕小项目也受益于清晰的依赖方向。 |
| 「沿用上次用的就行。」 | 上下文很重要。每个技术选型都应针对当前问题来评估，而非上一个问题。 |
| 「以后再重构。」 | 你能。但你不会。而当你真去做时，会难上 10 倍。 |

## Red Flags

- 没有定义依赖方向规则
- domain 没有清晰边界或单一职责
- 「Utils」或「helpers」目录装了 20+ 个文件（这是个缺失的 domain）
- domain 之间存在循环依赖
- architecture 文档描述的是理想状态，而非实际状态
- 技术选型没有理据
- 没读 product spec 就定义了 architecture
- monorepo 根文档塞进了每个 package 的内部细节（domain、layer），而不是交给 `docs/design-docs/`
- 没有记录 architectural invariants

## Verification

- [ ] 定义 architecture 之前已读 product spec
- [ ] 模式已判定：新项目（无 architecture.md）或更新（已存在、意图已确认）
- [ ]（已有项目）已扫描实际代码库——结构反映现实，而非理想
- [ ] 各 domain 已列出 purpose、boundary 与 key files
- [ ] 各 layer 已定义，并附显式的依赖方向规则
- [ ] 依赖规则已记录并可视化
- [ ] cross-cutting concerns 已记录并附机制
- [ ] entry point 已识别
- [ ] 技术选型附带理据
- [ ] 结构性疑虑已提出并与人工讨论
- [ ] 人工已评审并批准
- [ ] 已保存到 `docs/architecture.md`
- [ ] architectural invariants 已记录（代码里看不见的规则）
- [ ]（Monorepo）codemap 列出所有 package 及其 purpose
- [ ]（Monorepo）依赖方向已可视化并附 enforcement 机制
- [ ]（Monorepo）根文档停在 workspace 层级——每个 package 的内部细节放在 `docs/design-docs/`
