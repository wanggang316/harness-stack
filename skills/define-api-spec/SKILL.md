---
name: define-api-spec
description: 在项目层面定义 API spec。在启动带 API 的项目、api-spec.md 缺失或过时、或跨服务出现 API 不一致时使用。产出 docs/api-spec.md，作为权威的 API contract。
---

# define-api-spec：API Specification

## Overview

为项目定义 API contract。`docs/api-spec.md` 规定响应结构、错误格式、状态码、分页、认证、版本管理以及 validation 策略。读这份文件的 agent 或工程师，应当不靠猜就清楚该如何写一个新 endpoint。

## When to Use

- 启动一个对外暴露 API 的项目（REST、GraphQL、RPC）
- 项目已有 endpoint，但 `docs/api-spec.md` 缺失
- 跨服务或跨 domain 出现 API 不一致
- 新服务需要暴露与现有模式一致的 endpoint
- API 重新设计或版本迁移之后

**When NOT to use：** 没有 API 的项目。不对外部消费方提供服务的内部库或 CLI 工具。

## Philosophy

你在定义一份 contract，而不是写文档。

- **Contract first。** 在实现 endpoint 之前先把结构定下来。spec 是事实来源——实现随其后。
- **一套模式，处处一致。** 如果有些 endpoint 返回 `{data, error}`、另一些返回 `{result, message}`，那不是 spec——那是混乱。选定一种。
- **去发现，别去发明。** 先读现有 endpoint。把行得通的固化下来，把不一致的修正掉。
- **展示，别描述。**「使用一致的错误格式」毫无用处。把确切的 JSON 摆出来。agent 会直接照抄示例。
- **为扩展而设计。** 新字段是增量且可选的。已有字段不改类型、不消失。消费方永远不应在一次更新中崩掉。

## Process

```
DISCOVER ──→ CHALLENGE ──→ DEFINE ──→ APPROVE
  │               │            │          │
  ▼               ▼            ▼          ▼
Read existing  Question     Write       Human
endpoints      patterns     api-spec    confirms
and configs    and gaps     .md
```

### Phase 1：Discover

**加载上下文：**
- 读 `docs/architecture.md`——理解各 domain 与服务边界
- 若已有 `docs/api-spec.md` 则读它——做更新，不要重写

**采样现有 endpoint：**

跨不同 domain 读 5-10 个 API route handler。对每个，提取：

1. 响应结构（成功与错误）
2. 状态码的用法
3. 错误格式与错误码
4. 分页方式
5. 认证机制
6. validation 策略（在哪里、怎么做）
7. URL 结构与命名

**识别已有工具链：**
- OpenAPI/Swagger spec
- schema validation 库（Zod、Joi、Yup、Pydantic 等）
- API 文档生成器

**呈现 discovery 结果：**

```
DISCOVERED API PATTERNS:

Response shape (sampled 8 endpoints):
- Success: { data: {...} } (6/8) → Strong convention
- Error: { error: { code, message } } (5/8) → Strong convention
- Pagination: { data: [...], pagination: { page, totalPages } } (3/4 list endpoints)

Status codes:
- 200 for success, 201 for creation (8/8) → Consistent
- 400 vs 422 for validation (mixed) → Needs decision

Authentication:
- Bearer token via Authorization header (8/8) → Consistent
- Some routes use middleware, some check inline (mixed) → Needs decision

Validation:
- Zod schemas (6/8 endpoints) → Strong convention
- Validation at handler layer (5/8) → Emerging

URL structure:
- /api/v1/<resource> (8/8) → Consistent
- Plural nouns, no verbs (7/8) → Strong convention

INCONSISTENCIES:
1. Two different error response shapes between v1 and v2 routes
2. Pagination: offset-based in /tasks, cursor-based in /events
→ Which patterns are intentional?
```

### Phase 2：Challenge

**对每一个发现的模式：**
- 「这是有意为之的标准，还是只是第一个 endpoint 碰巧那么写？」
- 「是否已有 OpenAPI spec 或 schema 定义了它？」

**对每一处不一致：**
- 「哪个变体应当成为标准？」
- 「这处不一致是不是一次进行中的迁移？」

