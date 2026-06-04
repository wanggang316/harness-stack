# Implementer Brief

You are implementing feature **`{FEATURE_ID}`** in milestone **`{MILESTONE}`**.

## Feature

{DESCRIPTION}

**Expected behavior (each must hold):**
{EXPECTED_BEHAVIOR}

**Verification steps (run each; capture real output):**
{VERIFICATION_STEPS}

## Boundaries (NEVER VIOLATE)

{BOUNDARIES}

<!--
Copied verbatim from plan.md Infrastructure: port range, services you may use,
off-limits services/paths, concurrency. If you cannot complete the feature within
these boundaries, set returnToController:true rather than crossing them.
-->

## File Scope

{FILE_SCOPE}

You may Read / Write / Edit within this scope. Touching files outside it means
reporting `BLOCKED` (or `returnToController:true`) rather than expanding silently.

## Working Directory

`{WORKDIR}` — do not work on `main` / `master` unless this brief says so.

## Preconditions (assume satisfied; report if not)

{PRECONDITIONS}

## Assertions this feature must make testable

{FULFILLS}

<!--
The VAL- ids from the feature's `fulfills`, each with a one-line restatement, e.g.:
  - VAL-AUTH-001 — valid credentials set a session cookie and redirect to /dashboard
You do NOT probe these — a runtime validator will, from outside, after you report DONE.
The full assertion definitions live in the plan's validation-contract.md; you don't
need to read them. If this feature is foundational (fulfills empty), state that.
-->

## Required Procedures

{PROCEDURES}

<!-- Named procedures to follow and tick off, e.g. "follow docs/frontend-spec.md
§accessibility", "use lib/db/transaction.ts not ad-hoc SQL", "run pnpm test path/x". -->

## Notes from the Controller

{NOTES}

## Handoff (mandatory)

When done:

1. Produce the standard implementer report (see `agents/implementer.md` §"Report format":
   Commands-executed table, atomic-commit block, assertions covered, procedures checklist).
2. **Also** write a handoff JSON and record it:

   ```json
   {
     "feature": "{FEATURE_ID}",
     "successState": "success | partial | failure",
     "summary": "2-4 sentences: what was built and how it was verified",
     "commits": ["<sha>"],
     "filesChanged": ["path/one", "path/two"],
     "verificationEvidence": ["<step verbatim> -> <actual result>", "..."],
     "discoveredIssues": [{"summary": "...", "severity": "blocker|bug|tech-debt|nit", "detail": "..."}],
     "whatWasLeftUndone": ["scoped work you did not finish (e.g. skipped manual QA)"],
     "criticalContext": ["fact the next worker/validator MUST know that isn't in code"],
     "returnToController": false
   }
   ```

   Write it to a file, then run `hs-plan write-handoff {FEATURE_ID} <path>`. There must be
   one `verificationEvidence` entry per verification step — if you couldn't run one, say
   `failure: <reason>`. Set `returnToController:true` only when you hit something you
   cannot solve (missing precondition, boundary conflict, ambiguous spec).
3. Return a 2-3 sentence summary to the controller.
