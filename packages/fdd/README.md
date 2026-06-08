# @hs/fdd

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

`fdd` does **no LLM work**. It is a pure, tested, in-repo helper that the FDD
skills delegate mechanical state transitions to — the same role `@hs/llm` plays
for model invocation. Keeping these transitions in tested TypeScript (rather than
hand-edited JSON in a skill prompt) keeps state versioned and the agent's context
clean.

## Commands

```
fdd init <slug>                     scaffold a plan dir + make it active
fdd use <slug>                      switch the active plan
fdd active                          print "<slug>\t<dir>"
fdd list-plans                      list slugs ("* " marks active)

fdd next-feature                    "<id>\t<agent>\t<milestone>" of first pending feature
fdd set-status <id> <status>        terminal status moves the feature to the bottom
fdd list-features                   "<status>\t<milestone>\t<id>" per feature
fdd milestone-status <milestone>    "<status>\t<count>" per status

fdd init-state                      (re)generate validation-state.json from the contract
fdd contract-coverage               each assertion claimed by exactly one feature, else exit 2
fdd set-assertion <VAL-id> <status> [evidence]
fdd gate                            exit 0 only if every assertion is "passed"

fdd seal-milestone <m> | is-sealed <m>
fdd write-handoff <feature-id> <json-file> | handoff <feature-id>
```

`--plan <slug>` overrides the active plan for any command.

**Exit codes:** `0` success · `1` data error · `2` invariant violation (coverage/gate) · `3` usage error.

The runtime root is `<git-toplevel>/.harness-runtime`, overridable with `$HS_PLAN_RUNTIME_DIR`.
