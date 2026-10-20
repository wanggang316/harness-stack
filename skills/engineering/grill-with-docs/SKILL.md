---
name: grill-with-docs
description: 深入追问需求或设计，澄清决策之间的依赖，并在讨论中记录已确认的领域术语与重要决定。
disable-model-invocation: true
metadata:
  adapted-from: >-
    [mattpocock/skills: grill-with-docs](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md) and its [grilling](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md) and [domain-modeling](https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md) disciplines.
---

# grill-with-docs

通过分轮访谈达成共同理解，同时维护术语表与 ADR。讨论中的假设和未决问题留在会话，不默认创建 spec、设计文件或 ticket，不修改产品代码。

## 1. Ground the discussion

读取当前讨论涉及的代码、文档入口、术语表与有效 ADR；沿用已有知识目录和正文语言。已有决定不重复询问，发现冲突时指出依据。可查证的事实自己调查，用户负责产品取舍与偏好。

首次写入前确认处于独立 worktree 的非 main 分支；不满足时先按项目约定建立或切换到 worktree。无法安全切换时可继续讨论，保留待写内容并报告，不写入 main。

结论：区分已确认决定、待核实事实和待决定问题，并确定知识的维护位置。

## 2. Ask the current frontier

把需求或设计展开为有依赖的决策树。每轮只问前置条件已确定的问题；答案依赖本轮其他未决问题的，留到下一轮。

- 同轮提出当前可独立回答的问题，逐项编号，给出推荐答案、理由和主要代价，让用户可逐项确认或修正。
- 优先追问会改变范围、概念边界、可观察行为、失败语义或关键设计的选择；用具体反例与边界场景压测答案。
- 用户使用含糊术语时，对照既有定义指出歧义，提出精确名称，不让同一词悄悄改变含义。
- 用户回答后重算决策树；未回答不代表接受推荐。需要调查的事实只阻塞依赖它的问题，其余问题可以继续。

结论：本轮回答产生明确决定或可定位的未决项，再进入下一轮；不替用户默定关键选择。

## 3. Capture settled knowledge

每轮确定的术语与值得长期保留的决定当场写入，不攒到访谈结束；仅记录用户已确认的内容。可参考 `harness-stack:domain-modeling` 的格式，缺少它时按以下规则执行：

- **术语表**：沿用项目现有文件；没有约定时用 `docs/glossary.md`。每个项目特有概念用一两句定义边界，必要时注明不使用的别名，不写实现计划。
- **ADR**：缺少背景会让后来的人做出有害修改或重复昂贵调查时才写。沿用已有目录和编号；没有约定时用 `docs/decisions/NNN-<slug>.md`，编号取现有最大值加一。
- **决定内容**：简短记录背景、选择、理由、代价与重新考虑的条件，标明 `Status: Accepted`。接受不等于已实现或部署。新决定替代旧 ADR 时新建记录、双向链接，并将旧记录标为 `Superseded by <link>`，保留原背景。
- **发现入口**：新增知识文件时在现有文档索引补链接；没有索引时在 README 或最小的 `docs/index.md` 建立入口，不生成整套空文档。

已确认的未来行为不覆盖当前实现说明。代码与已批准契约冲突时保留区别并提出问题，不通过改写契约消除差异。没有新的长期知识就不写文件；用户明确要求不写文件时，仅在回复中列出待记录内容。

结论：新知识在唯一的主要位置可发现，假设未被写成事实，未写入的内容与原因清楚。

## 4. Confirm shared understanding

决策树没有未决分支时，简要汇总目标、关键决定、范围边界及已更新文档，确认双方理解一致。用户已明确确认同一总结时不再追问。用户提前结束时，列出剩余问题，不声称讨论已收敛。

检查改动文档的术语、状态和链接，返回文件位置与未解决事项。本 skill 到访谈及知识记录为止，不自动开始实现、发布 Issue 或调用其他工作流。
