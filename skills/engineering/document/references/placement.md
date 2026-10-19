# 知识落位

优先沿用目标项目现有命名和入口；`CONTEXT.md`、`docs/adr/`、模块 README 等都可继续使用。文件名不决定性质，先看它回答什么问题、是否承诺维护现状。

没有约定时，按需选择：

| 内容 | 默认位置 | 边界 |
| --- | --- | --- |
| 文档导航 | `docs/index.md` | 主题、权威位置与阅读条件 |
| 项目特有术语 | `docs/glossary.md` | 概念定义与边界，不承载实现方案 |
| 全局架构 | `docs/architecture.md` | 职责、依赖方向及跨模块关系 |
| 领域知识 | `docs/domains/<domain>.md` | 行为契约、不变量、交互与失败语义 |
| 决策记录 | `docs/decisions/NNN-<slug>.md` | 背景、理由、代价、有效状态 |
| 操作知识 | `docs/runbooks/<operation>.md` | 前提、步骤、结果检查、失败恢复 |

小项目可先放进已有 README。内容形成独立阅读主题后再拆，不按每次交付拆文件。

## 领域文档

用项目语言直接描述当前约定；只写读者需要的部分：

```markdown
# <Domain>

## Scope and ownership
## Behavior and invariants
## Interactions and failure modes
## Implementation map
## Decisions and evidence
```

契约与实现说明分开写；已知不一致明确标识。实现入口、测试、schema 和 ADR 用链接连接，不把函数清单或整份决策重复抄入正文。

## 调查结论

已验证且会指导后续工作的结论，优先融入对应领域文档或 runbook，保留适用条件和证据。只有内容独立、难以重新发现且足以避免复发时，才沿用项目的经验库或新增独立主题页。测试运行记录仍属于一次执行的证据。

## 过程记录

proposal、ticket、PR 和 handoff 保存意图、进度、偏差及执行证据。它们可以链接长期知识，但不作为当前规则的默认入口。已关闭记录保留历史背景，修正事实错误时明确注明勘误。
