---
name: fdd-validate
description: FDD 的里程碑 / 最终 gate。milestone 边界跑 scrutiny-validator（硬门禁 test/lint/type-check + 逐 feature scrutiny）+ 条件触发的 security-auditor + user-test，应用治理反馈，然后 seal；全部 feature 做完后跑最终集成评审 + coverage gate + hs-plan gate。由 harness-stack:fdd-execution 在 milestone 边界与收尾调用。
---

# fdd-validate：FDD 里程碑与最终 gate

per-feature 闸（code-review + 运行时探测）在 `harness-stack:fdd-execution` 的循环里完成。本技能是更重的批量 gate：抓任何单个 feature 闸覆盖不到的跨 feature 问题，并最终放行。

## Milestone validation

当一个 milestone 里每个实现型 feature 都 `completed`/`cancelled` 且该 milestone 尚未封存（`hs-plan is-sealed <m>` → `no`）时，跑里程碑的「静态 + 运行时」一对——`scrutiny-validator`（静态那一半）和 `user-test`（运行时那一半）：

1. 用 `references/scrutiny-brief.md` 发 `Task(subagent_type="scrutiny-validator", …)`。它做：**硬门禁**（对 milestone diff 跑 test/lint/type-check/build，只看相对 baseline 的新增失败——这是 per-feature 闸做不到的独立机械验证）、逐 feature scrutiny 审查（边界/规范/范围/技术债声明等）、把低风险事实性更新直接写入 `docs/` Library，并产出 `suggestedGuidanceUpdates`。结果落到 `.harness-runtime/plans/<slug>/validation/<milestone>/scrutiny/synthesis.json`。每个 feature 都已过 per-feature code-review，所以这里重在硬门禁、跨 feature 集成、技术债汇总与治理建议，不必重新纠结已逐 feature 解决的发现。
2. **触及敏感面时加派 security-auditor：** 若 milestone diff 触及 auth/authz、secrets/crypto、用户输入边界、裸 SQL、shell/eval、依赖升级、或 LLM 输出流入受信上下文，与 scrutiny 并行派 `Task(subagent_type="security-auditor", …)` 做深度威胁建模。它的 Critical findings 视同 `blocker`。（diff 不触及这些面时跳过——`harness-stack:security` 技能是独立的手动审计路径。）
3. **应用治理反馈：** 读 synthesis 的 `suggestedGuidanceUpdates`——把系统性的约定/上下文修正写进 `AGENTS.md`、`docs/` Library 或 `fdd-execution` 的 `references/implementer-brief.md`（这是「Fix the environment, not the prompt」的闭环）。`appliedUpdates` 是 validator 已提交的事实性更新，知悉即可。
4. 对该 milestone 的断言子集跑 `harness-stack:user-test`；用 `hs-plan set-assertion` 回写结果。
5. scrutiny `verdict: passed`、security-auditor（若派了）无 Critical、且 user-test 全 PASS → `hs-plan seal-milestone <m>`。任何 `blocker` / 硬门禁失败 / 安全 Critical / user-test FAIL → 在顶部创建修复 feature，修完对 scrutiny 走重跑模式、对 user-test 重探。

已封存的 milestone 不可变——绝不往里加 feature。新工作进后续的 milestone 或一个 `misc-*` milestone（每个 ≤5 个 feature）。封存后控制权回到 `fdd-execution` 的循环。

## Final integration review (once)

每个 feature 都做完、最后一个 milestone 已封存之后：

1. 对完整的 `BASE..HEAD` 发 `Task(subagent_type="scrutiny-validator", …)`——硬门禁全套 test/lint/type-check/build 全绿，外加一次跨 milestone 的集成 scrutiny（逐 milestone 评审看不到跨 milestone 交互）。
2. **Coverage gate：** 在各探测记录里，每条 contract 断言至少有一次 PASS。任何从未被探测过的 → 对其余部分跑 `harness-stack:user-test`。
3. 任何 `blocker` / 硬门禁失败 → 经 implementer 循环修复，重跑 scrutiny。
4. `hs-plan gate` → 必须报告 `GATE PASSED`。然后交给 commit / PR。

## Override semantics

你可以带理由覆盖一次 validator 失败，但**绝不能悄悄来**——要留下可审计的记录。要封存一个带延期断言的 milestone，把那些 `VAL-` id 从已封存 milestone 的 feature 里挪到一个**未封存** milestone 的某个 feature 中（保持 `fulfills` 唯一；确保它们在 state 里是 `pending`，好让后续探测拾起它们），并在 `plan.md` 的 Decision Log 里记下这次延期。
