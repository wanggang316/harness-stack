# Documentation

本目录是全部项目知识的 **system of record**（权威记录）。不在这里，对 agent 而言就等于不存在。

## Structure

| Directory / File | Purpose |
|---|---|
| [architecture.md](architecture.md) | 系统架构、domains、layers |
| [golden-rules.md](golden-rules.md) | 受约束的原则与约定 |
| [design-docs/](design-docs/) | 技术设计文档（人工撰写） |
| user-test-patterns.md | 全项目测试约定（工具链、cost tier、personas） |
| [references/](references/) | 外部 references、API 文档、集成说明 |
| [generated/](generated/) | 自动生成的 artifacts —— 不要手动编辑 |

逐 plan 的 fdd 状态（plan、validation contract、feature）存放在被 gitignore 的 `.harness-runtime/plans/<slug>/` 树里——不在 `docs/`。Library 保存持久的约定与记忆；具体实现以代码为准。

## Conventions

- 每篇文档都应足够自包含，让 agent 能据此直接行动
- 文档之间使用相对链接
- 文档保持聚焦：一个文件一个概念
- 文档应标记为废弃，而非直接删除
