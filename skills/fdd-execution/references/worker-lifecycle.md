# Worker 活性与回收

所有 implementer、reviewer、validator 都遵循本协议。它由 controller 和宿主的等待工具执行；`fdd log` 只记事件，**不是 watchdog，也不会唤醒已结束的 controller**。

## 派发

controller 为每次尝试分配唯一的 attempt id，在 `fdd log dispatch <attempt-id> <message>` 中记录：

- feature / validation scope、worker id、工作目录与输入 commit。
- 负责的资源、输出和日志路径、预期阶段耗时、下次检查期限。
- 修复所属的原 feature 或验收批次，以及累计尝试次数。

brief 带上 attempt id、解析好的 CLI 命令、共享 runtime 绝对路径和日志要求。跨 worktree 使用 `HS_PLAN_RUNTIME_DIR` 指向同一 runtime，显式指定 `--plan <slug>`；不要依赖另一个 worktree 的 `.active`。features/assertions 等共享状态只由 controller 写，worker 仅追加自己的事件、写自己的产物。brief 的实现写入范围不限制指定的 attempt 日志、handoff 和验证产物目录；只读 reviewer 也可通过 CLI 追加自己的操作事件，仍不得改产品代码或共享状态。

若 CLI 或协议引用不可达，先按 `<plugin-root>/references/fdd-cli.md` 核对插件根目录、Node 与 bundle；保留产物和 session，恢复工具后补记真实结果。仍无法恢复则报告具体 BLOCKED；不能手改状态或编造历史时间。

## 工作与等待

worker 在开始、阶段切换、取得新结果、受阻及结束时调用 `fdd log progress <attempt-id> <message>`。记录实际进展，例如已完成测试数、当前构建阶段或产物路径。没有新信息时不要单纯 touch 文件制造活性。

长命令优先使用可等待、可继续读取输出的前台工具 session。需要后台服务或探针时，保留进程/session id、stdout/stderr、退出状态和结果路径；将这些信息交给 controller。**启动后台命令不是完成，worker 不能以“稍后通知”为由结束唯一的等待责任。**

controller：

1. 使用宿主的有界等待或完成事件；等待结束后检查 worker 状态、进程/session、日志增量与产物。不要只等一条自然语言通知。
2. 按当前阶段预期耗时安排检查，遵守宿主单次等待上限。一次检查到期仅意味着需要观察，**不意味着中断或重派**。
3. 长构建无新输出但进程仍正常运行时继续等待。只有没有进展且超过合理阶段预算，才发消息要求状态或调查环境。
4. worker 已结束但 handoff 缺失时，检查退出状态和产物；有结果则让原 worker 补交接。失败则带证据恢复，不重复已经完成的测量。
5. 所有工作完成后立即合并结果、更新状态并报告，不等下一次定时检查。

controller 必须在当前宿主支持的等待机制下保持等待责任。若宿主要求结束回合才能继续，必须有已实际配置、符合用户授权的恢复机制；没有时明确报告暂停与恢复入口，不能声称会自动巡检。

## 恢复与资源回收

先查原 worker、进程和资源 owner，再决定恢复：

| 观察 | 动作 |
|---|---|
| 仍运行，存在进展 | 延长该阶段观察窗口，不重复派发 |
| 测量已完成，缺少报告 | 读取产物，要求补交接；不重跑探针 |
| worker 退出，命令仍运行 | 接管工具 session 的等待责任；不能接管时先明确处理旧进程 |
| 已失败，根因可修复 | 记录失败证据，修复根因，恢复同一任务/批次的预算 |
| 环境或权限不可恢复 | 标记 BLOCKED，报告人工动作，不创建产品 fix feature |

只有确认旧 attempt 不再写文件、不再占用资源后，才能交给替代 worker。锁或 owner 记录的超时不能证明进程已死。记录 `fdd log recovery <attempt-id> <message>`，保留旧 handoff/报告的 attempt 副本，避免新尝试覆盖诊断证据。
