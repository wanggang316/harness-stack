# Phase 3 — Features

把已接受的 plan + 定稿的 contract 拆解进 `features.json`。每个 feature 是一个 implementer 在单个 session 内完成的工作单元，以 `fulfills` 绑定到它要让其变得可测的那些 contract 断言。

**前置条件：** `validation-contract.md` 已定稿、`validation-state.json` 已播种（`hs-plan init-state`）。contract 之前不许有 feature——否则 `fulfills` 无从绑定。

## Feature schema

`features.json` 是 `{ "features": [ <feature>, … ] }`。每个 feature：

```json
{
  "id": "auth-login-endpoint",
  "description": "POST /api/auth/login — validate credentials, set session cookie, 401 on bad creds.",
  "agent": "implementer",
  "milestone": "auth",
  "preconditions": ["user table exists with hashed password column"],
  "expectedBehavior": [
    "200 + Set-Cookie on valid credentials",
    "401 + generic error on invalid credentials, stays on login",
    "empty fields -> 400 with per-field errors, no network call"
  ],
  "verificationSteps": [
    "npm test -- --grep 'login' (expect new cases pass)",
    "curl -i POST /api/auth/login with valid body -> 200 + Set-Cookie"
  ],
  "fulfills": ["VAL-AUTH-001", "VAL-AUTH-002", "VAL-AUTH-003"],
  "status": "pending"
}
```

| 字段 | 含义 |
|---|---|
| `id` | kebab-case，唯一。带语义。 |
| `description` | 要构建什么——具体而明确。 |
| `agent` | 实现它的 subagent。默认 `implementer`。 |
| `milestone` | 它所属的垂直切片（与某个 `plan.md` milestone 对应）。 |
| `preconditions` | 派发前必须为真的事。属说明性质；由 controller 核验。 |
| `expectedBehavior` | 可验证的成功标准。 |
| `verificationSteps` | implementer 如何证明每条行为。 |
| `fulfills` | 本 feature **完成**（使其完全可测）的断言 id。 |
| `status` | 初始为 `pending`；此后仅经 `hs-plan set-status` 管理。 |

## `fulfills` semantics

`fulfills` 意为**「完成」**，而非「贡献于」。只有那个让一条断言变得完全可测的最终 feature 才认领它。基础性 feature（schema、类型、脚手架）为别人设置 precondition，自身带 `fulfills: []`。

不变量：**每条 contract 断言恰好被一个 feature 认领。** 不留孤儿，不重复认领。

## Ordering

`features.json` 数组的顺序就是执行顺序（没有隐式的依赖求解器）。这样排：基础性 feature 在依赖它的之前；按 milestone 分组；某个 precondition 的生产者在其消费者之前。终态 feature 在执行期间会自动移到底部，所以进行中的工作总停在顶部附近。

## Sizing

每个 feature 应约为一个 worker session（人力等效约 30 分钟–4 小时）、可独立评审、触及一小撮文件、并有明确的验收。若一个 feature 需要的文件多于一小撮、或混杂了不相干的关注点，拆了它。

## Coverage gate

`features.json` 草拟好后：

```bash
hs-plan contract-coverage     # MUST report 'coverage OK'
```

执行前解决每一处违例：
- `ORPHAN <id>` — 没有 feature 认领该断言。把它加进某个 feature 的 `fulfills`。
- `DUPLICATE <id>` — 两个 feature 都认领它。留下真正完成它的那个。
- `UNKNOWN-CLAIM <id>` — 某个 `fulfills` 条目不在 contract 里。改掉拼写错误，或改 contract。
- `STATE-ONLY` / `CONTRACT-ONLY` — state 与 contract 漂移了。重跑 `hs-plan init-state`。

## Verification

- [ ] `plan.md` 里的每个 milestone 都有 feature 代表。
- [ ] 每条断言恰好被一个 feature 认领（`hs-plan contract-coverage` OK）。
- [ ] 基础性 feature 排在依赖它的之前；顺序反映 precondition。
- [ ] 没有 feature 大到一个 worker session 装不下。
