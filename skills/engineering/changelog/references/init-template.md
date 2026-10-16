# CHANGELOG.md 初始化模板

创建新的 `CHANGELOG.md` 时用这个脚手架。它遵循 [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) 与语义化版本（Semantic Versioning）。

## 模板

保存为项目根目录下的 `CHANGELOG.md`。

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [0.1.0] - YYYY-MM-DD

### Added

- Initial release.

[Unreleased]: https://github.com/<org>/<repo>/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/<org>/<repo>/releases/tag/v0.1.0
```

## 各小节含义

只用这六个类别，别无其它。已发布版本中某小节为空时省略它；`[Unreleased]` 里保留全部六个，让贡献者知道该把条目归到哪。

| 小节 | 用途 |
|---|---|
| Added | 新特性、新能力、端点、选项、flag |
| Changed | 现有功能的变化（兼容与破坏性皆可） |
| Deprecated | 仍可用但已排期移除的特性 |
| Removed | 本次发布中被移除的特性 |
| Fixed | 纠正错误行为的缺陷修复 |
| Security | 漏洞修复、CVE 修补、加固 |

## 可链接的版本

按 KaC 原则 4（「版本与小节应可链接」），每个版本标题在文件底部都有一条对应链接：

- `[Unreleased]` 比对最新 tag 到 `HEAD`。
- 每个已发布版本比对其前驱 tag 到自身 tag，或——对首次发布——直接链到该 tag 本身。
- 使用仓库的 compare URL 模式（GitHub：`/compare/vA.B.C...vX.Y.Z`，GitLab：`/-/compare/vA.B.C...vX.Y.Z`）。

## 初始版本号的选择

- `0.1.0` 用于仍在 1.0 之前活跃开发的项目。
- `1.0.0` 仅当你要为一套稳定的公共 API 背书时。
- 若项目已有发布但没有变更日志，从下一个计划版本开始建文件，并在有余力时从 git 历史回填先前版本；不要编造日期。

## SemVer 提醒

在文件头声明遵循 SemVer（模板已经写了）。当项目不遵循 SemVer（例如 CalVer）时，把 SemVer 那行换成实际方案并链到其规范——若并非如此，绝不让那行继续声称用的是 SemVer。
