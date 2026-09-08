# Handoff decision tree

读取 `fdd handoff <feature-id>`（隔离 worker 先由 controller 登记其产物）。先按 attempt 核对输入版本、输出目录和 worker 状态；旧结果不能覆盖新尝试。结果存档后记录 `fdd log handoff <attempt-id> <message>`。

## A — `returnToController: true`

查 `criticalContext`、已有产物和日志：

| 原因 | 动作 |
|---|---|
| 缺少 precondition | 调查真实依赖，补齐或调整任务顺序 |
| 行为/边界无法确定 | 用已有上下文消歧；涉及未授权范围、安全或重大架构决策才回到用户 |
| 外部服务/GUI 环境不可用 | 单独记录环境 BLOCKED，恢复或请求必要人工动作，不创建产品 fix feature |
| 工作树/进程状态异常 | 先查 owner，不清理未知改动，不重复派发 |

根因解决、旧 attempt 释放资源后，复位 pending 并继续原任务预算。不能把未完成工作标 completed。

## B — `failure` / `partial`

1. 先检查是否仅缺报告或证据路径；已有真实测量就补交接，不重跑整套验证。
2. 已知根因交原 implementer follow-up，明确剩余 expectedBehavior、最小 reproducer 和回归范围。原上下文不可用时才交新 worker。
3. 根因不明、重复失败或跨模块冲突时派 investigator，读取失败证据，输出根因与一个有边界的修复方案。
4. 按 [resource-scheduling.md](resource-scheduling.md) 合并同根因 findings。尚未验收的 feature 复位 pending；只有缺口独立或跨 feature 才建修复 feature。不为每条 finding 新建任务。
5. 实现及里程碑返工共享原 feature/验收批次的三轮预算。功能和验证缺口未解决前不能报完成。

## C — `success`

核验：

- `commits[]` 在指定工作目录存在，完整 SHA 与本次输出匹配；检查确切 SHA，不只看最近五条 log。
- 自己负责的工作树符合 brief 的交接方式；用户明确不提交时检查受控 diff/产物，不能强行要求 commit。并行结果还需集成与集成后验证。
- 每个 `verificationStep` 有真实命令、退出结果和证据路径；缺少已要求的自验按 partial 处理。计划归 milestone 的 GUI sweep 不是 feature 漏做事项。
- 已知正确性 concern 影响 expectedBehavior 时按 partial 处理，即使 worker 自报 success。

### 发现的问题

| 归属 | 处理 |
|---|---|
| 本次引入的 bug / 验收缺口 / 阻塞集成的缺陷 | 回原任务或归入修复批次；不能以低优先级跳过 |
| 无关历史 bug / tech-debt | 记入 plan 的 Backlog：来源、影响、延期理由与后续归属；不自动加入本轮 milestone |
| nit | 有实际价值且范围允许时处理，否则附理由关闭 |
| 范围内未完成工作 | 保持原任务 pending 或拆出明确缺口，不能伪装成范围外债务 |

“已记录”不等于“本轮必须修”。不能用严重度标签替代范围判断；若历史缺陷确实阻塞本次验收，说明因果并纳入修复批次。无需用户授权的外部 issue 不自动创建或发送。

### 必要上下文

项目耐久事实进 `docs/`；feature 的剩余上下文进 brief/description；决策写 plan 的 Decision Log。handoff JSON 保留证据，事件保留时间与引用，不把整份报告重复抄进多处。

完成核验、必要早期 review 和集成后：

```bash
fdd set-status <feature-id> completed
fdd log completed <attempt-id> <message>
fdd progress
```

milestone 验证仍须通过才能 seal，completed 不等于断言 passed。
