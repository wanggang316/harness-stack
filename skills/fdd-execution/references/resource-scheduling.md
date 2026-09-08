# 执行资源与修复批次

## 资源调度

默认一个实现任务；只有 plan 明确列出依赖、写入范围、隔离工作目录和集成顺序后，才并行派发独立任务。`fdd next-feature` 仅返回首个 pending，**不是依赖求解器或原子任务领取器**。controller 读取清单、确认 preconditions，逐个置 `in_progress` 后派发；所有状态变更单写者串行执行。

| 资源 | 规则 |
|---|---|
| 源码写入 | 每个并行 implementer 独立 worktree；共享 checkout 内不并行写入 |
| 构建 | plan 声明 slot 数；未知时从 1 开始，以构建耗时和机器负载调整。只需运行既有探针的任务不重复构建 |
| GUI / 设备 / 共享账号 | 按实际共享边界定义 lane；单 lane 同时只有一个 owner |
| 测试数据 | 分组前确认 fixture/账号/数据库隔离，worktree 隔离不等于外部状态隔离 |

GUI owner 覆盖 preflight、启动、探测、reset 和 teardown 全过程。只有资源 owner 能操作该 lane；编译 slot 与 GUI lane 分开分配。若需要两种资源，controller 一次安排或让任务释放现有资源后排队，避免互相持锁等待。项目有锁工具时在所有入口共用；没有时由单 controller 排队并记录 owner，不能声称已有跨进程锁保护。其他 controller/人工会话也使用该资源时，先建立共同协调方式。

并行 worker 将 handoff 写到自己的 attempt 产物目录，返回路径；controller 串行执行 `fdd write-handoff` 和状态更新。worker 不运行 `set-status` / `set-assertion` / `use`，不编辑 features/state JSON。

## 集成与早期审查

controller 按已记录的依赖顺序安排集成；集成代码操作由 implementer 完成。独立 worktree 的自验不等于集成验收：记录合入后的 commit，运行受影响的集成测试，之后才把该 feature 置 `completed`。合并冲突或依赖变化作为原任务返工，不能跳过验证。

涉及公共接口、安全边界、数据迁移，或将成为其他任务依赖的改动，在消费者开始前派独立 code-reviewer。紧密相关的小任务可共享一次批次审查。review 记录输入 commit、范围、findings 与结论；同一代码范围的有效审查可在 milestone 复用，集成交互仍由 milestone 审查。

## 修复批次

finding 先按以下顺序处置，再决定是否产生 feature：

1. 复现并区分产品缺陷、环境阻塞、报告缺失和范围外债务。补报告无需重做已有测量；环境恢复不计作产品功能。
2. 同一根因、紧密相关写入范围和验证入口的 findings 合成一个有边界的修复批次。无关修改不为了减少次数而合并。
3. 未验收的原 feature 优先返回原 implementer，用 follow-up 修复；其上下文不足或不可恢复时才换新 worker。
4. 跨 feature 的集成缺陷新建一个修复 feature；在 description 中记录原验收批次、全部 finding id、最小 reproducer 和回归范围。不要每条 finding 建一个 feature。
5. 修复任务通常 `fulfills: []`，原行为的断言归属不变；修复改变需求时才更新 contract/归属并重跑 coverage。受影响的 passed 断言立即经 CLI 复位 pending，修复后验证。

未封存 milestone 可复位原 feature 为 pending；已封存 milestone 不回写历史清单，后续修复放到未封存 milestone，并继承原验收批次预算。**三轮实现/修复后仍不收敛，回到根因与范围判断，必要时上交；换 feature id、worker 或 milestone 不重置预算。** 基础设施恢复单独记录耗时与次数。

每轮先跑失败的最小 reproducer 和受影响测试，再做本批次的 GUI sweep；不为每条 finding 重启同一整套 GUI。发现可复用的同类缺陷检查时，在适用范围内补充通用探针并验证能抓住原缺陷，避免为单个偶发现象过度泛化。
