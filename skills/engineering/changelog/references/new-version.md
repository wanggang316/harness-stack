# 切一个新版本

把 `[Unreleased]` 的内容移到一个带日期的版本标题下。本参考只编辑 `CHANGELOG.md`。打 tag、推送与发布属于 ship 流水线——不归本技能管。

## 输入

- 当前 `CHANGELOG.md`，且 `[Unreleased]` 内容非空。
- 最新已发布版本（取自上一个版本标题，或 `git tag --sort=-v:refname | head -n 1`）。
- 发布日期（今天，`YYYY-MM-DD`，默认 UTC）。

若 `[Unreleased]` 为空，停下并告知用户——没有可发布的内容。

## 确定版本跳级（SemVer）

检视各 `[Unreleased]` 小节，按顺序应用：

| [Unreleased] 中的触发条件 | 跳级 |
|---|---|
| 任何标了 `**BREAKING:**` 的条目、任何对公共界面的 `Removed`、任何对公共 API 的不兼容变更 | **MAJOR**（`X.0.0`） |
| 否则，任何 `Added` 条目，或 `Changed` 下的新选项 / 端点 / flag | **MINOR**（`x.Y.0`） |
| 仅有 `Fixed`、`Security`、`Deprecated`、或非功能性的 `Changed` 条目 | **PATCH**（`x.y.Z`） |

1.0 之前（`0.y.z`）的规则：
- `0.y.0` → `0.(y+1).0`：新特性**和**破坏性变更都走这条（尚不存在 MAJOR）。
- `0.y.z` → `0.y.(z+1)`：仅修复。
- 当要为 API 背书时，向用户建议 `1.0.0`。

若推断出的跳级与用户给定的版本冲突，写入前先把冲突摆出来。

## 改写文件

1. **重命名标题。** `## [Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD`。
2. **从已发布版本中剪除空小节。** 只保留有条目的类别。
3. **在顶部、新版本之上重新播种 `[Unreleased]`**，带全部六个空子小节：

   ```markdown
   ## [Unreleased]

   ### Added

   ### Changed

   ### Deprecated

   ### Removed

   ### Fixed

   ### Security
   ```

4. **排好版本块的顺序。** 在已发布版本内，保持规范的小节顺序（Added → Changed → Deprecated → Removed → Fixed → Security）。每个小节内最新在前；已前缀 `**BREAKING:**` 的条目浮到顶部。
5. **更新文件底部的链接。** 两处编辑，可链接版本（KaC 原则 4）都需要：
   - `[Unreleased]: …/compare/vX.Y.Z...HEAD`（原为 `…/compare/v<prev>...HEAD`）
   - 在上一个版本的链接之上插入 `[X.Y.Z]: …/compare/v<prev>...vX.Y.Z`

   对最最开始的首次发布，用 `…/releases/tag/vX.Y.Z` 代替 compare URL。

## 撤回（yanked）的发布

若某个已发布版本必须撤回（损坏、被污染、误发），用标记而非删除：

```markdown
## [1.4.2] - 2026-05-12 [YANKED]
```

在标题下保留原内容，让使用者能理解为何下游的版本钉死会失败。在下一个版本里加一条 Fixed/Security 条目，说明这次撤回。

## 写入前的校验

- [ ] 版本号符合 SemVer（或项目声明的方案）。
- [ ] 日期为 `YYYY-MM-DD`，是项目发布时区里的今天。
- [ ] 新版本标题紧贴在全新的 `[Unreleased]` 之下、上一个版本之上。
- [ ] 已发布版本块里不留空小节。
- [ ] 所有条目都面向用户——没有 SHA、文件路径或原始提交主题。
- [ ] 破坏性变更带 `**BREAKING:**`，且版本跳级与之相符。
- [ ] `Removed` 里的每一项要么先前在 `Deprecated` 出现过，要么有清楚交代的理由。
- [ ] 文件底部链接已更新：`[Unreleased]` 现在指向新 tag；新的 `[X.Y.Z]` 链接已插入。
- [ ] 没有重复的版本标题；各版本仍按降序排列。

把 diff 呈出以供确认。**在用户确认前不要写入。**

## 不在范围内

本参考不做：
- 创建或推送 git tag。
- 开 PR 或触发 CI。
- 发布到 registry（npm、PyPI、crates.io 等）。
- 更新 `package.json`、`pyproject.toml`、`Cargo.toml` 或类似清单里的版本字符串。

这些归 `harness-stack:pr` 与 `harness-stack:ship`。在 `CHANGELOG.md` 提交后再交接。
