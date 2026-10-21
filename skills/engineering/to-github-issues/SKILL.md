---
name: to-github-issues
description: Split a plan, spec, existing issue, or conversation into tracer-bullet GitHub issues with native blocked-by and sub-issue relationships.
disable-model-invocation: true
---

# to-github-issues

Split a plan into **issues**. Each issue is a tracer-bullet vertical slice and declares which issues **block** it.

## 1. Resolve the target

Read `~/.harness-stack/<owner>.<repo>/`, deriving `<owner>/<repo>` from `origin`:

- `issue-tracker.md` supplies the target repository. Fall back to the repository at `origin` when absent. An explicit user target takes priority.
- `triage-labels.md` maps triage roles to labels. Apply no triage label when absent.

Confirm that `gh` is authenticated and record the target's existing labels. Use only existing labels. List any desired missing labels in step 5 for the user to decide.

## 2. Gather context

Use the conversation's existing content. For an issue number or URL, run `gh issue view <n> --repo "$repo" --comments` and read the full body and comments; that issue is the **parent**. Read a supplied file in full.

## 3. Explore the codebase as needed

Read relevant code if not already inspected. Use the project's domain vocabulary in titles and descriptions. Look for prefactoring opportunities: make the change easy, then make the easy change.

## 4. Draft vertical slices

- Each slice is a narrow, complete path through all relevant layers, such as schema, API, UI, and tests. It can be demonstrated or verified independently when complete.
- Each slice fits in a fresh context window.
- Put prefactors first.
- Specify each issue's **blocking edges**: issues that must be completed first.
- Acceptance criteria must not already hold at the starting commit.

**Broad refactors are an exception.** For a mechanical change spanning the codebase, such as a column rename or shared type change, use **expand–contract** ordering. Expand first so old and new forms coexist. Migrate by package or directory, one issue per batch, each blocked by expand. Contract last by removing the old form, blocked by every migration batch. If individual batches cannot stay green independently, use one integration branch and make each batch block a final integrate-and-verify issue.

## 5. Confirm with the user

Present a numbered list with **Title**, **Blocked by**, **What it delivers**, and **Labels** for each issue. Ask whether granularity and blocking edges are correct, and whether to combine or split issues. Iterate until the user explicitly agrees before publishing.

## 6. Publish

Create issues in dependency order, blockers first. Keep body files in a temporary directory outside the repository. Apply the label mapped to `agent-todo` when configured. After creating each issue, add native GitHub blocked-by relationships to its blockers. If the source is an existing issue, also attach it as a sub-issue.

- If relationship creation fails, continue publishing; the body already records dependencies under Blocked by. Report failed relationships at the end.
- If issue creation fails, stop and report the issues already created.
- Do not edit or close the parent issue.

<issue-template>

## Parent

#<parent number> (include only when the source is an existing issue; otherwise omit this section)

## What to build

The end-to-end behavior this slice delivers, from the user's perspective, not a layer-by-layer implementation checklist.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- #<blocker number>, or "None (can start immediately)"

</issue-template>

Avoid specific file paths or code snippets because they quickly become stale. Exception: when a prototype fragment, such as a state machine, schema, or type shape, expresses a decision more precisely than prose, inline only the decision-bearing part and identify its prototype origin.

## 7. Report

List each issue's number, title, URL, and blockers in dependency order. Mark issues that can be started immediately and list native relationships that could not be created.
