# Validation Contract Template

Use this skeleton when authoring `.harness-runtime/plans/<slug>/validation-contract.md`.
Every assertion MUST be an H3 heading of the exact form `### VAL-<AREA>-NNN: <title>`
(AREA uppercase alnum, NNN zero-padded 3 digits) — `hs-plan init-state` parses those
headings to seed `validation-state.json`. Each assertion is just its heading + one
observable behaviour paragraph (naming the persona inline) + an `Evidence:` line — nothing
else. The contract is organized by **area** (the plan's user-visible sub-capabilities).

---

```markdown
# Validation Contract: <Plan Title>

**Plan:** <plan-slug>
**Status:** Draft | Approved
**Patterns:** see `docs/user-test-patterns.md` for project-wide testing conventions

## Personas Used

<!-- Reference personas by ID from `docs/user-tests/_shared/personas.yaml`. -->

- `anonymous_visitor` — drives the public read path
- `returning_reader` — drives the subscription / personalized paths

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

## Requirement Coverage Matrix

<!-- Every plan requirement → ≥ 1 assertion. The reverse direction (every assertion
claimed by exactly one feature) is enforced by `hs-plan contract-coverage` in Phase 3,
not here. -->

| Plan requirement                | Covered by                 |
|---------------------------------|----------------------------|
| R1 — user can sign in           | VAL-AUTH-001               |
| R2 — invalid creds rejected     | VAL-AUTH-002               |
| R6 — recovery then sign-in      | VAL-CROSS-001              |
| R9 — perf budget                | — verified by build gate, not a user-observable assertion |

## Personas / Fixtures Added During Authoring

- Added persona `returning_reader` to `docs/user-tests/_shared/personas.yaml`
- Added fixture `one-active-user.sql` to `docs/user-tests/_shared/fixtures/seed/`

## Open Questions

1. Should VAL-AUTH-002 also assert the error survives a reload? **Default:** no — out of scope this iteration.
```
