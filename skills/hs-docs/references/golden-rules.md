# Golden Rules

Non-negotiable principles for projects that use AI coding agents. Golden rules encode the invariants that make agent-human collaboration reliable — they should be enforced mechanically wherever possible.

## When to Write

- Initializing a new project that uses AI coding agents
- Adding principles learned from agent failures or drift
- Onboarding new team members or agents to the project

**Don't write for**: Obvious software engineering best practices that don't need restating, or rules that are already enforced by tooling without documentation.

## Process

1. **Identify the invariant** — What principle, if violated, causes cascading problems?
2. **Write the rule** — One sentence, imperative. No hedging.
3. **Add rationale** — Why this rule exists. What goes wrong without it.
4. **Define enforcement** — How is this checked? Linter, CI, code review, sweep agent?
5. **Save** — Write to `docs/golden-rules.md` in project root

## Structure

```markdown
# Golden Rules

These rules are non-negotiable. Some are enforced by repository checks and CI, while others remain process rules that should be encoded mechanically over time.

When agents struggle, the fix is almost never "try harder." Ask: "What capability is missing, and how do we make it legible and enforceable?"

---

## 1. [Rule title]

[One paragraph: what the rule is and why it matters.]

**Enforcement:** [How this is checked — linter, CI, code review, sweep agent, etc.]

## 2. [Rule title]

...
```

## Core Rules

These rules apply to most agent-first projects. Adapt or extend for your context.

| # | Rule | Why |
|---|---|---|
| 1 | AGENTS.md is a map, not a manual | Keep under 150 lines. Progressive disclosure: small stable entry point, pointers to deeper docs |
| 2 | Validate boundaries, never probe data | Parse and validate at system edges. Never guess at data shapes |
| 3 | Prefer shared utilities over hand-rolled helpers | Centralizes invariants, prevents drift across agent-generated code |
| 4 | Repository knowledge is the system of record | If it's not in the repo, it doesn't exist to the agent |
| 5 | Every complex change gets an execution plan | Plans track progress, surprises, and decisions as living documents |
| 6 | Fix the environment, not the prompt | Agent failures are environment bugs — fix with tools, docs, or guardrails |
| 7 | Enforce architecture mechanically | Encode invariants as linters and structural tests, not just documentation |
| 8 | Commit in small, deliberate steps | Narrow diffs are easier to reason about for both agents and humans |
| 9 | Corrections are cheap, waiting is expensive | Fast fix-forward beats slow gates. Keep merge gates minimal |
| 10 | Garbage-collect continuously | Agents replicate existing patterns — including bad ones. Sweep regularly |
| 11 | Agent legibility is the primary design goal | Optimize code and docs for agent readability. If the agent can't access it in-context, it doesn't exist |

## Key Principles

- **Rules, not guidelines** — Golden rules are non-negotiable. If it's optional, it's not a golden rule.
- **Enforce mechanically** — Every rule should have a path to automated enforcement. Documentation rots; linters don't.
- **Fix structurally** — When a rule is violated, ask what's missing in the environment, not what's wrong with the agent.
- **Keep the list short** — 10-15 rules maximum. If everything is a golden rule, nothing is.

## Verification

- [ ] Each rule has a clear, imperative statement
- [ ] Each rule has rationale explaining why it matters
- [ ] Each rule has an enforcement mechanism defined
- [ ] Rules are numbered sequentially
- [ ] Total count is under 15
- [ ] Rules reflect actual project constraints, not aspirational ideals
