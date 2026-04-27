Load and execute the hs-review-receive skill to handle code review feedback with technical rigor.

Read the skill definition at `skills/hs-review-receive/SKILL.md` and follow its Response Pattern:

1. **READ** — absorb the full report before reacting.
2. **RESTATE** — restate each requirement in your own words, or ask for clarification on unclear items.
3. **VERIFY** — check each claim against the current codebase.
4. **DECIDE** — accept, push back with technical reasoning, or ask.
5. **APPLY** — implement one item at a time; test after each.

**Forbidden**: "You're absolutely right!", "Great catch!", "Thanks for…" — any performative agreement. State the fix or push back with `file:line` evidence.

**Order**: clarify unclear items first, then blocking issues, then simple fixes, then complex fixes. Test each fix individually.

Severity labels: **Critical / Important / Suggestion / Nit / FYI**. For the standards the reviewer followed, see `skills/hs-review/SKILL.md`.
