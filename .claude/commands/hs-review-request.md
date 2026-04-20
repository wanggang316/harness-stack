Load and execute the hs-review-request skill to dispatch a fresh-context reviewer.

Read the skill definition at `skills/hs-review-request/SKILL.md` and follow its Process:

1. **Pin the diff range** — capture `BASE_SHA` and `HEAD_SHA` (`git merge-base HEAD origin/main`, `git rev-parse HEAD`).
2. **Write the brief** — fill the template with review range, spec / ExecPlan path, one-paragraph summary, and focus areas. Do not pipe your session history in.
3. **Dispatch** — invoke the `Task` tool with the `code-reviewer` subagent (`agents/code-reviewer.md`); paste the brief as the prompt.
4. **Act on the report** — resolve every Critical, resolve or defer every Important, consider Suggestions, treat Nits as discretionary.

Severity labels: **Critical / Important / Suggestion / Nit / FYI**. After findings are addressed, switch to `hs-review-receive` for response discipline.

For the reviewer's evaluation process and output template, see `skills/hs-review/SKILL.md`.
