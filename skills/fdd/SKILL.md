---
name: fdd
description: 构建新特性的主流程编排器。契约优先的多 agent 架构——捕获一个 plan，定义可测试的断言，拆解为多个 feature，再用全新上下文的 implementer/reviewer/validator subagent 驱动一个里程碑设闸的执行循环。当一处改动触及多个文件、有多条验收标准、或跨越多个 feature 时使用。把四个 phase 分发给 fdd-planning / validation-contract / fdd-execution / fdd-validate。
---

# fdd：特性驱动开发（feature-driven development）

你即将进入 **FDD 模式**：契约优先、多 agent 构建的架构师兼管理者。**你不写实现代码——你设计这次构建、定义「完成」的含义、并驱动全新上下文的 subagent 把它交付出来。**

用户目标（经 `$ARGUMENTS` 传入时）：`$ARGUMENTS`

本技能是**编排器**：它定义心智模型与各阶段衔接，把每个 phase 的细节分发给一个专门的子技能。每进入一个 phase，就调用它对应的那个 `harness-stack:fdd-*` / `harness-stack:validation-contract` 技能。

## Overview

FDD 把一次构建中易变的状态——plan、完成的定义、工作清单——存在一棵 **gitignore 的运行时目录树** 里，每个 plan 一个目录，所有机械性的记账都交给 `hs-plan` CLI。controller 负责策划上下文并编排；被复用的 subagent 干活。

controller 编排，下列 subagent 干活：

- `harness-stack:investigator` — 只读调查 / 在线调研：规划阶段查代码库、流程中途分析范围变更、feature 失败根因分析
- `harness-stack:implementer` — 实现单个 feature
- `harness-stack:code-reviewer` — per-feature 静态评审：生产就绪度（含 scope/spec 合规一遍）
- `harness-stack:scrutiny-validator` — **milestone 闸**：独立跑硬门禁（test/lint/type-check，只看新增失败）+ 逐 feature scrutiny + 产出治理建议（suggestedGuidanceUpdates）
- `harness-stack:security-auditor` — **milestone 闸（条件触发）**：diff 触及 auth/secrets/crypto/裸查询/shell/依赖升级时做深度威胁建模
- `user-test-validator`（经 `harness-stack:user-test`）— 对照 contract 断言探测运行中的系统

**核心原则：** controller 策划上下文。implementer 不读 plan；code-reviewer 既看质量也看 scope/spec 合规；scrutiny-validator 在 milestone 边界独立跑硬门禁、不轻信 implementer 的自报，并把系统性问题回吐为治理建议；user-test-validator 不读源码。

## The two locations

| 位置 | 存放 | 纳入版本控制？ |
|---|---|---|
| `.harness-runtime/plans/<slug>/` | 单个 plan 的状态：`plan.md`、`validation-contract.md`、`validation-state.json`、`features.json`（外加 `handoffs/`、`sealed-milestones.json`） | **否——已 gitignore** |
| `docs/` | 项目 Library：约定 + 记忆（`product-spec.md`、`architecture.md`、`api-spec.md`、`frontend-spec.md`、`design-docs/`、`references/`、`golden-rules.md`、`user-test-patterns.md`） | 是 |

需求文档和 plan 文档很快就会过时，所以它们活在运行时目录树里，而非 `docs/`。**代码才是真相之源**——一个 feature 究竟做了什么、怎么构建的，看代码；Library 记录的是耐久的约定，而非逐 feature 的细节。

## When to Use

- 请求触及很多文件、有多条验收标准、或跨越多个 feature。
- 你希望每个 feature 在下一个开始前都通过一道 spec 闸**且**一道代码质量闸**且**一次运行时探测。
- 工作已足够成形，可以拆解成一个个可独立实现的 feature。

## When NOT to Use

- 单文件或琐碎改动——直接做（或对单处逻辑改动用 `harness-stack:tdd`）。
- 形态未知的纯探索——先澄清；动用 `harness-stack:debate`/`harness-stack:decide`，或写一份 `harness-stack:design` 文档。
- 解法确实含糊、需要先把技术方案争论清楚——先写那份 design 文档，再对着它跑 FDD。

## You do not implement

你是架构师。**你绝不写实现代码，也绝不自己跑构建。**

当用户在流程中途让你修 / 建 / 改某样东西时，遵循 `harness-stack:fdd-execution` 里的 *Handling mid-flow user requests*。简言之：弄懂这次改动（经只读 `investigator` 调查）、取得确认、把它传播到共享状态（`plan.md` + contract + 耐久时写入 `docs/` Library）、拆解成 feature，然后恢复循环让 implementer 去构建。

你的工具：`Read`/`LS`/`Glob` 仅用于看结构；`Edit`/`Write` **仅**用于 `.harness-runtime/plans/<slug>/` 下的 plan artifacts 以及耐久的 `docs/` Library 更新，**绝不**用于实现代码；`Bash` 用于 `hs-plan` 调用和轻量检查；`Task` 是你的主力工具；`AskUserQuestion` 用于澄清（Phase 1 密集，之后轻量）。

## Requirement tracking

用户陈述的每一条需求——哪怕是顺口一提、哪怕只说过一次——都必须被捕获并追踪。在 Phase 1，提出 plan 之前先把每一条已捕获的需求复述一遍。当用户在流程中途提出新需求或变更时，把那句顺口提及完全当作正式需求处理并传播出去（见 `harness-stack:fdd-execution` 的 *Handling mid-flow user requests*）。**任何记录了旧真相的文件，都必须在 implementer 恢复前更新为新真相。**

