---
name: fdd-execution
description: FDD step 2。按依赖与资源调度 implementer、自验和交接，维护 worker 活性与修复批次；在 milestone/final 调用 fdd-validate。由 harness-stack:fdd 在 contract-coverage 通过后调用。
---

# fdd-execution：执行与交接

controller 编排，implementer 实现。feature 的 `completed` 表示实现已集成、声明的自验通过且交接有效；**不表示 milestone 的独立审查和用户行为验证已通过**。断言是否通过由 validation-state 记录。

## 工具与协议

`fdd` 指 `node <plugin-root>/packages/fdd/bin/fdd.mjs`，无需安装或构建，Node >= 20。定位与完整命令见 `<plugin-root>/references/fdd-cli.md`。

- 派发任何 worker 前读 [worker-lifecycle.md](references/worker-lifecycle.md)：登记 attempt、等待、检查进展、恢复与回收。
- 安排并行实现、共享构建/GUI 或修复时读 [resource-scheduling.md](references/resource-scheduling.md)：资源 owner、串行状态写入、集成与修复预算。
- 收到结果后走 [handoff-handling.md](references/handoff-handling.md)。

controller 不编辑实现代码。默认一个 implementer；有隔离 worktree、明确依赖与集成策略时可并行独立任务。共享 GUI 仍按 lane 串行。CLI 不提供调度器、资源锁或自动唤醒。

## 开始与恢复

```bash
fdd contract-coverage
fdd list-features
fdd progress
```

固定 plan runtime、工作目录、BASE commit、资源预算、项目 preflight 命令和验证分层。检查工作树与现有 worker；恢复会话时先对照事件、实际进程和 handoff 回收遗留任务，不能因为没有 pending 就进入 final。

## 执行循环

1. **选择。** `fdd next-feature` 提供首个 pending 候选。controller 核验依赖、写入范围和资源可用性；并行候选须单独核验。缺少前置条件先调查，不能盲目派发或取消仍需完成的需求。
2. **派发。** `fdd set-status <id> in_progress`，记录 `fdd log dispatch <attempt-id> <message>`。使用 [implementer-brief.md](references/implementer-brief.md)，给出自验步骤、边界、代码阅读入口、工作目录、资源分配、CLI/runtime 和 attempt 信息。不内联完整 plan/contract。
3. **等待。** 履行 lifecycle 协议；长命令必须有人等待退出并回收结果。实际阶段推进写 `fdd log progress <attempt-id> <message>`；时间由 CLI 生成。
4. **交接与集成。** 按 handoff 决策树处理成功、返工、阻塞和范围外发现。并行 worktree 的结果由 controller 串行登记，安排 implementer 集成与集成后自验。高风险或阻塞下游的改动在消费者开始前完成独立 review。
5. **完成。** 证据与集成均满足后 `fdd set-status <id> completed`，记录 `fdd log completed <attempt-id> <message>`。用 `fdd progress` 展示当前状态，不重复手写 plan 的 Progress 或分钟级时间戳。
6. **里程碑。** 该 milestone 全部实现任务 completed/cancelled、无活动 worker/未集成结果时，调用 `harness-stack:fdd-validate(scope=milestone)`。未通过先按修复批次处理，再重验；通过后封存。
7. **最终。** 无 pending、in_progress、partial、failure 或未处理 handoff，全部 milestone 已通过并封存后，调用 `fdd-validate(scope=final)`。确认最终证据仍有效且 `fdd gate` 通过，再报告交付。

若有非终态任务但没有可派发任务，调查阻塞依赖并报告，不能把空队列当作完成。

## 验证与修复

feature 自验以目标单测、必要编译/静态检查为主；GUI 缺陷修复包含最小 reproducer。昂贵的完整 GUI sweep 明确归 milestone/修复批次，不能先列为 feature 必跑步骤、失败后再偷偷降级。未通过自验的工作不能标 completed。

milestone 负责独立工具门禁、代码审查与集成行为验证；final 检查跨 milestone 交互和当前有效覆盖。同输入证据可由 validator 按范围核对后复用，历史 PASS 本身不够。三级细则以 `fdd-validate` 为准。

finding 按根因和范围合并，优先原任务返工；范围外历史债务记录到 backlog。三轮预算沿原 feature/验收批次累计，换 fix id 不重置。每次修复前记录根因与待验范围，不在相同条件下重复派发。

## 提交与范围变化

遵守用户与仓库的提交授权。允许提交时 implementer 保留原子 commit 与干净树；用户明确要求不提交时，在 brief 里改用受控 diff/产物交接并标明尚未提交，不能仅因遵守用户要求而判失败。并行集成依赖 commit 的模式在无提交授权时不可用，退回串行。

用户中途调整需求时，沿用已知授权；仅对影响正确性、架构或安全边界的未决事项澄清。必要时派 investigator，更新 plan 与相关 contract、features 及耐久约定。修改 contract 后 `fdd init-state`，语义改变或证据失效的断言**立即**复位 pending，再跑 `fdd contract-coverage`。更新完成后才恢复受影响 worker；不受影响的隔离工作可继续。

范围收缩保留 cancelled 历史，移除被撤销的 contract 断言与对应 fulfills。新增行为不得借“修复”绕过范围记录。

## Verification

- [ ] 每个 attempt 有 owner、工作目录、产物与等待责任，结束后已回收。
- [ ] 构建 slot 与 GUI lane 分开管理，无重复 worker 写入或共享状态并发更新。
- [ ] completed 的实现满足自验与集成要求，未冒充已通过行为验证。
- [ ] 修复按批次收敛，范围外债务已记录，预算未因新 id 重置。
- [ ] milestone/final 的独立验证通过；无遗留非终态任务或失效 PASS。
