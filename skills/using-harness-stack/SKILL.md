---
name: using-harness-stack
description: harness-stack 框架的引导纲要（bootstrap doctrine）。在会话开始时自动加载，用以介绍 lifecycle map、golden rules，以及如何挑选正确的 harness-stack:* skill。在一次会话中首次调用任何 harness-stack:* skill 之前，先读它。
---

# Using harness-stack

harness-stack 是一个 agent-first 的开发框架。人类给出方向；agent 通过一份固定的 `harness-stack:*` skill 目录来执行，每个 skill 各自负责软件 lifecycle 的一个阶段。本文档是入口——它告诉你该取用哪个 skill，而不是每个 skill 内部如何运作。

## Lifecycle map

一项 non-trivial 改动会经过这些阶段。挑选与*当前*阶段相符的 skill，而不是下一个阶段的。

| Phase | Trigger | Skill |
|---|---|---|
| **Define** | what/why 尚不清晰 | `harness-stack:define-product`、`harness-stack:define-architecture`、`harness-stack:define-api-spec`、`harness-stack:define-frontend-spec`、`harness-stack:define-ui-spec`（一次性、项目级） |
| **Design**（可选） | 方案含糊；技术路线应当先论证 | `harness-stack:design` —— 一份独立的技术文档 → `docs/design-docs/`。不是 main flow 的一步；FDD 在其存在时会读它。 |
| **Build**（main flow） | 任何 non-trivial 改动 | `harness-stack:fdd` —— 编排器，你只直接调它。它把四个 phase 分发给 `harness-stack:fdd-planning`（plan + features）、`harness-stack:validation-contract`（contract）、`harness-stack:fdd-execution`（执行循环）、`harness-stack:fdd-validate`（milestone/最终 gate）。implementer 的任务内用 `harness-stack:tdd`（test-first）。 |
| **Verify** | 有东西坏了或未经验证 | `harness-stack:debug`（root cause）、`harness-stack:user-test`（对照 contract 断言探测运行中的系统；写入 `validation-state.json`） |
| **Review** | 改动已就绪、可供审视 | `harness-stack:review-request`（派发）、`harness-stack:review-receive`（处理发现）、`harness-stack:security`（安全审计） |
| **Deliberate** | 问题有争议或高风险 | `harness-stack:debate`（多轮）、`harness-stack:decide`（一次性并行） |
| **Ship** | 代码已获批 | `harness-stack:commit` → `harness-stack:pr` → `harness-stack:changelog` → `harness-stack:land` → `harness-stack:ship` |
| **Meta** | 管理框架本身 | `harness-stack:docs-init`、`harness-stack:env-init`、`harness-stack:skill-create` |

Trivial 的工作（一行修复、错别字、显而易见的重命名）跳过 lifecycle。请用判断力：这些 skill 的存在是为了防止跳过它们所带来的失败模式，而不是走形式。

## Golden rules

这些规则在每个 skill 中都成立。完整文本见 `docs/golden-rules.md`。

1. **AGENTS.md is a map, not a manual** —— 入口简短，纵深内容放在 skills 和 docs 里。
2. **Repository knowledge is the source of truth** —— agent 读不到的东西就等于不存在。
3. **Everything is a skill or subagent** —— 不存在带外的 CLI 工具。
4. **Progressive disclosure** —— 只加载当前任务所需的内容。
5. **Evidence required** —— 「我检查过了」不算验证；「我运行了 X，得到 Y」才算。
6. **Anti-rationalization** —— skill 在开头就点名最可能的借口并予以反驳。
7. **Platform-agnostic** —— 读项目配置，不要臆断框架。
8. **Incremental delivery** —— 用薄薄的垂直切片，而非水平分层。
9. **Mechanize over document** —— 一项检查若能自动化，就把它自动化。
10. **Self-bootstrapping** —— harness 通过自己的 skill 改进自己。
11. **Fix the environment, not the prompt** —— 反复犯同样的错，说明工具链需要打磨。
12. **Context is scarce** —— 每加载一个 token 都有成本。

## Project facts

- TypeScript 运行时包放在 `packages/` 下，通过 pnpm workspaces 管理。
- `@hs/llm`（`packages/hs-llm/`）是无状态的 LLM provider 抽象（api / cli / sdk / mock）。调用模型的 skill 都经由它。
- `@hs/plan`（`packages/hs-plan/`，bin 为 `hs-plan`）是 feature-driven development 的确定性记账 CLI。FDD skill 把所有 per-plan 的状态转移都委托给它。
- 所有 skill 与 agent 都通过 `harness-stack:` 这个 plugin 命名空间寻址（例如 `harness-stack:fdd`、`harness-stack:code-reviewer`）；plugin 名提供了冲突隔离，因此单个 skill 与 agent 不再带额外前缀。
- `docs/` 是项目的 **Library**：长期约定 + 记忆（architecture、design-docs、references、golden-rules、测试约定）。具体需求与实现以 **Code is the source of truth** 为准。
- per-plan 的 FDD 状态（plan、validation-contract、features）放在 `.harness-runtime/plans/<slug>/` 下——**gitignored**，绝不放进 `docs/`。

## How to use this document

- 挑选 skill 时，把 lifecycle map 当作决策表用。
- 当一项任务跨越多个阶段时，按顺序运行各 skill；不要把它们压缩合并。
- 会话开始时展示的 slash command 列表才是权威的 skill 目录——本文档只覆盖 harness-stack 这一子集及其编排顺序。
