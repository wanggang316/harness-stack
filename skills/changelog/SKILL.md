---
name: changelog
description: 创建并维护 CHANGELOG.md。在初始化变更日志、从 git 历史中提取未发布变更、或准备发布某个版本时使用。
---

# changelog：变更日志

按 [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) 与语义化版本（Semantic Versioning）维护 `CHANGELOG.md`。

## 按意图分流

| 场景 | 子流程 |
|---|---|
| 项目里还没有 `CHANGELOG.md` | [references/init-template.md](references/init-template.md) |
| 把近期 git 改动收进 `[Unreleased]` | [references/extract-changes.md](references/extract-changes.md) |
| 发布——把 `[Unreleased]` 移到一个带日期的版本标题下 | [references/new-version.md](references/new-version.md) |

初始化完成后，按需再分流到 extract 或 new-version。每个子流程各自管自己的规则、草稿与校验；在用户确认草稿前，绝不写入文件。

## 何时跳过

不影响用户的内部重构、测试、CI/构建、或纯文档改动。
