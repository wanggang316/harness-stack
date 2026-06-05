# Phase 1 — Planning

The most important phase. Quality here is amplified by every later phase; rushed
planning causes omissions, rework, and failed builds. Do not enter Phase 2 until the
user has explicitly accepted the plan.

## Step 0 — Init

Pick a short kebab-case slug (`checkout-flow`, `auth-migration`) and:

```bash
hs-plan init <slug>     # creates .harness-runtime/plans/<slug>/ + makes it active
hs-plan active          # verify
```

## Step 1 — Understand requirements with the user

Goal: surface what the user actually wants (not your assumptions), catch implicit /
offhand requirements, and map infrastructure boundaries.

1. **Restate the goal** in one paragraph, ending with "*tell me where this is wrong.*" Wait for correction.
2. Identify the **user-facing surfaces** (CLI, HTTP API, UI pages, background jobs, library). Confirm with the user.
3. Ask clarifying questions. Use `AskUserQuestion` to group 2-4 related decisions; don't mix unrelated ones.

Suggested clarification topics (skip any already answered):

| Topic | Why it matters downstream |
|---|---|
| Scope boundaries — "is X in scope?" | Prevents feature creep in Phase 3 |
| Non-functional needs: performance, security, accessibility | Become cross-area assertions in the contract |
| Tech preferences / constraints | Shape implementer briefs |
| Testing surface — real browser? curl? CLI? | Shapes the contract's evidence + the user-test probe |
| Infrastructure — ports? existing services? off-limits resources? | Written verbatim into `plan.md` Infrastructure (worker boundaries) |

**Do not assume.** When unsure, ask. An offhand "oh, it should also…" is a full
requirement — capture it. Reframe vague asks into concrete, testable intent;
surface assumptions explicitly; separate must-have from nice-to-have.

## Step 2 — Investigate the codebase

Delegate to read-only subagents (`harness-stack:architect` or a plain Explore agent);
run independent investigations in parallel. **You** read only structure: README,
AGENTS.md, manifests (`package.json` / `Cargo.toml` / `pyproject.toml`), the top-level
tree, and top-level build/test entry points. Subagents read: existing module structure
in the affected area, how sibling features are wired, the test framework and how to run
a single test, whether the target surface already exists, and which dev/db/queue
services run on which ports.

Each investigation prompt states its **goal** (what decision it informs), **scope**
(which paths), and **expected output** (a paragraph + short list with `path:line`, not
a code dump). If you must run the project to learn how, **confirm how to run it** —
build/test commands, dev server, db config, required services, env vars.

## Step 3 — Online research (only if needed)

If the build leans on a small/new ecosystem or an SDK-heavy integration where exact
API surface matters, dispatch a research subagent (with WebSearch/WebFetch). Distil
durable findings into the `docs/` Library, not the plan.

## Step 4 — Identify and confirm milestones

A **milestone** is a vertical slice that leaves the product in a testable, coherent
state. Each milestone boundary triggers full validation (review + user-test).

- Small build: **1 milestone** (validators run once at the end).
- Medium: **2-3 milestones**, organized by surface or "layers then integration."
- Large: **3-5 milestones**. More than 5 usually means the work should be split.

Present each milestone as a name + one-line "after this, the product can do X." Get
explicit agreement before continuing.

## Step 5 — Infrastructure and boundaries

Confirm and record what workers may and may not touch: port range for new services;
external services they may use (e.g. existing postgres on `:5432`); off-limits services
and paths; concurrency rules (default: one feature at a time). These go verbatim into
the `plan.md` **Infrastructure** section and are echoed into the implementer brief's
Boundaries block — there is no per-plan AGENTS.md, so `plan.md` is authoritative for
boundaries.

## Step 6 — Testing strategy

Confirm: the **test command** (verify it works *now* — dispatch a subagent to run it
once); the **user-test surface** (how the validator exercises the product end-to-end —
dev server + browser MCP, curl against the API, CLI binary, library fixtures); and the
**surface cost tier** per surface (cheap / medium / expensive), which the user-test
probe uses to choose an isolation strategy. These conventions live in
`docs/user-test-patterns.md` (Library); reference it rather than re-deriving.

## Step 7 — Draft features (shape only)

List candidate features per milestone — enough to confirm scope with the user. Each
should be ~one worker session of work, independently reviewable, and concrete (a
specific endpoint/table/component/function), with foundational features before
dependents. Defer preconditions/`verificationSteps` to Phase 3.

## Step 8 — Write the plan

Write the accepted proposal to `.harness-runtime/plans/<slug>/plan.md` using
`references/plan-template.md`. Echo every captured requirement in the **Captured
requirements** section before presenting.

## Step 9 — Acceptance gate

Present the plan and ask: *"Accept this plan? Propose changes and I'll revise."* On
acceptance, the `plan.md` stands as the agreed proposal; tell the user you're moving to
Phase 2 (contract) and will return for review when artifacts are ready.

## Anti-patterns

- ❌ Investigating the codebase before Step 1 (you don't know what to look for yet).
- ❌ Investigating it yourself instead of via subagents (pollutes your context).
- ❌ Decomposing features (Step 7) before milestones are confirmed (Step 4).
- ❌ Writing `features.json` here — that's Phase 3, after the contract.
- ❌ Skipping the requirement replay (near-certain to drop a requirement).
