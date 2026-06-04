# @hs/plan

Deterministic bookkeeping CLI for harness-stack **feature-driven development (FDD)**.

FDD keeps per-plan state in a gitignored runtime tree, one directory per plan:

```
.harness-runtime/plans/<plan-slug>/
├── plan.md                 # human-readable plan overview (free markdown)
├── validation-contract.md  # testable assertions, one H3 per: "### VAL-<AREA>-NNN: <title>"
├── validation-state.json   # { assertions: { "VAL-AUTH-001": { status, evidence? } } }
├── features.json           # { features: [ { id, agent, milestone, fulfills, status, ... } ] }
├── sealed-milestones.json  # auxiliary: validated milestones
└── handoffs/<feature-id>.json
```

`hs-plan` does **no LLM work**. It is a pure, tested, in-repo helper that the FDD
skills delegate mechanical state transitions to — the same role `@hs/llm` plays
for model invocation. Keeping these transitions in tested TypeScript (rather than
hand-edited JSON in a skill prompt) keeps state versioned and the agent's context
clean.

## Commands

```
hs-plan init <slug>                     scaffold a plan dir + make it active
hs-plan use <slug>                      switch the active plan
hs-plan active                          print "<slug>\t<dir>"
hs-plan list-plans                      list slugs ("* " marks active)

hs-plan next-feature                    "<id>\t<agent>\t<milestone>" of first pending feature
hs-plan set-status <id> <status>        terminal status moves the feature to the bottom
hs-plan list-features                   "<status>\t<milestone>\t<id>" per feature
hs-plan milestone-status <milestone>    "<status>\t<count>" per status

hs-plan init-state                      (re)generate validation-state.json from the contract
hs-plan contract-coverage               each assertion claimed by exactly one feature, else exit 2
hs-plan set-assertion <VAL-id> <status> [evidence]
hs-plan gate                            exit 0 only if every assertion is "passed"

hs-plan seal-milestone <m> | is-sealed <m>
hs-plan write-handoff <feature-id> <json-file> | handoff <feature-id>
```

`--plan <slug>` overrides the active plan for any command.

**Exit codes:** `0` success · `1` data error · `2` invariant violation (coverage/gate) · `3` usage error.

The runtime root is `<git-toplevel>/.harness-runtime`, overridable with `$HS_PLAN_RUNTIME_DIR`.
