# @hs/fdd

Deterministic bookkeeping CLI for harness-stack **feature-driven development (FDD)**.

FDD keeps per-plan state in a gitignored runtime tree, one directory per plan:

```
.harness-runtime/plans/<plan-slug>/
├── plan.md                 # human-readable plan overview (free markdown)
├── validation-contract.md  # testable assertions, one H3 per: "### VAL-<AREA>-NNN: <title>"
├── validation-state.json   # { assertions: { "VAL-AUTH-001": { status, evidence? } } }
├── features.json           # { features: [ { id, agent, milestone, fulfills, status, ... } ] }
├── events.jsonl            # append-only, system-timestamped execution events
├── sealed-milestones.json  # auxiliary: validated milestones
└── handoffs/<feature-id>.json
```

`fdd` does **no LLM work**. It is a pure, tested, in-repo helper that the FDD
skills delegate mechanical state transitions to — the same role `@hs/llm` plays
for model invocation. Keeping these transitions in tested TypeScript (rather than
hand-edited JSON in a skill prompt) keeps state versioned and the agent's context
clean.

## Distribution

The CLI ships as a **committed, prebuilt single-file bundle** at `bin/fdd.mjs`
(dependencies inlined; Node >= 20 is the only runtime requirement). Plugin users
never install anything or compile on site — invoke it as:

```bash
node "<plugin-root>/packages/fdd/bin/fdd.mjs" <subcommand> ...
```

`fdd <subcommand>` in the skills is shorthand for that invocation. Resolution
order, usage, and troubleshooting live in `<plugin-root>/references/fdd-cli.md`.

Developers changing `src/` must regenerate the bundle and commit it alongside
the source: `pnpm --filter @hs/fdd build` (tsc for `dist/` + esbuild for
`bin/fdd.mjs`).

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

fdd log <kind> <subject> <message>  append an event; print its JSON
fdd progress                       print counts, current work, next pending, last 10 events
```

`--plan <slug>` overrides the active plan for any command.

**Exit codes:** `0` success · `1` data error · `2` invariant violation (coverage/gate) · `3` usage error.

The runtime root is `<git-toplevel>/.harness-runtime`, overridable with `$HS_PLAN_RUNTIME_DIR`.

## Execution events

```bash
fdd log dispatch feature-a "worker=42 phase=implementation session=abc"
fdd log progress feature-a "phase=build session=build-7 evidence=logs/build.txt"
fdd log handoff feature-a "worker=42 handoff=handoffs/feature-a.json"
fdd progress
```

`log` creates `events.jsonl` on first use. Each record has `timestamp` (system UTC
ISO time), `kind` (kebab-case), `subject` (nonempty single line), and `message`
(nonempty text). The UTF-8 encoded JSON line must fit within 16 KiB. Quote the
message as one argument; use `--` before positional arguments beginning with
`--`. Kinds are extensible; common values are `dispatch`, `progress`, `completed`,
`handoff`, `blocked`, `recovery`, `resource`, and `decision`.

A single append write preserves concurrent workers' records on local filesystems;
use a local runtime directory, not an NFS/shared network mount. I/O failures are
reported, and malformed or incomplete records cause a data error when read.
Events do not change feature or assertion status. The controller remains the
single writer for those existing state files. `progress` renders to stdout only;
it never overwrites `plan.md` or its Decision Log. Recent events use append order,
not timestamp sorting. Event age alone does not establish worker liveness; these
commands do not monitor processes, schedule wakeups, or record events implicitly.

Library users can import `logEvent`, `readEvents`, `progressReport`, `eventsPath`,
and the `ProgressEvent` type from `@hs/fdd`.