**挑战常见问题：**

- endpoint 在不同条件下返回不同结构
- 错误格式因服务或 endpoint 而异
- 列表 endpoint 缺少分页
- 没有版本管理策略
- validation 散落各处，而不在边界处

**点出 Hyrum 定律：**

> 任何可观测的行为——包括未记录的怪癖、错误信息文本、时序与顺序——一旦有消费方依赖它，就成了事实上的 contract。

问：「有没有消费方已经在依赖、却未被记录的行为？那些也得写进 spec。」

### Phase 3：Define

写 `docs/api-spec.md`：

```markdown
# API Specification

**Last Updated:** [date]

## Overview

<!-- 一段话：本项目对外暴露哪些 API、面向谁、
     用什么协议（REST、GraphQL、RPC）。 -->

## Base URL & Versioning

<!-- 版本如何工作。把 URL 结构摆出来。 -->

| Environment | Base URL |
|---|---|
| Production | `https://api.example.com/v1` |
| Staging | `https://api-staging.example.com/v1` |

Versioning strategy: [URL path / header / query param].

## Authentication

<!-- 消费方如何认证。把确切的 header 或机制摆出来。 -->

\```
Authorization: Bearer <token>
\```

<!-- 哪些 endpoint 是公开的、哪些是受保护的。 -->

## Response Format

### Success

\```json
{
  "data": { ... }
}
\```

### Success (list)

\```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 142,
    "totalPages": 8
  }
}
\```

### Error

\```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [ ... ]
  }
}
\```

## Status Codes

| Code | Meaning | 何时使用 |
|---|---|---|
| 200 | OK | 读取或更新成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功 |
| 400 | Bad Request | 请求语法不合法 |
| 401 | Unauthorized | 缺少或无效的认证 |
| 403 | Forbidden | 已认证但未授权 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源重复或版本不匹配 |
| 422 | Unprocessable Entity | validation 失败（语义上不合法） |
| 500 | Internal Server Error | 意外的服务端错误 |

## Error Codes

<!-- 用于 error.code 字段的、应用特定的错误码。 -->

| Code | HTTP Status | Meaning |
|---|---|---|
| VALIDATION_ERROR | 422 | 请求 validation 失败 |
| NOT_FOUND | 404 | 资源不存在 |
| UNAUTHORIZED | 401 | 需要认证 |
| FORBIDDEN | 403 | 权限不足 |
| CONFLICT | 409 | 资源冲突 |
| INTERNAL_ERROR | 500 | 意外的服务端错误 |

## Pagination

<!-- 采用哪种策略：offset-based、cursor-based、还是两者皆有。
     给出请求与响应示例。 -->

Request:
\```
GET /api/v1/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
\```

Response: see "Success (list)" format above.

## Filtering & Sorting

<!-- 列表 endpoint 如何接收过滤与排序参数。 -->

\```
GET /api/v1/tasks?status=in_progress&assignee=user123&createdAfter=2025-01-01
\```

## URL Conventions

| Pattern | Convention | Example |
|---|---|---|
| Resources | 复数名词，不带动词 | `/api/v1/tasks` |
| Single resource | 资源 + ID | `/api/v1/tasks/:id` |
| Sub-resources | 嵌套在父资源之下 | `/api/v1/tasks/:id/comments` |
| Query params | camelCase | `?sortBy=createdAt&pageSize=20` |
| Actions (non-CRUD) | 带动词的 POST | `POST /api/v1/tasks/:id/archive` |

## Request Validation

<!-- validation 在哪里发生、用什么库。 -->

validation 在 handler 层进行，使用 [Zod/Joi/Pydantic/等]。

- 不合法的请求返回 422 并附错误详情
- validation 之后，内部代码信任这些类型
- 第三方 API 的响应在使用前先经 validation

## Field Conventions

| Pattern | Convention | Example |
|---|---|---|
| Response fields | camelCase | `createdAt`, `userId` |
| Boolean fields | is/has/can 前缀 | `isComplete`, `hasAttachments` |
| Enum values | UPPER_SNAKE | `IN_PROGRESS`, `COMPLETED` |
| Timestamps | ISO 8601 | `2025-01-15T10:30:00Z` |
| IDs | 字符串（UUID 或带前缀） | `usr_abc123` |

## Backward Compatibility

- 新字段是增量且可选的
- 已有字段不改类型、不被移除
- 移除前先标弃用——在响应中标记弃用字段
- 破坏性变更需要一个新的 API 版本

## API Documentation

<!-- endpoint 如何向消费方记录。 -->

以 OpenAPI（Swagger）作为 API 文档标准。维护一个 `openapi.yaml`（或 `openapi.json`）作为 endpoint 定义的唯一事实来源。

- 新增或变更的 endpoint 必须在合并前更新 OpenAPI spec
- OpenAPI spec 记录：路径、参数、请求/响应 schema、错误码
- `docs/api-spec.md` 定义项目级的模式（响应格式、状态码、字段约定）；OpenAPI 记录单个 endpoint
```

