---
allowed-tools: Bash(gh pr view:*), Bash(gh pr checks:*), Bash(gh pr diff:*), Bash(gh api:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(jq:*), Skill(harness-stack:hs-review-receive)
description: Scan a PR for new review activity and follow up via hs-review-receive when actionable findings appear
model: claude-haiku-4-5
argument-hint: "[PR number — defaults to the PR for the current branch]"
---

## Context

- Branch: !`git branch --show-current 2>/dev/null || echo "(detached)"`
- Argument: $ARGUMENTS

## Purpose

A single watch tick. Run periodically (e.g. wrap with `/loop 10m /hs-pr-watch <pr>`)
or schedule via `ScheduleWakeup` to keep tabs on a PR after it's opened. Each tick
gathers the current state of the PR, decides whether anything actionable arrived,
and either escalates to `hs-review-receive` or reports a quiet status.

This command is **not** a polling loop on its own — it does one scan and exits.

## Resolve target PR

1. If `$ARGUMENTS` is a number, use it as the PR number.
2. Otherwise, resolve the PR for the current branch:
   ```bash
   gh pr view --json number,url,headRefName,baseRefName,state,isDraft,mergeable -q .
   ```
   - If no PR exists for this branch, **stop** and tell the user. Suggest opening one (e.g. via the `hs-pr` skill).
3. Pin the PR number in a local variable; reuse it for every subsequent `gh` call.

## Gather state

Run these in parallel, using the resolved PR number `<n>`:

```bash
gh pr view <n> --json number,url,state,isDraft,mergeable,reviewDecision,headRefOid,baseRefName,updatedAt
gh pr view <n> --json reviews,comments,reviewThreads
gh pr checks <n>
```

Capture:

- **Top-level state**: `state` (OPEN / MERGED / CLOSED), `isDraft`, `mergeable`,
  `reviewDecision` (APPROVED / CHANGES_REQUESTED / REVIEW_REQUIRED / null).
- **Reviews**: latest review per reviewer, focusing on `CHANGES_REQUESTED` and
  `COMMENTED` states with non-empty bodies. Ignore old superseded reviews.
- **Review threads**: unresolved threads (`isResolved: false`) with their file path,
  line number, and body.
- **Issue comments**: only those posted after the PR's last `headRefOid` change
  (i.e. comments on the current revision). Older comments may already be addressed.
- **Checks**: any in `FAILURE`, `CANCELLED`, or `TIMED_OUT` conclusion.

## Triage

Classify the gathered signals into one of three buckets:

### A. Terminal — stop watching

Report and exit without further scheduling if:

- `state` is `MERGED` → say "PR merged, watch ends."
- `state` is `CLOSED` → say "PR closed without merge, watch ends."

### B. Actionable — hand off to `hs-review-receive`

Trigger follow-up if any of:

- `reviewDecision` is `CHANGES_REQUESTED`.
- One or more unresolved review threads with substantive body text.
- One or more failing checks **and** the failure surface points to code (not infra
  flake — judge from check name and output snippet; if unclear, treat as actionable).
- Issue comments on the current `headRefOid` that contain explicit review feedback
  (questions, requested changes, blocker callouts). Pure approval / chatter does
  not count.

When triggering follow-up:

1. Assemble a findings bundle with:
   - PR number and URL
   - Current `headRefOid`
   - List of unresolved threads (file:line + body)
   - List of relevant comments (author + body excerpt)
   - List of failing checks (name + brief reason)
2. Invoke `hs-review-receive` and pass the bundle as the source. The skill owns
   how to evaluate each finding (agree, push back, defer) and how to propose
   changes — this command does not modify code itself.

### C. Quiet — no action needed

If none of the actionable conditions hit:

- Print a one-line status: PR number, `reviewDecision`, mergeable state, check
  summary (e.g. `12 passing, 0 failing`), `updatedAt`.
- Exit. Do not invoke `hs-review-receive`.

## Output contract

Each tick prints exactly one of:

```
WATCH:TERMINAL   <pr-url>  <state>           # merged or closed
WATCH:ACTION     <pr-url>  <handed-off>      # findings handed to hs-review-receive
WATCH:QUIET      <pr-url>  <one-line-status> # nothing to do this tick
WATCH:ERROR      <reason>                    # could not gather state
```

The single-line prefix is so wrappers (`/loop`, `ScheduleWakeup`) can grep the
result and decide whether to keep scheduling.

## Important

- **Do not modify code** in this command. Modifications belong to
  `hs-review-receive` so review and triage stay separated.
- **Do not approve, dismiss, or merge the PR** under any circumstance.
- **Do not re-trigger reviewers**. If reviewers haven't responded yet, that's
  the user's call, not the watcher's.
- **Idempotent**. Running the command twice in a row on an unchanged PR must
  produce the same `WATCH:QUIET` output — never escalate the same finding twice
  without new state.
- **Auth failures, rate limits, network errors** → `WATCH:ERROR` with the cause.
  Never silently swallow — the loop wrapper needs to see it.
