# User-Test Document Template

Use this skeleton when authoring `docs/user-tests/<feature>.md`. Every section is required. The case structure is mandatory — downstream tooling parses it.

---

```markdown
---
name: <feature-slug>
description: User-test set for <feature>. Authored by /hs-test-spec. Read `docs/user-test-patterns.md` for project-wide testing conventions before editing.
---

# User Tests: <Feature Title>

**Status:** Draft | Approved | In Progress | Verified
**Author:** [name]
**Date:** YYYY-MM-DD
**Spec:** [docs/product-specs/<feature>.md](../product-specs/<feature>.md)
**Design:** [docs/design-docs/<feature>.md](../design-docs/<feature>.md) (if exists)

## Personas Used

<!--
Reference personas by ID from `docs/user-tests/_shared/personas.yaml`. One line
per persona, with the in-context purpose.
-->

- `anonymous_visitor` — drives the public read path
- `returning_reader` — drives the subscription / personalized paths
- `site_admin` — verifies admin paths are not broken

If a persona had to be added during authoring, note it here and confirm the
addition landed in the shared registry.

## Journeys

<!--
A journey is one persona reaching one observable outcome via a sequence of
actions. One subsection per journey. Each contains one or more cases.
-->

### Journey 1: <verb phrase from persona's view>

**Persona:** `<persona-id>`
**Outcome:** <what the user achieves at the end>

#### Case `UT-<FEATURE>-001`: <one-line case name>

**Covers AC:** AC1, AC2

**Preconditions:**
- DB seed: `docs/user-tests/_shared/fixtures/seed/three-completed-reports.sql`
- Auth: persona `anonymous_visitor` (no session)
- Environment: `VITE_SITE_URL` resolves to a reachable origin
- App started: see ready signal in `docs/user-test-patterns.md`

**Steps:**
1. Navigate to `<base-url>/`
2. Wait for the heading with role=heading + name=/InboxLM AI Daily/ to be visible
3. Read all `<a>` elements inside the main list region

**Assertions:**
1. (DOM query) The header contains the text `InboxLM AI Daily`
2. (DOM query) The list region contains exactly 3 `<a>` elements
3. (DOM query) Each `<a>` element has an `href` matching `/d/[a-z0-9-]+`
4. (DOM query) The first list item's date label matches the most recent report's `window_end` (per fixture)

**Artifacts on FAIL:**
- `screenshot.png` of the page state at first failed assertion
- `console.log` and `network.har` from the navigation
- For each FAIL, a `repro.sh` that reruns the probe in isolation

#### Case `UT-<FEATURE>-002`: <next case>

(repeat structure)

### Journey 2: <next journey>

(repeat structure)

## Negative & Edge Journeys

<!--
Group cases that exercise error paths, edge inputs, and forbidden actions here.
Same case structure.
-->

### Journey N: Unauthorized access is rejected

#### Case `UT-<FEATURE>-099`: Anonymous visitor cannot reach /admin

**Covers AC:** AC8

**Preconditions:**
- Auth: persona `anonymous_visitor`
- App started

**Steps:**
1. Navigate to `<base-url>/admin`
2. Wait for navigation to settle

**Assertions:**
1. (URL) Final URL path is `/login`
2. (DOM query) Page contains a flash message with role=alert
3. (Network) The request to `/admin` returned HTTP 302 (or 401, per spec)

**Artifacts on FAIL:**
- `screenshot.png`, `network.har`

## Coverage Matrix

<!--
Every Acceptance Criterion in the spec MUST appear here with ≥ 1 covering case.
If an AC is intentionally not covered at the user-test level, record the row
with a one-line reason.
-->

| Spec AC | Covered by |
|---------|------------|
| AC1 | UT-<FEATURE>-001 |
| AC2 | UT-<FEATURE>-001, UT-<FEATURE>-002 |
| AC3 | UT-<FEATURE>-003 |
| AC8 | UT-<FEATURE>-099 |
| AC9 | — verified by build gate (`pnpm --filter web check`), not a user-observable case |

## Personas / Fixtures Added During Authoring

<!--
If this document introduced new personas or fixtures into the shared registry,
record them here so a reviewer can trace the additions.
-->

- Added persona `returning_reader` to `docs/user-tests/_shared/personas.yaml`
- Added fixture `three-completed-reports.sql` to `docs/user-tests/_shared/fixtures/seed/`

## Open Questions

<!--
Questions that cannot be resolved without input from the PM (spec author) or
the design-doc author. Each should have a default proposed answer so this
document is not blocked.
-->

1. Should `UT-<FEATURE>-099` also assert the flash message survives a page reload? **Default:** no — out of scope for this iteration.
```
