# Validation Contract Template

撰写 `.harness-runtime/plans/<slug>/validation-contract.md` 时使用这份骨架。
每条 assertion 都 **必须** 是一个 H3 标题，形式严格为 `### VAL-<AREA>-NNN: <title>`
（AREA 为大写字母数字，NNN 为零填充 3 位数字）——`fdd init-state` 解析这些标题来播种
`validation-state.json`。每条 assertion 只包含：它的标题 + 一段可观测行为段落（行内指名
persona）+ 一行 `Evidence:`——别无其它。契约按 **area**（plan 的用户可见子能力）组织。

---

```markdown
# Validation Contract: <Plan Title>

**Plan:** <plan-slug>
**Status:** Draft | Approved
**Patterns:** see `docs/user-test-patterns.md` for project-wide testing conventions

## Areas

<!-- The plan's user-visible sub-capabilities. Each becomes an `## Area:` section.
Scale to the plan: a simple plan is one area. Flows spanning areas within this plan
go in `## Cross-Area Flows`. -->

1. Credential sign-in
2. Password recovery

## Area: Credential sign-in

### VAL-AUTH-001: Returning reader can sign in with valid credentials

A `returning_reader` with valid credentials submits the login form and lands on the
dashboard with an active session.
**Evidence:** screenshot of the dashboard; network(POST /sessions → 303 → GET /dashboard)

### VAL-AUTH-002: Invalid credentials are rejected without leaking which field was wrong

A `returning_reader` submitting a wrong password sees a generic "invalid credentials"
error and stays on the login page; no session is created.
**Evidence:** screenshot of the error; network(POST /sessions → 401)

## Area: Password recovery

### VAL-RECOVER-001: <title>

<one observable behaviour paragraph naming the persona>
**Evidence:** <screenshot / console-errors / network(...) / terminal-output>

## Cross-Area Flows

<!-- Flows that span sub-capabilities WITHIN this plan (e.g. recover password → then
sign in with the new one). Same two-line block. Leave present but empty if none. -->

### VAL-CROSS-001: New password works on next sign-in

After completing recovery, the `returning_reader` signs in with the new password and
reaches the dashboard.
**Evidence:** screenshot of dashboard; network(POST /sessions → 303)
```
