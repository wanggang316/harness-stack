# User-Test Document Template

Use this skeleton when authoring `docs/user-tests/<feature>.md`. Every section is required. The case structure is mandatory — downstream tooling parses it. The document is organized by **area** (the feature's user-visible sub-capabilities); within each area, journeys group cases.

---

```markdown
---
name: <feature-slug>
description: User-test set for <feature>. Authored by /harness-stack:test-spec. Read `docs/user-test-patterns.md` for project-wide testing conventions before editing.
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

## Areas

<!--
List the feature's user-visible sub-capabilities. Each becomes an `## Area:`
section below. Scale to the feature: a simple feature is one area; do not split
artificially. Flows that span areas WITHIN this feature go in Cross-Area
Journeys. Flows that cross into OTHER features are out of scope — record them in
Open Questions.
-->

1. Credential sign-in
2. Password recovery
3. Session persistence

## Area: Credential sign-in

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

**Evidence:**
<!-- The proof a validator must capture to call this case PASS, regardless of
outcome. Distinct from the per-assertion verification method (how you check)
and from Artifacts on FAIL (what you keep when it fails). -->
- `screenshot` of the rendered list region
- `network: GET / → 200`
- DOM snapshot of the 3 `<a>` hrefs

**Artifacts on FAIL:**
- `screenshot.png` of the page state at first failed assertion
- `console.log` and `network.har` from the navigation
- For each FAIL, a `repro.sh` that reruns the probe in isolation

#### Case `UT-<FEATURE>-002`: <next case>

(repeat structure)

## Area: Password recovery

### Journey 2: <next journey>

(repeat structure)

## Cross-Area Journeys

<!--
Flows that span sub-capabilities WITHIN this feature (e.g. recover password →
then sign in with the new one). Same case structure. Leave the section present
but empty if the feature has no within-feature integration flow.
-->

### Journey N: Recover password then sign in

#### Case `UT-<FEATURE>-050`: New password works on next sign-in

**Covers AC:** AC6  <!-- or (non-AC: within-feature integration guard) -->

(repeat structure)

## Negative & Edge Journeys

<!--
Error paths, edge inputs, and forbidden actions. Same case structure.
-->

### Journey M: Unauthorized access is rejected

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

**Evidence:**
- `screenshot` of the `/login` page with the flash message
- `network: GET /admin → 302`

**Artifacts on FAIL:**
- `screenshot.png`, `network.har`

## Coverage Matrix

<!--
Bidirectional coverage.
- Every Acceptance Criterion MUST appear with ≥ 1 covering case. If an AC is
  intentionally not covered here, record the row with a one-line reason.
- Every case MUST trace to ≥ 1 AC, or be marked `(non-AC: <reason>)`. No case
  is left dangling (no orphans).
-->

### AC → cases

| Spec AC | Covered by |
|---------|------------|
| AC1 | UT-<FEATURE>-001 |
| AC2 | UT-<FEATURE>-001, UT-<FEATURE>-002 |
| AC3 | UT-<FEATURE>-003 |
| AC8 | UT-<FEATURE>-099 |
| AC9 | — verified by build gate (`pnpm --filter web check`), not a user-observable case |

### Case → AC (orphan check)

| Case | Traces to |
|------|-----------|
| UT-<FEATURE>-001 | AC1, AC2 |
| UT-<FEATURE>-050 | (non-AC: within-feature integration guard) |
| UT-<FEATURE>-099 | AC8 |

## Personas / Fixtures Added During Authoring

<!--
If this document introduced new personas or fixtures into the shared registry,
record them here so a reviewer can trace the additions.
-->

- Added persona `returning_reader` to `docs/user-tests/_shared/personas.yaml`
- Added fixture `three-completed-reports.sql` to `docs/user-tests/_shared/fixtures/seed/`

## Open Questions

<!--
Questions that cannot be resolved without input from the PM (spec author) or the
design-doc author. Each should have a default proposed answer so this document
is not blocked. Also record any cross-feature integration flows that surfaced
during authoring but are out of scope here — they belong to milestone
integration verification.
-->

1. Should `UT-<FEATURE>-099` also assert the flash message survives a page reload? **Default:** no — out of scope for this iteration.
2. Cross-feature flow surfaced: "checkout reserves inventory from the catalog feature". Out of scope here; verify at milestone integration.
```
