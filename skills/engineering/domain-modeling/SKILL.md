---
name: domain-modeling
description: 构建并打磨项目的领域模型：维护 CONTEXT.md 术语表与 docs/adr/ 中的决策记录。在讨论代码库术语、编写或修改 CONTEXT.md、记录或修改 ADR 时使用。
---

# domain-modeling

在设计讨论中主动构建领域模型：质疑术语、构造边界场景，在术语和决策一确定时就写下来。只是读 `CONTEXT.md` 获取词汇不需要本 skill；本 skill 用于**修改**领域模型。

## 文件结构

单一上下文（大多数仓库）：

```text
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

根目录有 `CONTEXT-MAP.md` 时是多上下文仓库，它指向各上下文自己的 `CONTEXT.md` 和 `docs/adr/`。根据当前话题判断属于哪个上下文，判断不了就问。

文件按需创建：第一个术语确定时才创建 `CONTEXT.md`，第一条 ADR 需要时才创建 `docs/adr/`。

## 讨论中

- **对照术语表质疑。** 用户用的词和 `CONTEXT.md` 冲突时立即指出：「术语表里 cancellation 指 X，你这里像是指 Y，是哪个？」
- **收紧模糊的词。** 用户用了含糊或多义的词时，提出一个精确的规范词：「你说的 account 是 Customer 还是 User？这是两个概念。」
- **用具体场景压测。** 讨论概念之间的关系时，构造探测边界的场景，迫使概念之间的界线变清楚。
- **对照代码。** 用户描述某个行为时，检查代码是否一致；不一致就指出来。

## 更新 CONTEXT.md

术语一确定就当场写进 `CONTEXT.md`，不要攒到最后。格式见 [references/context-format.md](references/context-format.md)。

`CONTEXT.md` 只是术语表：不写实现细节，不当作 spec 或草稿本。

## 记录 ADR

三条同时满足时才提议写 ADR：

1. **难以回退**：以后改主意的代价不小。
2. **没有背景会让人意外**：后来的读者看到代码会问「为什么这样做？」
3. **经过真实取舍**：有可行的替代方案，因为具体原因选了这一个。

缺一条就不写。格式与适用场景见 [references/adr-format.md](references/adr-format.md)。

---

Adapted from the `domain-modeling` skill in [mattpocock/skills](https://github.com/mattpocock/skills).