**写作原则：**

- 每一种模式都配一个具体的 JSON 或 URL 示例。不要抽象描述。
- 状态码表和错误码表是必备的——它们防住了最常见的不一致。
- 不适用的小节直接省略。
- 若已有 OpenAPI spec，引用它，并只记录它未覆盖的内容。

### Phase 4：Approve

```
API SPEC READY FOR REVIEW:
- Response format: [defined with JSON examples]
- Status codes: [count] mapped
- Error codes: [count] defined
- Pagination: [offset/cursor/both]
- Authentication: [mechanism]
- URL conventions: [defined]
- Validation: [library and strategy]
- API docs: OpenAPI spec [location]
→ This is the API contract for the project.
   Approve, or tell me what to change.
```

## Keeping the Spec Current

- **新 endpoint**——合并前确认它遵循 spec
- **新错误码**——加入错误码表
- **破坏性变更**——实现之前先更新 spec
- **版本迁移**——过渡期内同时记录新旧两种行为

spec 描述 API 现在「是」怎样的，而不是它曾经或应该是怎样的。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「API 文档以后再补。」 | contract 本身就是文档。先把它定下来——实现随其后。 |
| 「现在还不需要分页。」 | 一旦有人手里有 100+ 条数据，你就需要了。从一开始就加上。 |
| 「PATCH 太麻烦，干脆都用 PUT。」 | PUT 每次都要求传完整对象。客户端做局部更新真正想要的是 PATCH。 |
| 「等需要时再做版本。」 | 没有版本管理的破坏性变更会打挂消费方。从一开始就为扩展而设计。 |
| 「内部 API 不需要 spec。」 | 内部消费方也是消费方。spec 防止耦合、让并行工作成为可能。 |
| 「OpenAPI spec 已经覆盖了。」 | OpenAPI 描述 endpoint。它未必能涵盖错误处理策略、分页模式或字段约定。两者可以共存。 |

## Red Flags

- endpoint 返回不同的响应结构
- 错误格式因服务或 endpoint 而异
- 列表 endpoint 没有分页
- REST URL 里出现动词（`/api/createTask`、`/api/getUsers`）
- 没有版本管理策略
- validation 散落在内部代码各处，而不在 handler 边界
- 状态码使用不一致（例如同一件事既用 400 又用 422）
- 没有 spec，却有多个服务在暴露 endpoint
- 没有为 endpoint 维护 OpenAPI spec

## Verification

- [ ] 已采样现有 endpoint——spec 反映了实际模式
- [ ] 响应格式已用 JSON 示例定义（成功、列表、错误）
- [ ] 状态码表完整，并附使用指引
- [ ] 错误码已枚举，并映射到 HTTP 状态码
- [ ] 分页策略已定义，并附请求/响应示例
- [ ] 认证机制已记录
- [ ] URL 约定已定义，并附示例
- [ ] validation 策略已记录（在哪里、用什么库）
- [ ] 字段约定已定义（大小写、布尔、枚举、时间戳、ID）
- [ ] 已声明向后兼容规则
- [ ] OpenAPI spec 的位置与更新策略已定义
- [ ] 不一致已浮出水面，并与人工一同解决
- [ ] 人工已评审并批准
- [ ] 已保存到 `docs/api-spec.md`
