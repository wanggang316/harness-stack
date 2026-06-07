# Golden Rules

这些规则没有商量余地。其中一部分由 repository 检查与 CI 强制执行，另一些目前仍是流程规则，应随时间被机械化地编码进去。

当 agent 受阻时，解法几乎从来不是「再用力一点」。要问的是：「缺了什么能力，我们如何让它变得可读、可强制？」

---

## 1. AGENTS.md is a map, not a manual

把 AGENTS.md 保持在 150 行以内。它应当是一份目录，指向 `docs/` 里更深的文档。渐进式披露：agent 从一个小而稳定的入口开始，再被指引去看下一步该看哪里。

**Enforcement:** Repository review, document structure checks.

## 2. Validate boundaries, never probe data

在系统边界处解析并校验数据。绝不臆测数据形状。在系统之间的边界上使用带类型的 schema 和校验库。

**Enforcement:** Code review, type checking.

## 3. Prefer shared utilities over hand-rolled helpers

集中不变量，防止漂移。如果三处需要相同的逻辑，就把它抽出来。别让 agent 到处复刻同一套 pattern——给它们一份唯一的规范实现。

**Enforcement:** Code review, periodic sweep agent.

## 4. Repository knowledge is the system of record

不在 repo 里，对 agent 而言就等于不存在。Slack 讨论、口头约定、Google Docs 都是不可见的。每一个架构决策、产品 spec 和约定，都必须能从 repository 中被发现。

**Enforcement:** Cross-link review, repository structure checks.

## 5. Every complex change runs feature-driven development

对非平凡的工作，构建前先跑 `harness-stack:fdd`：捕获一个 plan，定义 validation contract，分解为 feature，再驱动一个由 milestone 设闸的执行循环。逐 plan 的状态（plan、contract、feature）存放在 `.harness-runtime/plans/<slug>/`（被 gitignore）；持久的约定存放在 `docs/`；具体实现以代码为准。

**Enforcement:** Process convention; `hs-plan contract-coverage` and `hs-plan gate`.

## 6. Fix the environment, not the prompt

当 agent 失败时，把它当成一个环境 bug。解法总是其中之一：缺工具、缺文档、缺护栏，或缺反馈回路。从结构上修好它，让它不再复发。

**Enforcement:** Culture, retrospectives in the plan's Decision Log / outcomes.

## 7. Enforce architecture mechanically

文档会腐化。文化规范无法随 agent 规模化。把架构不变量编码成 linter 与结构性测试。lint 报错信息应当明确告诉 agent 该如何修复问题。

**Enforcement:** Custom linters, structural tests, CI gates.

## 8. Commit in small, deliberate steps

无论 agent 还是人，在窄 diff 上都推理得更好。把工作拆成有节奏、可审阅的 commit，每个都承载一个连贯的步骤。别把许多互不相关或弱相关的编辑堆进一个大 commit。

**Enforcement:** Code review, commit history review.

## 9. Corrections are cheap, waiting is expensive

在 agent 高吞吐的情况下，快速 fix-forward 往往比慢闸更划算。把 merge gate 保持精简。测试 flake 用后续重跑来处理。别让流程成为吞吐的瓶颈。

**Enforcement:** CI configuration, team norms.

## 10. Garbage-collect continuously

agent 会复刻已有的 pattern——包括坏的那些。定期做清理扫描。把黄金原则编码下来，并以固定节奏扫描偏离。小而频繁的纠正胜过大而周期性的重写。

**Enforcement:** Sweep agent, scheduled CI jobs.

## 11. Agent legibility is the primary design goal

优先为 agent 的可读性来优化代码与文档。agent 在运行时无法在上下文中访问到的东西，实际上等于不存在。优先选择那些能在 repo 内被完全内化、可被推理的依赖。

**Enforcement:** Code review, architecture docs.
