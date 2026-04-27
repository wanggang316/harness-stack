---
name: hs-review-request
description: Dispatches one or more fresh-context reviewer subagents in parallel before merge. Use when you (the author) finish a non-trivial change and need code, security, and/or test scrutiny — pin the diff range, fill the brief template for each lane, fan out lanes via Task, and merge multi-lane reports back into a single set of findings.
---

# Request Code Review

## Overview

You are the author. Dispatch fresh-context reviewer subagents to catch issues before merge. Each reviewer sees only the diff, the spec, and the brief — never your session history. Fresh context catches what you missed.

This skill answers three questions:

1. **Do I need a review?** (default: yes for non-trivial changes; see "When NOT to dispatch")
2. **Which lanes?** (code is always; security and tests are conditional)
3. **How do I dispatch and merge?** (the steps below)

The reviewer methodology lives self-contained inside each agent (`agents/code-reviewer.md`, `agents/security-auditor.md`, `agents/test-engineer.md`). The brief templates in this folder turn that methodology into a fillable prompt.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**

- Before opening or merging a PR.
- After `hs-exec-plan` completes an ExecPlan task or batch.
- After a non-trivial feature, bug fix, or refactor.
- When the change touches security-sensitive paths, auth, or data migrations.
- When you are about to ship AI-generated code — it needs more scrutiny, not less.

**When NOT to dispatch:**

- Trivial changes where the diff is self-evident (typo, single-file rename).
- Auto-generated code or lockfile bumps where a reviewer cannot add value.
- After two rounds on the same diff with the reviewer — stop and escalate to the human.

## Lane Selection

The code lane is the default and runs every time. Add parallel lanes when the diff hits territory that benefits from a specialist pass.

| Lane | Subagent | Brief template | Trigger |
|---|---|---|---|
| Code | `code-reviewer` | `skills/hs-review-request/code-reviewer.md` | Always. Five-axis review. |
| Security | `security-auditor` | `skills/hs-review-request/security-auditor.md` | Diff touches auth, sessions, tokens, user input, secrets, crypto, raw queries, shell/`eval`, dependency upgrades, or LLM output that flows into DB / external HTTP / code execution. |
| Tests | `test-engineer` | `skills/hs-review-request/test-engineer.md` | Diff is a bug fix (regression test required), changes a critical business path, modifies test infrastructure, or the spec demands a coverage target. |

### Heuristics

- **Auth / payments / data migrations** → at least Code + Security.
- **AI agent / LLM tool calling / RAG** → at least Code + Security (LLM trust boundary).
- **Bug fix** → at least Code + Tests (regression-test requirement).
- **Pure refactor with high test coverage already** → Code only is fine.
- **Trivial change** (typo, single-file rename) → no review needed.

Don't dispatch a lane "just in case." Each lane is reviewer capacity that has to come back with usable findings. Match the lane to the diff.

## How to Request

### 1. Pin the diff range

```bash
BASE_SHA=$(git merge-base HEAD origin/main)   # or the PR base
HEAD_SHA=$(git rev-parse HEAD)
git diff --stat "$BASE_SHA..$HEAD_SHA"
```

If the change spans multiple commits, confirm the base matches what the reviewer should see. Don't leave the reviewer to guess.

### 2. Fill the brief template for each lane

For every lane you selected, open the matching template in this folder and fill in the placeholders:

| Placeholder | What to put |
|---|---|
| `{DESCRIPTION}` | One paragraph on what was implemented. |
| `{SPEC_PATH}` | Path to spec / ExecPlan / PR description, e.g. `docs/specs/<feature>.md`. |
| `{BASE_SHA}` | The base SHA from step 1. |
| `{HEAD_SHA}` | The head SHA from step 1. |
| `{FOCUS_AREAS}` | Files or axes that deserve extra scrutiny. |
| `{NOTES}` | Anything the reviewer needs to know that isn't in the diff (constraints, prior decisions, known limitations). |
| `{TRUST_SURFACES}` | (security only) Untrusted inputs and where they cross into trusted code. |
| `{RISK_AREAS}` | (tests only) Paths that especially need confidence. |
| `{COVERAGE_SNAPSHOT}` | (tests only) Paste coverage output, or `n/a`. |

The brief is the user-message prompt for the subagent. It is intentionally lean — the methodology lives in the agent's system prompt.

### 3. Dispatch in parallel

Invoke the `Task` tool **once per lane, in the same round** so the lanes run in parallel:

```
Task(subagent_type="code-reviewer",     prompt=<filled code-reviewer.md>)
Task(subagent_type="security-auditor",  prompt=<filled security-auditor.md>)
Task(subagent_type="test-engineer",     prompt=<filled test-engineer.md>)
```

Each subagent runs in fresh context (independent window, no inherited session state). Sequencing the lanes wastes wall-clock time and makes cross-lane reconciliation harder.

### 4. Merge the reports

Each lane returns findings labeled with the severity vocabulary below. When multiple lanes ran, merge before responding:

1. **Dedupe** — the same `file:line` flagged by two lanes counts as one finding; keep the more specific framing (security wording over generic, test-coverage wording over generic).
2. **Reconcile severity** — if lanes disagree, take the higher severity unless one lane explicitly cites why the other is wrong (e.g., security-auditor: "not exploitable because input is constrained at `<file:line>`").
3. **Note conflicts** — if lanes disagree on whether something is a bug, surface that to the human; do not silently pick a side.
4. **Preserve per-lane context** — security findings keep their Category / Exploitability / Blast radius; test findings keep their coverage citations. Don't flatten into a generic list.

