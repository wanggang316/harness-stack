---
name: hs-define-api-spec
description: Defines the API specification at the project level. Use when starting a project with APIs, when api-spec.md is missing or outdated, or when API inconsistencies appear across services. Produces docs/api-spec.md as the authoritative API contract.
---

# hs-define-api-spec: API Specification

## Overview

Define the API contract for the project. `docs/api-spec.md` specifies response shapes, error format, status codes, pagination, authentication, versioning, and validation strategy. An agent or engineer reading this file should know exactly how to write a new endpoint without guessing.

## When to Use

- Starting a project that exposes APIs (REST, GraphQL, RPC)
- `docs/api-spec.md` is missing in a project with existing endpoints
- API inconsistencies across services or domains
- New service needs to expose endpoints that match existing patterns
- After API redesign or version migration

**When NOT to use:** Projects with no APIs. Internal libraries or CLI tools that don't serve external consumers.

## Philosophy

You are defining a contract, not writing documentation.

- **Contract first.** Define the shapes before implementing endpoints. The spec is the source of truth — implementation follows.
- **One pattern, everywhere.** If some endpoints return `{data, error}` and others return `{result, message}`, that's not a spec — that's chaos. Pick one.
- **Discover, don't invent.** Read existing endpoints first. Codify what works, fix what's inconsistent.
- **Show, don't describe.** "Use consistent error format" is useless. Show the exact JSON. Agents copy examples directly.
- **Design for extension.** New fields are additive and optional. Existing fields don't change type or disappear. Consumers should never break on an update.

## Process

```
DISCOVER ──→ CHALLENGE ──→ DEFINE ──→ APPROVE
  │               │            │          │
  ▼               ▼            ▼          ▼
Read existing  Question     Write       Human
endpoints      patterns     api-spec    confirms
and configs    and gaps     .md
```

### Phase 1: Discover

**Load context:**
- Read `docs/architecture.md` — understand domains and service boundaries
- Read existing `docs/api-spec.md` if it exists — update, don't rewrite

**Sample existing endpoints:**

Read 5-10 API route handlers across different domains. For each, extract:

1. Response shape (success and error)
2. Status code usage
3. Error format and codes
4. Pagination approach
5. Authentication mechanism
6. Validation strategy (where, how)
7. URL structure and naming

**Identify existing tooling:**
- OpenAPI/Swagger specs
- Schema validation libraries (Zod, Joi, Yup, Pydantic, etc.)
- API documentation generators

**Present discovery results:**

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

### Phase 2: Challenge

**For each discovered pattern:**
- "Is this the deliberate standard, or just what the first endpoint happened to do?"
- "Is there an OpenAPI spec or schema that already defines this?"

**For each inconsistency:**
- "Which variant should become the standard?"
- "Is the inconsistency a migration in progress?"

**Challenge common issues:**

- Endpoints returning different shapes under different conditions
- Error format varying by service or endpoint
- Pagination missing on list endpoints
- No versioning strategy
- Validation scattered instead of at boundaries

**Surface Hyrum's Law:**

> Every observable behavior — including undocumented quirks, error message text, timing, and ordering — becomes a de facto contract once consumers depend on it.

Ask: "Are there undocumented behaviors that consumers already depend on? Those need to be in the spec too."

### Phase 3: Define

Write `docs/api-spec.md`:

```markdown
# API Specification

**Last Updated:** [date]

## Overview

<!-- One paragraph: what APIs this project exposes, to whom,
     and what protocol (REST, GraphQL, RPC). -->

## Base URL & Versioning

<!-- How versions work. Show the URL structure. -->

| Environment | Base URL |
|---|---|
| Production | `https://api.example.com/v1` |
| Staging | `https://api-staging.example.com/v1` |

Versioning strategy: [URL path / header / query param].

## Authentication

<!-- How consumers authenticate. Show the exact header or mechanism. -->

