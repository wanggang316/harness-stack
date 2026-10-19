# ADR 格式

沿用项目现有决策目录；没有约定时放在 `docs/decisions/`。按目录现有编号递增，不复用编号。

```markdown
# <Decision title>

Status: Accepted

<Context, choice, and reason.>

<Trade-offs and conditions for reconsideration.>
```

一两段即可。可行替代方案及其否决原因值得记住时再补充，不为填模板扩写。

## 状态与更新

- 待定方案用 `Proposed`，用户已确认的决定用 `Accepted`；批准不代表已经实现或部署。
- 新决定推翻旧决定时创建新记录，旧记录标为 `Superseded by <link>`，新记录链接回旧记录。
- 保留当时的背景和理由，勘误明确标注；后续实现细节维护在相关当前文档中。

## 收录判断

缺少理由是否会导致有害修改或昂贵的重复调查？优先记录：数据所有权和集成边界、外部约束、重要取舍、刻意偏离常规的实现，以及不明显的否决理由。容易回退但受外部兼容性约束的决定也可能值得记录。

从代码、测试或现有文档就能低成本理解的普通选择，不另建 ADR。
