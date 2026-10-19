---
name: domain-modeling
description: 构建并打磨项目的领域模型：在设计讨论中澄清术语、压测概念边界，并记录当场确定的定义和决策。
---

# domain-modeling

在设计讨论中主动构建领域模型：质疑术语、构造边界场景，在术语和决策一确定时就写下来。只是读术语表获取词汇不需要本 skill；本 skill 用于**修改**领域模型。

## 文件结构

沿用项目已有术语表、ADR 目录和语言，不另建平行知识库。没有约定时采用以下布局；只创建本次需要的文件：

```text
/
├── docs/
│   ├── glossary.md
│   └── decisions/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

存在上下文索引（如 `CONTEXT-MAP.md`）时，从索引定位术语表与决策目录。根据当前话题判断所属上下文，判断不了就问。

首次创建知识文件时，在项目现有文档入口补上链接。

## 讨论中

- **对照术语表质疑。** 用户用的词和术语表冲突时立即指出：「术语表里 cancellation 指 X，你这里像是指 Y，是哪个？」
- **收紧模糊的词。** 用户用了含糊或多义的词时，提出一个精确的规范词：「你说的 account 是 Customer 还是 User？这是两个概念。」
- **用具体场景压测。** 讨论概念之间的关系时，构造探测边界的场景，迫使概念之间的界线变清楚。
- **对照代码。** 用户描述某个行为时，检查代码是否一致；不一致就指出来。

## 更新术语表

术语一确定就当场写进术语表，不要攒到最后。格式见 [references/context-format.md](references/context-format.md)。

术语表只保存概念定义，不承载实现细节、spec 或草稿。

## 记录 ADR

当缺少背景会让后来的人做出看似合理、实际有害的修改，或重复进行昂贵调查时，提议记录 ADR。只记录已确认的选择、约束与真实取舍；回退成本不是唯一门槛。

没有独立决策价值的事实写入相关现有文档，不为每次讨论新建 ADR。格式、有效状态与替代关系见 [references/adr-format.md](references/adr-format.md)。

---

Adapted from the `domain-modeling` skill in [mattpocock/skills](https://github.com/mattpocock/skills).