\```
Authorization: Bearer <token>
\```

<!-- Which endpoints are public vs protected. -->

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

| Code | Meaning | When to Use |
|---|---|---|
| 200 | OK | Successful read or update |
| 201 | Created | Successful resource creation |
| 204 | No Content | Successful delete |
| 400 | Bad Request | Malformed request syntax |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate resource or version mismatch |
| 422 | Unprocessable Entity | Validation failed (semantically invalid) |
| 500 | Internal Server Error | Unexpected server error |

## Error Codes

<!-- Application-specific error codes used in error.code field. -->

| Code | HTTP Status | Meaning |
|---|---|---|
| VALIDATION_ERROR | 422 | Request failed validation |
| NOT_FOUND | 404 | Resource does not exist |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| CONFLICT | 409 | Resource conflict |
| INTERNAL_ERROR | 500 | Unexpected server error |

## Pagination

<!-- Which strategy: offset-based, cursor-based, or both.
     Show request and response examples. -->

Request:
\```
GET /api/v1/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
\```

Response: see "Success (list)" format above.

## Filtering & Sorting

<!-- How list endpoints accept filters and sort parameters. -->

\```
GET /api/v1/tasks?status=in_progress&assignee=user123&createdAfter=2025-01-01
\```

## URL Conventions

| Pattern | Convention | Example |
|---|---|---|
| Resources | Plural nouns, no verbs | `/api/v1/tasks` |
| Single resource | Resource + ID | `/api/v1/tasks/:id` |
| Sub-resources | Nested under parent | `/api/v1/tasks/:id/comments` |
| Query params | camelCase | `?sortBy=createdAt&pageSize=20` |
| Actions (non-CRUD) | POST with verb | `POST /api/v1/tasks/:id/archive` |

## Request Validation

<!-- Where validation happens and what library is used. -->

Validation happens at the handler layer using [Zod/Joi/Pydantic/etc.].

- Invalid requests return 422 with error details
- After validation, internal code trusts the types
- Third-party API responses are validated before use

## Field Conventions

| Pattern | Convention | Example |
|---|---|---|
| Response fields | camelCase | `createdAt`, `userId` |
| Boolean fields | is/has/can prefix | `isComplete`, `hasAttachments` |
| Enum values | UPPER_SNAKE | `IN_PROGRESS`, `COMPLETED` |
| Timestamps | ISO 8601 | `2025-01-15T10:30:00Z` |
| IDs | string (UUID or prefixed) | `usr_abc123` |

## Backward Compatibility

- New fields are additive and optional
- Existing fields do not change type or get removed
- Deprecate before removing — mark deprecated fields in response
- Breaking changes require a new API version

## API Documentation

<!-- How endpoints are documented for consumers. -->

Use OpenAPI (Swagger) as the API documentation standard. Maintain an `openapi.yaml` (or `openapi.json`) as the single source of truth for endpoint definitions.

- New or changed endpoints must update the OpenAPI spec before merging
- The OpenAPI spec documents: paths, parameters, request/response schemas, error codes
- `docs/api-spec.md` defines project-wide patterns (response format, status codes, field conventions); OpenAPI documents individual endpoints
```

**Writing principles:**

- Every pattern has a concrete JSON or URL example. No abstract descriptions.
- Status code table and error code table are mandatory — these prevent the most common inconsistencies.
- Sections that don't apply are omitted.
- If an OpenAPI spec exists, reference it and only document what it doesn't cover.

### Phase 4: Approve

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

- **New endpoints** — verify they follow the spec before merging
- **New error codes** — add to the error codes table
- **Breaking changes** — update the spec before implementing
- **Version migration** — document both old and new behavior during transition

The spec describes how the API IS, not how it was or should be.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll document the API later" | The contract IS the documentation. Define it first — implementation follows. |
| "We don't need pagination for now" | You will the moment someone has 100+ items. Add it from the start. |
| "PATCH is complicated, let's just use PUT" | PUT requires the full object every time. PATCH is what clients actually want for partial updates. |
| "We'll version when we need to" | Breaking changes without versioning break consumers. Design for extension from the start. |
| "Internal APIs don't need specs" | Internal consumers are still consumers. Specs prevent coupling and enable parallel work. |
| "The OpenAPI spec covers this" | OpenAPI describes endpoints. It doesn't always capture error handling strategy, pagination patterns, or field conventions. Both can coexist. |

## Red Flags

- Endpoints returning different response shapes
- Error format varying by service or endpoint
- List endpoints without pagination
- Verbs in REST URLs (`/api/createTask`, `/api/getUsers`)
- No versioning strategy
- Validation scattered throughout internal code instead of at handler boundaries
- Status codes used inconsistently (e.g., 400 and 422 for the same thing)
- No spec exists but multiple services expose endpoints
- No OpenAPI spec maintained for endpoints

## Verification

- [ ] Existing endpoints sampled — spec reflects actual patterns
- [ ] Response format defined with JSON examples (success, list, error)
- [ ] Status code table complete with usage guidance
- [ ] Error codes enumerated with HTTP status mapping
- [ ] Pagination strategy defined with request/response examples
- [ ] Authentication mechanism documented
- [ ] URL conventions defined with examples
- [ ] Validation strategy documented (where, what library)
- [ ] Field conventions defined (casing, booleans, enums, timestamps, IDs)
- [ ] Backward compatibility rules stated
- [ ] OpenAPI spec location and update policy defined
- [ ] Inconsistencies surfaced and resolved with human
- [ ] Human has reviewed and approved
- [ ] Saved to `docs/api-spec.md`
