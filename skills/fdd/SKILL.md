---
name: fdd
description: 构建非平凡特性的契约优先编排器。规划需求与断言、拆解 feature，调度 implementer 和独立验证，在 milestone/final 收口。主流程调用 fdd-planning（含 validation-contract）、fdd-execution 与 fdd-validate。
---

# fdd：特性驱动开发

进入 FDD 模式：controller 定义完成条件、策划上下文并驱动 worker；不编辑实现代码。用户目标来自当前对话或 `$ARGUMENTS`。

## 使用范围

适用于多文件、多验收条件或跨 feature 的构建。琐碎改动直接处理；形态未知的探索或重大未决方案先调查/讨论。`harness-stack:design` 是独立的人类入口，FDD 可读取已有设计但不强制生成设计文档。

## 职责

- `investigator`：规划、范围变化和疑难失败的只读调查。
- `implementer`：实现有边界的 feature 或修复批次，完成自验并交接真实证据。
- `scrutiny-validator`：独立执行工具门禁及交接证据完整性检查。
- `code-reviewer`：独立审查正确性、测试质量、设计与 scope/spec；高风险/阻塞下游时前置，其他按批次审查。
- `user-test-validator`：不读实现源码，从运行系统外部验证 contract。
- `security-auditor`：触及敏感边界时按 fdd-validate 条件加派。

每次派发和等待遵循 execution 的 worker lifecycle。只有明确隔离、依赖与资源预算时并行实现；共享 GUI 保持单 owner。保持新鲜的独立验证上下文，原任务的局部返工可交原 implementer。

## 状态位置

| 位置 | 内容 | 版本控制 |
|---|---|---|
| `.harness-runtime/plans/<slug>/` | plan、contract、features/state、handoffs、sealed milestones、事件与验证产物 | gitignored |
| `docs/` | 产品/架构/API/UI 约定、测试方法与耐久知识 | 是 |

每条用户需求都记录到 plan；每条 contract 断言恰由一个 feature 认领。代码描述已实现的事实，contract 描述要证明的行为；不能为通过 gate 降低要求。

## CLI

`fdd <command>` 指 `node <plugin-root>/packages/fdd/bin/fdd.mjs <command>`，Node >= 20，无需安装或编译。完整路径解析和命令见 `<plugin-root>/references/fdd-cli.md`。

状态转换、断言结果和 handoff 经 CLI；不以脚本手改已有 JSON 状态。CLI 尚无 feature 创建/编辑命令时，controller 按规划 schema 编写或调整清单定义，随后跑 coverage；这不允许绕过 `set-status`。`fdd log` 用系统时钟记录事件，`fdd progress` 生成人可读状态。Decision Log 与 Backlog 由 controller 记录判断，避免重复抄写机器状态。

CLI 不执行自动巡检、依赖调度、GUI 锁或证据缓存；这些责任必须由 controller/项目工具真实履行。

## 三步主流程

### 1. Plan — `harness-stack:fdd-planning`

复述目标、捕获范围与验收意图，按已有授权确认必要的未决事项。初始化 plan，调查代码与环境，定义 milestone 和验证分层，写 plan 并呈现。

调用 `fdd-validation-contract` 定义稳定的 `VAL-<AREA>-NNN` 断言，再以 `fdd init-state` 播种状态；contract 存在后才拆解 features，`fdd contract-coverage` 通过才能执行。规划规则详见对应子技能。

规划须明确构建 slots、共享 GUI/设备、项目 preflight、worker 等待责任，以及首次可用构建的真实使用检查。平台细节属于项目，不能把某台机器的端口或并发上限写成通用规则。

### 2. Execute — `harness-stack:fdd-execution`

核验依赖与资源 → 登记 attempt → 派 implementer → 有界等待并检查进展 → 自验/交接 → 必要早期 review → 集成后完成。

feature `completed` 仅表示实现和声明的自验、交接已满足；独立行为验收由后续 gate 证明。局部返工保留原任务上下文，finding 按根因合并为修复批次，范围外债务进入 backlog。新 fix id 不重置验收批次预算。

### 3. Validate — `harness-stack:fdd-validate`

milestone 收口：独立工具门禁 → 代码审查 → 运行时验证；昂贵 GUI 按 milestone/修复批次 sweep，保留最小失败 reproducer。通过后 seal。

final：确认无活动 worker、未集成产物或非终态任务，检查跨 milestone 交互、后续改动影响和有效覆盖，再执行 `fdd gate`。相同输入的有效证据可按验证规则复用，历史 PASS 不自动证明当前版本。

环境失败归 BLOCKED，先恢复环境；测量已完成但报告丢失时补交接，不重复整轮验证。宿主不支持自动恢复时明确报告限制，不许承诺不存在的后台监控。

## 中途变化与交付

需求变化按 execution 的范围传播规则更新共享事实和失效断言。controller 仅编辑运行时 artifacts 与授权的耐久文档；代码修改、集成和修复交 implementer。所有提交、外部操作沿用用户授权，技能本身不扩大权限。

完成后报告交付内容、有效验证证据、剩余人工动作和产物位置。尚有必须的人工验收时不能宣布 final gate 完成；用户授权延期时记录范围与覆盖变化。

## Verification

- [ ] plan → contract → features 顺序与唯一 coverage 成立。
- [ ] worker 有活性检查和结果回收责任，无后台命令被遗弃。
- [ ] 资源并发符合项目声明，所有实现结果已集成并自验。
- [ ] 修复预算与范围受控，未将无关债务强制加入本轮。
- [ ] milestone/final 独立验证通过，证据适用于当前系统。
- [ ] controller 未编辑实现代码，提交遵守授权。
