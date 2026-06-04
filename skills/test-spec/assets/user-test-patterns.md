# User-Test Patterns

> Project-wide conventions for writing user-level tests. Authored during the first run of `/harness-stack:test-spec` (Step 0: Bootstrap). Read this before writing any individual user-test case; case files live in `docs/user-tests/`.

## Status

**Status:** Draft | Approved
**Last updated:** YYYY-MM-DD

## Platforms in Scope

<!--
List the target platforms this project tests against. One bullet per platform,
with one-line justification.
-->

- **Web (browser)** — public reading site at https://...
- **HTTP API** — backend exposed under /api
- **(macOS / iOS / Android — remove if not in scope)**

## Tooling per Platform

<!--
For each platform, declare primary + fallback tool. Include the exact invocation
pattern an agent would use (MCP server name, CLI command, or library call) and
the ready signal that gates probing.
-->

### Web

- **Primary:** Chrome DevTools MCP — capabilities: DOM query, network capture, console read, screenshot, accessibility tree, performance trace, read-only JS evaluation
- **Fallback:** Playwright (`@playwright/test`) for headless runs in CI
- **Invocation:** MCP tool calls under `mcp__claude-in-chrome__*`; for Playwright, `pnpm exec playwright test <case>`
- **Ready signal:** HTTP GET to `<base-url>/health` returns 200, **or** dev server log contains `ready in`
- **Base URL discovery:** read `VITE_SITE_URL` from `.env`, default to `http://localhost:5173`

### HTTP API

- **Primary:** `curl` with JSON parsing via `jq`
- **Fallback:** integration test harness in `apps/api/tests/`
- **Invocation:** `curl -sS -X <METHOD> <base>/api/<path> -H 'content-type: application/json' -d <body> | jq`
- **Ready signal:** `GET /api/health` returns 200
- **Auth:** see persona registry — each persona declares its session token / API key

### (macOS / iOS / Android — fill in or delete)

- **Primary:** ...
- **Fallback:** ...
- **Invocation:** ...
- **Ready signal:** ...

## Case Dimensions

<!--
List the dimensions every case author must consider. Mark each as Mandatory
(every case must answer it explicitly, even if to declare "not applicable") or
Optional (only include when relevant).
-->

| Dimension | Required? | What to check |
|---|---|---|
| Happy path | Mandatory | The primary success flow for this case |
| Error path | Mandatory | At least one declared failure mode (network, validation, missing data) |
| Edge values | Mandatory | Empty / null / boundary / max-size inputs |
| Accessibility | Mandatory for UI cases | Roles, labels, keyboard reachability, focus order |
| Performance budget | Optional | LCP / INP / TTFB if the spec named a target |
| i18n | Optional | If the project supports multiple languages, name the locale tested |
| Security | Mandatory for auth / data cases | AuthN/AuthZ boundary, secrets not in output |

## Selector and Assertion Rules

<!--
Observable-only. Every assertion must reference user-visible / externally-probable
state. Show what's allowed and what's forbidden with concrete examples.
-->

### Allowed selectors (Web)

- ARIA role + accessible name: `getByRole('button', {name: 'Subscribe'})`
- Visible text: `getByText('Order confirmed')`
- `<a>` href pattern: `a[href^="/d/"]`
- Network: `POST /sessions → 401`
- Database: `SELECT count(*) FROM orders WHERE user_id = $persona.id`

### Forbidden selectors

- CSS class names (`.btn-primary-v2`) — refactor will break them
- File paths or function names — implementation detail
- DOM position (`div:first-child > span:nth-of-type(2)`) — fragile
- Internal test ids that name code modules (`data-testid="OrderConfirmationContainer__heading"`) — couples test to source layout

### Allowed assertions

- Binary: PASS or FAIL, no "looks good"
- Concrete: name the expected value, not a regex over noise
- Independent: one probe per assertion

## State Isolation

<!--
Every case must start from a known seed. Document the reset protocol.
-->

- **DB reset:** before each case, run `pnpm db:reset` to drop and re-seed from `tests/fixtures/seed/<scenario>.sql`
- **Storage:** each persona has a `.auth/<persona>.json` storageState file; cases load it via Playwright's `storageState` option (or its equivalent on other platforms)
- **No cross-case state:** a case must not depend on another case having run; ordering must not matter
- **External services:** mock / replay third-party APIs with recorded fixtures in `tests/fixtures/external/`; never hit real third-party endpoints in CI

## Surface Cost Tiers

<!--
Classify each user surface by what it costs to validate one case against it. The
runtime validator reads this to plan isolation and batching: cheap surfaces run
one case per step; expensive surfaces are batched and sequenced to minimise
resets. Adjust the examples to this project's real surfaces.
-->

| Tier | What it costs | Isolation strategy | Example surfaces (this project) |
|---|---|---|---|
| **cheap** | One probe, no shared state, sub-second | One case per validation step; no batching needed | HTTP API via `curl`; pure CLI invocation; library function call |
| **medium** | A session that several cases can share | Group cases that share a session and don't mutate each other's state; reset between groups | Browser session (one login, several read-only assertions) |
| **expensive** | A full environment reset per case | Minimise resets; sequence reset-requiring cases at the end of a batch | Full DB reseed per case; device/simulator boot; destructive workflows |

