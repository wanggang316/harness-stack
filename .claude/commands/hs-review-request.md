Load and execute the hs-review-request skill to dispatch fresh-context reviewers in parallel lanes.

Read the skill definition at `skills/hs-review-request/SKILL.md` and follow its Process:

1. **Pin the diff range** — `BASE_SHA=$(git merge-base HEAD origin/main)`, `HEAD_SHA=$(git rev-parse HEAD)`.
2. **Pick the lanes** — `code-reviewer` always; add `security-auditor` when the diff touches auth / input / secrets / crypto / raw queries / shell / LLM trust boundary; add `test-engineer` for bug fixes, critical-path changes, or test-infra changes.
3. **Write the brief** — fill the template with review range, spec / ExecPlan path, one-paragraph summary, focus areas, and the lanes you picked (with reason). Do not pipe your session history in.
4. **Dispatch in parallel** — invoke the `Task` tool once per lane in the same round (`code-reviewer` / `security-auditor` / `test-engineer`); paste the same brief as the prompt for each.
5. **Merge and act on the reports** — dedupe by `file:line`, take the higher severity on conflicts unless one lane explicitly overrides the other, surface lane disagreements to the human. Resolve every Critical, resolve or defer every Important, consider Suggestions, treat Nits as discretionary.

Round budget: **two rounds per lane**. After that, escalate to a human — the change likely needs splitting or the spec is wrong.

Severity labels: **Critical / Important / Suggestion / Nit / FYI**. After findings are addressed, switch to `hs-review-receive` for response discipline.

For the reviewer's evaluation process and output template, see `skills/hs-review/SKILL.md`.
