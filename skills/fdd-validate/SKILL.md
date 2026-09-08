---
name: fdd-validate
description: FDD 的验证流水线——里程碑 / 最终批量闸。一条线性、成本递增的三级 gate：静态验证（scrutiny-validator 硬门禁 test/lint/type-check + 证据完整性）→ 代码审查（code-reviewer，按相关范围批量）→ user-test（运行时断言探测）。由 harness-stack:fdd-execution 在里程碑收口（scope=milestone：加条件 security-auditor + 治理反馈 + seal）与循环跑空（scope=final：加 coverage gate + fdd gate）时调用。
---

# fdd-validate：FDD 验证流水线

本技能在**里程碑收口与最终**做批量验证：对该范围的累计 diff 跑硬门禁、证据完整性检查、跨 feature code-review 与运行时探测，抓单个 feature 看不见的跨 feature 交互。（per-feature 的把关由 `fdd-execution` 的交接决策树完成。）

验证是一条**线性流水线**，三级递进、成本由低到高，每一级 gate 下一级：

1. **静态验证** — `scrutiny-validator`：对 diff 跑硬门禁 test/lint/type-check/build（只看相对 baseline 的新增失败，独立于 implementer 自报）+ 交接证据完整性检查。最便宜、最先跑——先确认「能不能跑、有没有低级问题」。
2. **代码审查** — `code-reviewer`：5 维质量 + scope/spec 合规，按相关范围批量。再确认「代码好不好、是否如约交付」。
3. **user-test** — `user-test-validator`：拉起系统、对断言逐条运行时探测，给出带证据的 PASS/FAIL。最贵、最后跑——确认「用户真能用」。

产品失败 → 按同一根因与修改范围合并修复批次，优先回原 implementer 返工；未封存的原 feature 可复位 pending；仅跨 feature 或已封存范围的独立缺口才建修复 feature，不按每条 finding 创建 feature。修复轮数按原任务或验收批次累计，不能靠新建 feature 清零。环境失败 → BLOCKED，记录恢复条件，不自动创建产品修复 feature。修复后按影响范围重跑流水线。三级全过，本次 validate 才算通过。controller 自己绝不写实现代码。

## 工具：fdd CLI

本技能所有 `fdd <subcommand>` 都指 `node <plugin-root>/packages/fdd/bin/fdd.mjs <subcommand>`——插件自带的预构建 bundle，不在 PATH 上、无需安装、无需编译（只要 Node >= 20）。定位 bundle、命令速查与故障排查见 `<plugin-root>/references/fdd-cli.md`。派发 subagent 时把解析好的完整命令填进 brief（如 scrutiny-brief 的 `{FDD_CMD}`）——subagent 是全新上下文，没有它就找不到 CLI。

## Scopes

本技能按 **scope** 复用，由 `harness-stack:fdd-execution` 调：

| scope | 谁调、何时 | diff 区间 | 断言子集 | 这一档额外做的事 |
|---|---|---|---|---|
| **milestone** | fdd-execution，里程碑收口（该 milestone 实现型 feature 全部 completed/cancelled 且未封存）| 该 milestone 的累计 diff | 该 milestone 的断言子集 | 触敏感面时并行 `security-auditor`；应用治理反馈；全过后 `fdd seal-milestone` |
| **final** | fdd-execution，循环跑空、所有 milestone 已封存 | `BASE..HEAD` 全量 | 全集（coverage） | review 转向跨 milestone 交互；stage 3 做 coverage gate；全过后 `fdd gate` |

表中的 diff 区间是已提交部分；存在未提交工作时必须附上相对 BASE 的完整受控 patch（staged/unstaged）、未跟踪文件内容清单与输入身份。三个 stage 都验证这份完整输入，不能以空的 BASE..HEAD 代替本次工作。scope 决定 diff 区间、断言子集与代码审查的视角；流水线的级次与顺序（静态 → 审查 → user-test）两档一致。

## Stage 1 — 静态验证（scrutiny-validator）

用 `references/scrutiny-brief.md` 派发 `scrutiny-validator`，独立执行本 scope 的 test/type-check/lint/build 并核对交接证据是否齐全、对应本次输入。静态 worker 不重复判断业务正确性、设计质量、测试质量或范围合规；这些归 stage 2。报告落到 `.harness-runtime/plans/<slug>/validation/<subject>/scrutiny/synthesis.json`（subject 为 milestone 名或 final）。基线必须是固定 SHA 的隔离 checkout 或对应输入的可靠已有证据；不能用 stash 假装切换基线。
**触敏感面时加派 security-auditor：** 若 diff 触及 auth/authz、secrets/crypto、用户输入边界、裸 SQL、shell/eval、依赖升级、或 LLM 输出流入受信上下文，与 scrutiny 并行发 `Task(subagent_type="security-auditor", …)`。其 Critical findings 视同硬门禁失败。（`harness-stack:security` 是流程外的独立手动审计路径。）

