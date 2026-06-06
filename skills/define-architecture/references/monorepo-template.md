# Architecture Template: Monorepo Project

本模板用于在单个仓库中包含多个 package/app 的项目。

根 ARCHITECTURE.md 只覆盖 **workspace 层级** 的事项——依赖方向、invariants、cross-cutting 模式。每个 package 的内部细节（domain、layer、entry point）归 `docs/design-docs/`。

灵感来自 [matklad 的 ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html)：保持简短，它才活得下去。

保存到 `docs/architecture.md`。

```markdown
# Architecture

## Overview

<!-- 一段话：这个系统做什么、架构风格是什么、
     以及为什么组织成 monorepo。
     链接 docs/product-spec.md 提供产品上下文。 -->

## Codemap

<!-- 文档的核心。每个 package 一行。
     读完这一节，贡献者应当知道
     去哪里找任何一块功能。 -->

### Apps

| Package | Purpose |
|---|---|
| `apps/web` | Next.js web application — user-facing dashboard |
| `apps/api` | Express API server — REST endpoints for web and mobile |

### Packages

| Package | Purpose |
|---|---|
| `packages/ui` | Shared React component library |
| `packages/db` | Database client and schema (Prisma) |
| `packages/shared-types` | TypeScript type definitions shared across all packages |
| `packages/config` | Shared ESLint, TSConfig, Tailwind configurations |

## Dependency Direction

<!-- 最重要的一节。谁能 import 谁
     定义了 architecture。把它可视化。 -->

\```
packages/shared-types
packages/config
    │
    ├── packages/ui
    ├── packages/db
    │
    ├── apps/web
    └── apps/api
\```

**Rules:**
- apps/ → packages/ only (packages must never import from apps)
- No circular dependencies between packages
- Leaf packages (shared-types, config) must have zero internal dependencies
- Package exports are contracts — breaking changes require updating all consumers first

**Enforcement:**
- <!-- 这些规则实际如何被强制执行：
     ESLint boundaries 插件、TypeScript 路径限制、
     CI 检查、CODEOWNERS 等等。 -->

## Architectural Invariants

<!-- 不出现在代码里的规则。把它们写下来，因为
     一旦有人违反，bug 不会立刻显现
     ——系统会慢慢腐烂。 -->

- <!-- 例如：所有 app 共享同一个数据库实例 -->
- <!-- 例如：package 在 import 时不得有运行时副作用 -->
- <!-- 例如：所有 HTTP endpoint 必须经过 auth middleware -->
- <!-- 例如：共享 type 是唯一的跨 package contract——没有共享的运行时代码 -->

## Cross-Cutting Concerns

| Concern | Mechanism |
|---|---|
| Authentication | <!-- 它如何跨 package 共享 --> |
| Logging | <!-- logger 在哪里、如何配置 --> |
| Error handling | <!-- 共享的错误 type、上报 --> |
| Configuration | <!-- 每个 package 的 .env、共享 config package --> |

## Technology Choices

<!-- 关键依赖，附 purpose 与理据。
     Scope 区分 workspace 级选型与单个 app 级选型。
     聚焦于 WHY——「我们选了 X」却没有「因为 Y」毫无用处。 -->

| Technology | Scope | Purpose | Rationale |
|---|---|---|---|
| TypeScript | all | Language | Type safety, ecosystem, agent-friendly |
| Turborepo | workspace | Build orchestration | Incremental builds, task caching |
| pnpm | workspace | Package manager | Workspace support, disk efficiency |
| Next.js | apps/web | Web framework | <!-- 这个 app 为什么用 Next.js --> |
| Fastify | apps/api | API framework | <!-- 这个 app 为什么用 Fastify --> |
```
