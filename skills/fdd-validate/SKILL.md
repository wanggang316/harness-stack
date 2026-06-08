---
name: fdd-validate
description: FDD 的验证流水线——里程碑 / 最终批量闸。一条线性、成本递增的三级 gate：静态验证（scrutiny-validator 硬门禁 test/lint/type-check + 逐 feature scrutiny）→ 代码审查（code-reviewer，逐 feature）→ user-test（运行时断言探测）。由 harness-stack:fdd-execution 在里程碑收口（scope=milestone：加条件 security-auditor + 治理反馈 + seal）与循环跑空（scope=final：加 coverage gate + fdd gate）时调用。
---

# fdd-validate：FDD 验证流水线

本技能在**里程碑收口与最终**做批量验证：对该范围的累计 diff 跑硬门禁、跨 feature scrutiny、code-review 与运行时探测，抓单个 feature 看不见的跨 feature 交互。（per-feature 的把关由 `fdd-execution` 的交接决策树完成。）

验证是一条**线性流水线**，三级递进、成本由低到高，每一级 gate 下一级：

1. **静态验证** — `scrutiny-validator`：对 diff 跑硬门禁 test/lint/type-check/build（只看相对 baseline 的新增失败，独立于 implementer 自报）+ 逐 feature scrutiny 审查。最便宜、最先跑——先确认「能不能跑、有没有低级问题」。
2. **代码审查** — `code-reviewer`：5 维质量 + scope/spec 合规，逐 feature。再确认「代码好不好、是否如约交付」。
3. **user-test** — `user-test-validator`：拉起系统、对断言逐条运行时探测，给出带证据的 PASS/FAIL。最贵、最后跑——确认「用户真能用」。

任一级失败 → 在 features 顶部建修复 feature、回 implementer 修 → 对该范围重跑流水线。三级全过，本次 validate 才算通过。controller 自己绝不写实现代码。

## Scopes

本技能按 **scope** 复用，由 `harness-stack:fdd-execution` 调：

| scope | 谁调、何时 | diff 区间 | 断言子集 | 这一档额外做的事 |
|---|---|---|---|---|
| **milestone** | fdd-execution，里程碑收口（该 milestone 实现型 feature 全部 completed/cancelled 且未封存）| 该 milestone 的累计 diff | 该 milestone 的断言子集 | 触敏感面时并行 `security-auditor`；应用治理反馈；全过后 `fdd seal-milestone` |
| **final** | fdd-execution，循环跑空、所有 milestone 已封存 | `BASE..HEAD` 全量 | 全集（coverage） | scrutiny 转向跨 milestone 交互；stage 3 做 coverage gate；全过后 `fdd gate` |

scope 决定 diff 区间、断言子集与 scrutiny 的视角；流水线的级次与顺序（静态 → 审查 → user-test）两档一致。

## Stage 1 — 静态验证（scrutiny-validator）

用 `references/scrutiny-brief.md` 发 `Task(subagent_type="scrutiny-validator", …)`，在 brief 里写明 **scope**：对 milestone / 全量 diff 跑硬门禁（相对 baseline 新增失败）+ 逐 feature（milestone）/ 跨 milestone（final）scrutiny，把低风险事实性更新直接写入 `docs/` Library，产出 `suggestedGuidanceUpdates`，synthesis 落到 `.harness-runtime/plans/<slug>/validation/<scope>/scrutiny/synthesis.json`。milestone 很大（>~8 个 feature）时，validator 会建议并行深审——controller 可据此在 stage 2 并行派 code-reviewer。

**触敏感面时加派 security-auditor：** 若 diff 触及 auth/authz、secrets/crypto、用户输入边界、裸 SQL、shell/eval、依赖升级、或 LLM 输出流入受信上下文，与 scrutiny 并行发 `Task(subagent_type="security-auditor", …)`。其 Critical findings 视同硬门禁失败。（`harness-stack:security` 是流程外的独立手动审计路径。）

硬门禁失败 / blocker / 安全 Critical → 回 implementer 修，重跑（scrutiny 走重跑模式：只重验失败项 + 变更过的 feature）。通过才进 stage 2。

## Stage 2 — 代码审查（code-reviewer）

用 `references/code-reviewer-brief.md` 发 `Task(subagent_type="code-reviewer", …)` 做 5 维质量 + scope/spec 合规评审。评审方法、severity、Output Format 见 `agents/code-reviewer.md`。

- **milestone scope**：对该 milestone 每个已完成 feature 的 diff 逐个评审（feature 多时并行派多个 code-reviewer）——per-feature 的代码审查在这里批量做。
- **final scope**：以**跨 milestone 集成**视角评审全量 diff，聚焦里程碑闸覆盖不到的跨 milestone 交互。

存在 Critical / Request changes → 回 implementer；Approve 或 Approve-with-fixes（无 Critical）→ 进 stage 3。

## Stage 3 — user-test（运行时探测）

对本 scope 的断言子集 + diff 区间跑运行时探测：拉起系统、按 surface cost tier 规划隔离、派发一个或多个 `user-test-validator`、合并覆盖矩阵，**由 controller 经 `fdd set-assertion <VAL-id> <status> [evidence]` 回写 `validation-state.json`**（PASS→passed、FAIL→failed、INCONCLUSIVE/SKIP/BLOCKED→blocked）。完整流程、隔离规划与覆盖规则见 `references/user-test.md`。

- **milestone scope**：探该里程碑的断言子集（抓跨 feature 交互）。
- **final scope**：coverage gate——在所有探测记录里，每条断言至少一次 PASS；任何从未探过的，对其余部分补探。

任何 FAIL → 带失败断言的证据回 implementer，重探。

## Per-scope 收口

- **milestone**：三级全过、security（若派了）无 Critical、user-test 全 PASS → 读 synthesis 的 `suggestedGuidanceUpdates` 应用治理反馈（写进 `AGENTS.md` / `docs/` Library / `fdd-execution` 的 `references/implementer-brief.md`，这是「Fix the environment, not the prompt」的闭环）→ `fdd seal-milestone <m>`。已封存的 milestone 不可变——绝不往里加 feature；新工作进后续 milestone 或一个 `misc-*` milestone（每个 ≤5 个 feature）。
- **final**：三级全过 + coverage gate 满足 → `fdd gate` 必须报告 `GATE PASSED` → 交给 commit / PR。

## Override semantics

你可以带理由覆盖一次 validator 失败，但**绝不能悄悄来**——要留下可审计的记录。要封存一个带延期断言的 milestone，把那些 `VAL-` id 从已封存 milestone 的 feature 里挪到一个**未封存** milestone 的某个 feature 中（保持 `fulfills` 唯一；确保它们在 state 里是 `pending`，好让后续探测拾起它们），并在 `plan.md` 的 Decision Log 里记下这次延期。

## Verification

- [ ] milestone / final 的三级都按 静态 → 审查 → user-test 顺序跑过，且各级在重跑后通过。
- [ ] milestone：每个已完成 feature 都被 code-review 覆盖；synthesis 已产出、治理反馈已应用、触敏感面时 security-auditor 已派、`fdd seal-milestone` 已执行。
- [ ] final：coverage gate 满足（每条断言≥1 次 PASS），`fdd gate` 报告 `GATE PASSED`。
- [ ] 所有 user-test 结果已经 `fdd set-assertion` 回写 `validation-state.json`。
- [ ] controller 没有写过任何实现代码——每处修复都回到 implementer。