硬门禁新增失败 / 证据缺口 / 安全 Critical → 回 implementer 修或补齐证据，按失败项与后续变更影响重跑；影响不明则扩大检查。环境或基线无法确认时保持 BLOCKED，恢复后重验。只有 passed 才进 stage 2。

## Stage 2 — 代码审查（code-reviewer）

用 `references/code-reviewer-brief.md` 发 `Task(subagent_type="code-reviewer", …)` 做 5 维质量 + scope/spec 合规评审。评审方法、severity、Output Format 见 `agents/code-reviewer.md`。

- **milestone scope**：按相关代码范围分批覆盖全部已完成 feature，必须检查累计 diff 的跨 feature 集成。允许复用独立 early review：报告必须有 base/head、覆盖文件与行为、契约版本、结论及证据，controller 确认输入相同且后续变更未使结论失效。缺少这些证据就批量重审；early review 不替代 milestone 集成检查。
- **final scope**：以**跨 milestone 集成**视角评审全量 diff，聚焦里程碑闸覆盖不到的跨 milestone 交互。

存在未解决的本次 Critical / Important、验收缺口或 Request changes → 回 implementer 修复批次并复查；范围外历史发现按 handoff 规则进入 backlog。只有本次阻塞 findings 已解决或经授权调整范围后才进 stage 3，不能仅凭 Approve-with-fixes 标签跳过修复。

## Stage 3 — user-test（运行时探测）

对本 scope 的断言子集 + diff 区间跑运行时探测：拉起系统、按 surface cost tier 规划隔离、派发一个或多个 `user-test-validator`、合并覆盖矩阵，**由 controller 经 `fdd set-assertion <VAL-id> <status> [evidence]` 回写 `validation-state.json`**（PASS→passed、FAIL→failed、INCONCLUSIVE/SKIP/BLOCKED→blocked）。完整流程、隔离规划与覆盖规则见 `references/user-test.md`。

- **milestone scope**：探该里程碑的断言子集（抓跨 feature 交互）。
- **final scope**：核查每条断言是否有对当前交付仍有效的 PASS。检查已有证据之后的代码、依赖、配置、契约与运行环境变化；重探缺证据、失败、受影响及跨 milestone 交互断言。影响不明则扩大到相关 surface 或全量，不能仅凭历史 PASS 收口。此判断由 controller 记录在 synthesis，当前 CLI 不提供版本缓存。

产品 FAIL → 合并相关 finding，带最小 reproducer 回 implementer；修复先重探失败路径，修复批次结束后做受影响范围 sweep。昂贵 GUI sweep 按 milestone / 修复批次运行，不为每个 feature 重启全量 GUI。环境阻塞保持 BLOCKED，恢复环境后再派发。

## Per-scope 收口

- **milestone**：三级全过、security（若派了）无 Critical、user-test 全 PASS → 汇总静态报告、review 与运行时报告中的 `suggestedGuidanceUpdates` 应用治理反馈（写进 `AGENTS.md` / `docs/` Library / `fdd-execution` 的 `references/implementer-brief.md`，这是「Fix the environment, not the prompt」的闭环）→ `fdd seal-milestone <m>`。已封存的 milestone 不可变——绝不往里加 feature；新工作进后续 milestone 或一个 `misc-*` milestone（每个 ≤5 个 feature）。
- **final**：三级全过 + coverage gate 满足 → `fdd gate` 必须报告 `GATE PASSED` → 交给 commit / PR。

## Override semantics

验收延期或范围变化必须沿用用户授权，记录原因，不能为了过闸降低 contract。封存前，将获准延期的断言归属调整到未封存的后续 feature，保持 fulfills 唯一并复位 pending，重跑 coverage；本次 gate 的范围相应明确记录。已封存 milestone 不回写历史，发现后续回归按 execution 的修复批次处理。没有获准延期的失败仍阻塞验收。

## Verification

- [ ] milestone / final 的三级都按 静态 → 审查 → user-test 顺序跑过，且各级在重跑后通过。
- [ ] milestone：每个已完成 feature 都被 code-review 覆盖；synthesis 已产出、治理反馈已应用、触敏感面时 security-auditor 已派、`fdd seal-milestone` 已执行。
- [ ] final：coverage gate 满足（每条断言有对当前输入仍有效的 PASS，影响判断已记录），`fdd gate` 报告 `GATE PASSED`。
- [ ] 所有 user-test 结果已经 `fdd set-assertion` 回写 `validation-state.json`。
- [ ] controller 没有写过任何实现代码——每处修复都回到 implementer。

## Worker 与资源调度

所有验证 worker 的派发、等待、超时诊断与回收遵循 `../fdd-execution/references/worker-lifecycle.md`。controller 在 brief 中声明资源、owner 和输出路径。共享 GUI 同时只能有一个 owner；可隔离的 API / 浏览器组才可并行。构建并发上限来自项目配置与机器能力，不按平台硬编码。这是 controller 编排协议，不是假设 CLI 已有资源锁或后台守护进程。