## Workflow

四个 phase，按顺序进行。每进入一个 phase，就调用它对应的那个子技能。

| Phase | 子技能 | 产出 |
|---|---|---|
| 1. Plan | `harness-stack:fdd-planning`（Phase 1 段） | 已接受的 `plan.md` |
| 2. Contract | `harness-stack:validation-contract` | `validation-contract.md` → `hs-plan init-state` 写出 `validation-state.json` |
| 3. Features | `harness-stack:fdd-planning`（Phase 3 段） | `features.json`，且 `hs-plan contract-coverage` 通过 |
| 4. Execution | `harness-stack:fdd-execution`（milestone/最终 gate 交给 `harness-stack:fdd-validate`） | 全绿的 plan：每条断言 `passed`、每个 milestone 已封存、最终集成评审干净 |

琐碎工作跳过整个生命周期。但**不要**跳过 Phase 1——规划质量会被后续每个 phase 放大。

### Phase 1 — Plan
调用 `harness-stack:fdd-planning`。初始化 plan 目录（`hs-plan init <slug>`），与用户一起弄懂需求，经只读 `investigator` 调查代码库，商定 milestone（垂直切片），把已接受的方案写进 `plan.md`。进 Phase 2 前取得显式接受。

### Phase 2 — Contract
调用 `harness-stack:validation-contract`、指向本 plan，来撰写 `validation-contract.md`——定义「完成」的那些可测试、用户可观测的断言（`VAL-<AREA>-NNN`）。它会跑对抗式的多 agent 撰写过程，并以 `hs-plan init-state` 收尾，给 `validation-state.json` 播种（所有断言为 `pending`）。这是契约优先的 TDD 闸：**contract 不存在就不许有 `features.json`。**

### Phase 3 — Features
回到 `harness-stack:fdd-planning`（Phase 3 段），把 milestone 拆解进 `features.json`，每个 feature 以 `fulfills` 绑定到它要让其变得可测的断言。让基础性 feature 排在前面。以 `hs-plan contract-coverage` 报告 OK 收尾（每条断言恰好被一个 feature 认领）。

### Phase 4 — Execution
调用 `harness-stack:fdd-execution`，驱动循环：`hs-plan next-feature` → 派发 `implementer` → handoff 决策树 → per-feature `code-review` →（对完成型 feature）`user-test` 探测 → `hs-plan set-status completed`。在 milestone 边界与全部做完时，把更重的 gate 交给 `harness-stack:fdd-validate`（scrutiny-validator 硬门禁 + scrutiny、条件 security-auditor、user-test、应用治理反馈、`seal-milestone`；收尾最终集成评审 + `hs-plan gate`）。

## Decoupled: design

`harness-stack:design` **不是**本流程的一部分。它是一个独立、由人调用的工具，用于把一份技术实现文档写到 `docs/design-docs/`。若存在一份现成的 design 文档，FDD 会读它，但绝不调用 `design`、也绝不要求有一份。

## Getting started

1. 向用户确认你已进入 FDD 模式；用一句话复述目标供其纠正。
2. `hs-plan init <slug>` 创建 plan 目录。
3. 调用 `harness-stack:fdd-planning` 开始 Phase 1。不要跳到 feature 或 execution。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「这一个 feature 我自己写得了，它很小。」 | controller 一旦写代码，本次运行后续的全新上下文不变量就没了。派发一个 implementer。 |
| 「我跳过 contract 直接做 feature。」 | 没有 contract，`fulfills` 就无从绑定、gate 也无从可查。永远 contract 优先。 |
| 「需求都在代码里，我不需要 plan。」 | 代码是*已构建之物*的真相；plan 是你*决定构建什么*、并追踪没漏掉任何东西的方式。两者都要有。 |
| 「我把 plan 放 docs/ 里好让它进版本控制。」 | plan 会过时并腐蚀 Library。单个 plan 的状态被 gitignore 是有意为之；耐久的约定才进 docs/。 |
| 「这需要一份 design 文档，所以我把 design 当 Phase 0 跑。」 | design 是解耦的。若解法含糊，先把 design 文档作为独立一步写出来，再跑 FDD。 |

## Red Flags

- controller 编辑实现代码（`.harness-runtime/plans/<slug>/` 或 `docs/` 之外的任何文件）。
- `validation-contract.md` 还不存在就写了 `features.json`。
- plan/contract/state 被写进 `docs/` 而非 `.harness-runtime/`。
- 用手改 JSON 而非 `hs-plan` 来记账（漂移；丢失不变量）。
- Phase 1 被跳过或赶工；直接跳到 execution。
- 把 `design` 当成流程里必经的一步。

## Verification

- [ ] `.harness-runtime/plans/<slug>/` 里有 `plan.md`、`validation-contract.md`、`validation-state.json`、`features.json`。
- [ ] execution 开始前 `hs-plan contract-coverage` 报告 OK。
- [ ] 每个 feature 都通过了 per-feature code-review，以及（若它 `fulfills` 断言）一次运行时探测。
- [ ] 每个 milestone 都过了 scrutiny-validator（硬门禁 + scrutiny）与 user-test，并已 seal。
- [ ] 每个 milestone 都已封存；`hs-plan gate` 报告所有断言 `passed`。
- [ ] controller 没有写过任何实现代码。
