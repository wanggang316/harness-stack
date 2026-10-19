---
name: design
description: 为存在重大取舍、跨模块影响或迁移风险的变更形成可评审的设计方案；也可修订或关闭已有方案。
disable-model-invocation: true
---

# design

产出一份服务于本次变更的 proposal。沿用项目已有设计目录和语言；没有约定时放在 `docs/proposals/<slug>.md`。普通改动可直接用现有任务描述，说明无需另建方案的理由。用户明确要求文档时仍写。

## 1. Establish the baseline

读取相关当前文档、有效 ADR、任务及代码入口，区分已实现行为、已批准契约和本次意图。已有讨论足够时直接综合；只有会改变关键取舍的缺口才询问。代码与契约不一致时标为待判定冲突，不默认为契约错误。

结论：明确问题、影响边界、必须保持的约束，以及仍需决定的事项。

## 2. Write the proposal

已有同一变更的方案就原位修改。新方案用 `Status: Proposed`，正文只保留有内容的部分：

```markdown
# <Change title>

Status: Proposed

## Problem and scope
## Current constraints
## Proposed changes
## Alternatives and trade-offs
## Validation
## Migration and rollback
## Open decisions
## References
```

- 明确哪些行为、接口或边界将改变，哪些保持；链接当前知识的权威位置，不复制完整现状。
- 写出可行替代方案、推荐选择和代价。模块交互复杂时用最小示意图；代码片段只用于精确表达状态机、schema 或契约。
- 验证覆盖行为边界与失败路径，优先现有测试接口。迁移与回退只在相关时写；不可逆步骤明确写出。
- 区分确认的决定与假设。拟新增路径标明 proposed，已有路径先确认存在。

结论：方案足以评审核心取舍，未决事项集中可见。

## 3. Review

向用户简述推荐方案、主要代价和未决事项。已在会话中批准的决定直接记录；新增重要方向取得决定后才标为 `Accepted`。本 skill 到方案评审为止，不修改产品代码或发布 ticket。

结论：记录批准范围；尚未确定的方案保持 `Proposed`。

## 4. Close an existing proposal

仅在用户要求关闭方案或当前任务包含交付收尾时执行。检查实际交付、偏差及验证证据，分别说明实现、合并与部署状态。

- 已完成：标为 `Closed`，附交付证据和相关当前文档、ADR 的链接。
- 已放弃：标为 `Withdrawn`，简述原因。
- 已被新方案替代：标为 `Superseded`，链接替代方案。

当前知识仍未更新时列为收尾缺口，保持方案未关闭。无需新增知识时注明理由。沿用项目归档约定；没有约定时原位保留关闭状态即可。

关闭后的方案保存当时背景；后续变化写新方案，不把旧方案改成当前系统说明。执行经过与测试输出优先引用已有 PR 或任务记录，不默认生成 action log 或 amendment。

结论：方案已关闭且可追溯，或明确列出尚未满足的关闭条件。