Hand the merged report off to `hs-review-receive` for application.

## Severity Vocabulary

Reviewers emit findings labeled with these prefixes. Use them when triaging the report.

| Prefix | Author action |
|---|---|
| **Critical** | Resolve before merge — no exceptions. |
| **Important** | Resolve before merge, or document a deferral with a tracked follow-up. |
| **Suggestion** | Consider; file a follow-up if deferred. |
| **Nit** | Author discretion. |
| **FYI** | No action. |

If a reviewer emits findings without severity labels or `file:line` citations, that's a defective report — push back rather than acting on it.

## Round Budget and Escalation

**Two rounds per lane.** If a lane is still raising Critical / Important findings on the third round, stop dispatching and escalate to a human:

- The change may need splitting (see `skills/hs-git/SKILL.md`).
- The spec may be wrong or under-specified.
- The reviewer and author may have an unresolved technical disagreement that needs a third party.

Re-dispatching before the previous round's Critical / Important findings are resolved wastes reviewer capacity and dilutes signal.

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git merge-base HEAD origin/main)
HEAD_SHA=$(git rev-parse HEAD)
# BASE_SHA=a7981ec, HEAD_SHA=3df7661

# This change adds /api/login that hits the DB — code + security lanes.

[Dispatch code-reviewer with filled brief from skills/hs-review-request/code-reviewer.md]
  DESCRIPTION:  Verification and repair functions for conversation index
  SPEC_PATH:    docs/specs/conversation-index.md
  BASE_SHA:     a7981ec
  HEAD_SHA:     3df7661
  FOCUS_AREAS:  Concurrency on repairIndex(), error path on verifyIndex()
  NOTES:        Migration from prior schema in db/0041; no rollback path.

[Dispatch security-auditor with filled brief from skills/hs-review-request/security-auditor.md (parallel)]
  TRUST_SURFACES: POST /api/login accepts unauthenticated user input; flows to DB at users.ts:42.
  ...

[Subagents return]:
  code-reviewer:    Strengths..., Important: Missing progress indicator, Verdict: Approve with fixes
  security-auditor: Strengths..., Critical: Unparameterised SQL at users.ts:42, Verdict: Request changes

[Merge: dedupe, reconcile — Critical wins overall verdict]

You: Hand off to hs-review-receive to apply findings.
```

## The Round-Trip

```
Author → implements
   ↓
hs-review-request (this skill) → picks lanes, dispatches in parallel with brief templates
   ↓
Lane subagents (fresh context, parallel)
  ├─ code-reviewer       (always)
  ├─ security-auditor    (when triggered)
  └─ test-engineer       (when triggered)
   ↓
Author → merges reports, runs hs-review-receive (apply findings)
   ↓
Human → final call
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I wrote it and I know it works — I'll self-review." | Authors are blind to their own assumptions. Fresh context catches what you missed. |
| "The reviewer already has context from this session." | A reviewer that inherits your thread inherits your blind spots. Start fresh. |
| "AI generated this, it's probably fine." | AI code needs more scrutiny, not less — it is confident and plausible even when wrong. |
| "The change is small, skip the reviewer." | Small changes in security-sensitive paths still need scrutiny. Size is not the discriminator. |
| "Dispatch every lane to be thorough." | More lanes ≠ more signal. Mismatched lanes return generic findings and burn capacity. |
| "I'll dispatch one lane now and the next after." | Sequential lanes burn wall-clock and miss cross-lane reconciliation. Fan out in one round. |
| "The brief is in my session — the reviewer can read it." | A reviewer in a fresh context has none of your session. Fill the template explicitly. |

## Red Flags

- Auth / LLM-trust-boundary changes that go out without the security lane.
- Bug fixes that go out without the test lane (no regression test = bug returns).
- Dispatching the reviewer without a spec or ExecPlan to ground the review.
- Re-dispatching before the previous round's Critical / Important findings are resolved.
- Sending the reviewer a diff that spans two unrelated changes — split first (`skills/hs-git/SKILL.md`).
- Sequential lane dispatch when lanes could run in parallel.
- Flattening multi-lane reports into a generic list and losing per-lane context.
- Copying your session history into the brief — that defeats fresh context.

## Verification

Before handing off to `hs-review-receive`:

- [ ] Lane selection matches the diff (no missing-lane gaps; no "just in case" lanes).
- [ ] Brief includes `BASE_SHA`, `HEAD_SHA`, spec path, description, focus, notes.
- [ ] All selected lanes were dispatched in a single `Task` round (parallel, not sequential).
- [ ] Each lane returned a structured report with severity labels and `file:line` citations.
- [ ] Multi-lane reports were merged with dedup, severity reconciliation, and per-lane context preserved.

## See Also

- `skills/hs-review-receive/SKILL.md` — apply the reviewer's findings with technical rigor.
- `agents/code-reviewer.md` — code lane subagent (default).
- `agents/security-auditor.md` — security lane subagent.
- `agents/test-engineer.md` — tests lane subagent.
- `skills/hs-git/SKILL.md` — change sizing and splitting strategies.
- `docs/references/review-checklist.md` — pattern dictionary the reviewer applies.
- `docs/references/security-checklist.md` — OWASP-aligned security baseline.
- `docs/references/performance-checklist.md` — performance review checks.

Brief templates (in this folder):

- `code-reviewer.md` — fill and pass to the `code-reviewer` subagent.
- `security-auditor.md` — fill and pass to the `security-auditor` subagent.
- `test-engineer.md` — fill and pass to the `test-engineer` subagent.
