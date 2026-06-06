# Architecture Template: Single-Package Project

本模板用于只有单一可部署单元、没有 workspace 结构的项目。

保存到 `docs/architecture.md`。

```markdown
# Architecture

## Overview

<!-- 一段话：这个系统做什么、遵循什么架构
     风格。链接 docs/product-spec.md 提供产品上下文。 -->

## Domains

<!-- 代码库的主要区域。每个 domain 都有清晰的边界、
     单一的职责，以及单独存在的理由。 -->

| Domain | Purpose | Key Files |
|---|---|---|
| auth | Authentication and authorization | src/auth/ |
| tasks | Task management CRUD | src/tasks/ |

## Layers

<!-- 每个 domain 内部的各 layer，依赖方向严格。
     把方向可视化——这是 architecture 中
     最重要的部分。 -->

\```
Types → Config → Repo → Service → Runtime → UI
\```

- **Types** — Data shapes, interfaces, enums
- **Config** — Domain-specific configuration
- **Repo** — Data access (database queries)
- **Service** — Business logic
- **Runtime** — HTTP handlers, queue consumers
- **UI** — Components, pages

Dependencies flow left to right only.

## Dependency Rules

<!-- 关于谁能 import 谁的显式规则。
     这些规则就是 architecture。 -->

- UI → Service → Repo → Types (one direction only)
- Shared types can be imported by any layer
- No circular dependencies between domains
- External services accessed only through adapters

## Architectural Invariants

<!-- 不出现在代码里的规则。把它们写下来，因为
     一旦有人违反，bug 不会立刻显现
     ——系统会慢慢腐烂。 -->

- <!-- 例如：所有数据库访问都经过 Repo layer——service 里不写裸 SQL -->
- <!-- 例如：外部 API 调用必须经过 adapter 模块，绝不直接调用 -->
- <!-- 例如：环境变量只在启动时读取，绝不在请求时读取 -->

## Cross-Cutting Concerns

<!-- 贯穿多个 domain 的共享事项 -->

| Concern | Mechanism |
|---|---|
| Authentication | Middleware, injected via context |
| Logging | Structured logger, passed through providers |
| Configuration | Environment-based, loaded at startup |

## Entry Points

<!-- 执行从哪里开始？把一切串起来的关键文件 -->

- `src/index.ts` — Application entry, wires domains together
- `src/api/` — HTTP route handlers

## Technology Choices

<!-- 关键依赖，附 purpose 与理据。聚焦于
     为什么选这个技术而非备选项。 -->

| Technology | Purpose | Rationale |
|---|---|---|
| TypeScript | Language | Type safety, ecosystem, agent-friendly |
| PostgreSQL | Database | ACID compliance, relational model fits domain |
```
