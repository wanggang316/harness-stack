# ADR 格式

ADR 放在 `docs/adr/`，按顺序编号：`0001-slug.md`、`0002-slug.md`。编号取目录中现有最大编号加一。

```md
# {Short title of the decision}

{1-3 sentences: the context, what we decided, and why.}
```

一段话就够。价值在于记录**做了**这个决定和**为什么**，不在于填满小节。

只有确实有用时才加：

- **Status** frontmatter（`proposed | accepted | deprecated | superseded by ADR-NNNN`）：决策会被重新讨论时
- **Considered Options**：被否决的方案值得记住时
- **Consequences**：有不明显的下游影响时

## 值得记录的决策

- **架构形态**：「用 monorepo」「写模型 event-sourced，读模型投影到 Postgres」。
- **上下文之间的集成方式**：「Ordering 与 Billing 通过领域事件通信，不走同步 HTTP」。
- **带锁定的技术选型**：数据库、消息总线、认证提供方、部署目标。只记要花一个季度才能换掉的，不是每个库。
- **边界与范围**：「Customer 数据归 Customer 上下文所有，其他上下文只按 ID 引用」。明确的「不做」和「做」一样有价值。
- **刻意偏离常规**：「不用 ORM，手写 SQL，因为 X」。能阻止下一个人去「修复」一个有意为之的选择。
- **代码里看不到的约束**：「因合规要求不能用 AWS」「因合作方 API 合约，响应必须在 200ms 内」。
- **不明显的否决**：考虑过 GraphQL、因细微原因选了 REST——记下来，否则半年后会有人再提 GraphQL。
