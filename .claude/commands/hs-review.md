Load and execute the hs-review skill to conduct a multi-axis code review.

Read the skill definition at `skills/hs-review/SKILL.md` and follow its Process:

0. **Spec compliance pass first** — extract every requirement from spec / ExecPlan / PR description, classify each against the diff (DONE / PARTIAL / NOT DONE / CHANGED), flag scope creep. Emit a `Scope:` line in the report.
1. **Context** — confirm the intended behavior.
2. **Tests first** — tests reveal intent and coverage.
3. **Walk the diff** — apply the five axes (Correctness / Readability / Architecture / Security / Performance) and use `docs/references/review-checklist.md` as the pattern dictionary (SQL safety, LLM trust boundary, enum completeness, race conditions, type coercion).
4. **Read code outside the diff** when required (enum completeness, callers of changed signatures, test files).
5. **Categorize and cite** — every finding gets a severity label and a `file:line` pointer.
6. **Verify verification** — tests pass, build succeeds, manual / benchmark evidence if applicable.

Severity labels: **Critical / Important / Suggestion / Nit / FYI**. Every finding must cite `file:line` + what + why + fix.

Emit the review using the skill's Output Template: Range / Spec / **Scope** / Strengths / Findings (grouped by severity) / Verification / Verdict + reasoning.

For deep security analysis, consult `skills/hs-security/SKILL.md` and `docs/references/security-checklist.md`, or dispatch the `security-auditor` subagent (`agents/security-auditor.md`).
For deep performance analysis, consult `docs/references/performance-checklist.md`.
For test coverage concerns, dispatch the `test-engineer` subagent (`agents/test-engineer.md`).

**Related skills:**
- `hs-review-request` — author side: dispatching parallel review lanes (code / security / tests).
- `hs-review-receive` — author side: handling reviewer findings.