Default tier if unsure: **medium**. Record the tier next to each surface in the
Tooling section above so the validator doesn't have to guess.

## Personas Registry

<!--
Personas live as a single registry file readable by humans and agents alike.
-->

**Location:** `docs/user-tests/_shared/personas.yaml`

**Schema:**

```yaml
personas:
  - id: anonymous_visitor
    description: Not logged in
    auth: null
    permissions: []
  - id: returning_reader
    description: Has account, subscribed to RSS
    auth:
      kind: session
      storageState: .auth/returning_reader.json
    permissions: [read]
    fixtures:
      user_row: tests/fixtures/personas/returning_reader.user.json
  - id: site_admin
    description: Has /admin access
    auth:
      kind: api_token
      env_var: ADMIN_API_TOKEN
    permissions: [read, write, admin]
```

**How to add:** open the file, append a new entry, run `/harness-stack:test-spec` to bind it to a case.

## Fixtures and Test Data

**Location:** `docs/user-tests/_shared/fixtures/` for cross-feature fixtures; `docs/user-tests/<feature>/fixtures/` for feature-local.

**Naming:** `<scenario>.<format>` — e.g. `empty-inbox.json`, `three-completed-reports.sql`, `large-list-1000.json`.

**Rule:** fixtures are static data. They do not import code. They can be loaded by any test runner or by the runtime validator directly.

## Artifacts

**Location:** `tests/runs/<timestamp>/<case-id>/`

**Each FAIL must produce:**

- `report.md` — the assertion that failed + the diff (expected vs observed)
- `repro.sh` — a runnable shell script that reproduces the probe in isolation
- `screenshot.png` (UI cases) — the moment of failure
- `console.log` / `network.har` (UI cases) — full capture
- `query.sql` (DB cases) — the exact query that returned the wrong row

**Retention:** keep latest 10 runs; older runs auto-pruned by CI.

## Anti-Patterns

<!--
Concrete examples of failure modes LLM agents hit when writing user tests.
Each item: name, what it looks like, why it's wrong, what to do instead.
-->

### Hallucinated assertion

**Looks like:** A case asserts "page shows a welcome banner" when no spec or AC mentions one.
**Why wrong:** The assertion is from the agent's imagination, not the contract. PASS gives false confidence; FAIL wastes debug time.
**Do instead:** Every assertion traces to a spec AC or a regression report. Cite the AC ID inline.

### Selector drift / implementation coupling

**Looks like:** `await page.click('.btn-primary-v2.cta-large')`
**Why wrong:** A CSS refactor breaks every test. The selector tells you nothing about user intent.
**Do instead:** `await page.getByRole('button', {name: 'Subscribe'}).click()`

### Tool-loop exhaustion

**Looks like:** Agent retries the same flaky probe 50 times, hits its tool budget, reports timeout instead of FAIL.
**Why wrong:** The probe was unreliable; the agent never decided.
**Do instead:** Cap retries at 3 with explicit waits between. If still flaky, declare INCONCLUSIVE and surface the attempt log.

### State leak between cases

**Looks like:** Case A creates a user. Case B finds it and passes. Case B fails when run alone.
**Why wrong:** Cases must be runnable in any order, including in isolation.
**Do instead:** Each case loads its own fixture + resets DB before running.

### Grader gaming

**Looks like:** When an LLM-as-judge grades responses, the agent writes output structured to please the grader while missing the underlying behaviour.
**Why wrong:** The grader is a proxy, not the truth.
**Do instead:** Pair LLM judges with deterministic probes (DOM / HTTP / DB) for the same assertion; require both to PASS.

## Knowledge Persistence

<!--
This doc is living. When a runtime validation run discovers a setup fact worth
keeping — a wrong healthcheck command, a missing seed step, a faster way to reach
a ready state, a surface gotcha — the validator records it back here so the next
run is faster. This section is where those facts accumulate.
-->

**Who writes here:** the runtime validator, after a run, for facts that outlive a
single run. Author-time conventions (tooling, selectors, isolation) stay in their
own sections above; this section is for operational discoveries.

**Format:** one entry per fact.

```
- [YYYY-MM-DD] <surface / step>: <fact discovered>. <what to do next time>.
```

**Examples:**

- `[2026-06-01] web ready signal: GET /health 200 fires ~3s before the SPA hydrates; wait for the role=main element, not just the health probe.`
- `[2026-06-01] db seed: tests/fixtures/seed/large-list.sql must run AFTER migrations, not before; ordering caused a FK error.`

**Rule:** facts only, no test cases. If a discovery changes a convention (e.g. the
real ready signal), also fix the relevant section above and note it here.

## Verification Checklist (for the patterns doc itself)

- [ ] Every platform in scope has primary + fallback tool with invocation pattern
- [ ] Case dimensions table is filled (mandatory vs optional explicit)
- [ ] Selector rules include both allowed and forbidden examples
- [ ] State isolation protocol named (which command resets state)
- [ ] Surface cost tiers classified (cheap / medium / expensive) with isolation strategy
- [ ] Personas registry path + schema documented
- [ ] Fixtures layout documented
- [ ] Artifacts path + retention rule documented
- [ ] Knowledge Persistence section present (may start empty)
- [ ] At least 4 anti-patterns called out concretely
