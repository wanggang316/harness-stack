# 把变更提取进 [Unreleased]

把近期 git 历史收进 `CHANGELOG.md` 的 `[Unreleased]` 小节。

## 1. 确定范围

- 默认区间：`<latest version tag>..HEAD`。用 `git describe --tags --abbrev=0` 或 `git tag --sort=-v:refname | head -n 1` 求得。
- 找不到 tag：从上下文推断（首次发布、自 `CHANGELOG.md` 上次改动以来的 `main`）。仅在含糊时才问。
- 在读取历史前，先展示求得的区间与提交数以供确认。

## 2. 读取 git 历史

```
git log --no-merges --pretty=format:'%h%x09%s%x09%b%x09%an' <range>
```

对每个提交，抓取：
- Conventional Commit 的 type/scope/breaking 标记（`feat!:`、`BREAKING CHANGE:` footer）。
- 主题里的 PR 号（`(#123)`）或 `gh pr list --search <sha>`。
- `Fixes #N` / `Closes #N` footer。

## 3. 过滤：收录 vs. 跳过

**收录**（面向用户——任何运行、集成或运维本产品的人都能感知）：
- 新行为、选项、flag、命令、API 端点、UI 界面。
- 改动的默认值、输出格式、schema、配置键。
- 移除或弃用的功能。
- 改变可观测行为的缺陷修复。
- 安全修复、漏洞补丁。
- 大到用户能察觉的性能变化。
- 影响运行时的依赖变更（最低版本上抬、新增 peer 依赖）。

**跳过**（仅内部）：
- `chore:`、`refactor:`、`test:`、`ci:`、`build:`、`style:`，除非它们改变了用户可见的行为。
- 纯文档改动（`docs:`），除非记录的是面向用户的契约。
- 内部重命名、死代码清理、lint/格式化扫除。
- 对同一区间内提交的回退（算清净效果，两者都不列）。
- 内部代码里的拼写订正。

含糊时，自问：「读它的使用者会在意吗？」

## 4. 分类

| 类别 | 归在这里的内容 | 典型提交信号 |
|---|---|---|
| Added | 新特性、新能力、端点、选项、flag | `feat:`、"add"、"introduce"、"support" |
| Changed | 现有功能的变化（兼容与破坏性皆可） | 作用于现有界面的 `feat:`、带行为变化的 `refactor:`、`perf:` |
| Deprecated | 仍可用但已排期移除的特性 | `deprecate:`、"deprecated"、"will be removed" |
| Removed | 本次发布中被移除的特性 | "remove"、"drop"、"delete <public API>" |
| Fixed | 纠正错误行为的缺陷修复 | `fix:`、"correct"、"resolve" |
| Security | 漏洞修复、CVE 修补、加固 | `security:`、CVE ID、安全公告引用 |

规则：
- 破坏性变更 → **Changed**（若特性已没了则归 **Removed**）。在该行前缀 `**BREAKING:**`。
- 绝不臆造弃用。仅当某个已有提交明确声明时，才把计划移除列在 Deprecated 下；并写明计划移除的版本。
- 单个 PR 可能在多个小节产生条目——把它拆开。

## 5. 归并与转译

- **归并**同一 Unreleased 窗口内的后续修复进其源条目。`feat: X` + `fix: X edge case` → 一条已反映该修复的 Added 条目。
- **转译**提交术语为面向用户的语言：
  - "Refactor `UserService` to use repository pattern" → 跳过（内部）。
  - "feat(api): add cursor pagination to /v1/items" → Added: "Cursor pagination on `GET /v1/items` (#412)."
  - "fix: NPE in date parser when tz missing" → Fixed: "Date parser no longer crashes when the input lacks a timezone (#418)."
- **命名界面**，而非文件：用户实际打交道的命令、端点、flag、组件或配置键。

## 6. 条目规则

- 每条变更一行；不要段落、不要 diff、不要文件路径、不要 SHA。
- 句子式大小写；自然时以动词开头；以句号结尾。
- 尽量链到 PR 或 issue：`(#123)`。
- 各小节内最新条目在前；前缀 `**BREAKING:**` 的条目浮到顶部。
- 仅当能提升可读性时，才把同形条目（例如若干新端点）归到一个要点下、带一个嵌套列表。

## 7. 先起草，再确认

- 以最终 markdown 的精确样子，在消息里给出草稿。
- 把有意跳过的提交连同一个单词理由（`refactor` / `test` / `ci` / `docs` / `internal`）列出，便于用户推翻。
- 标注不确定的分类（例如「把这条 `perf:` 列在了 Changed 下——若它纠正的是回归，请移到 Fixed」）。
- **在用户确认前，不要写入文件。**

## 常见借口

| 借口 | 现实 |
|---|---|
| 「git log 就是我们的变更日志」 | git log 有噪音——合并提交、重构、拼写订正。用户需要的是经过梳理的摘要。 |
| 「等发布时再写」 | 到那时一半的改动已经忘了。增量地记录。 |
| 「没人看变更日志」 | 升级者会看。排查事故的支持工程师会看。 |
| 「PR 标题不言自明」 | PR 标题是写给评审者的，不是终端用户。转译成面向用户的语言。 |

## 校验

- [ ] [Unreleased] 小节在文件顶部。
- [ ] 每条都面向用户——没有 SHA、文件路径或原始提交主题。
- [ ] 每条都落在正确的类别下。
- [ ] 有 PR / issue 时已链上。
- [ ] 破坏性变更已前缀 `**BREAKING:**`。
- [ ] 已跳过的提交连同理由一并报告。
- [ ] 写入前已由人确认草稿。
