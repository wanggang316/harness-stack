---
name: code-review
description: Review the changes since a fixed point (commit, branch, tag, PR, or merge-base) along two axes, Standards and Spec, in parallel independent subagents, and return both reports with a verdict. Use to review a branch, a PR, work in progress, or "review since X", including re-review after fixes.
metadata:
  credits:
    skill: code-review
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/code-review/SKILL.md"
---

# code-review

Two-axis review of one pinned change:

- **Standards**: does the code follow this repository's documented standards, and is it correct?
- **Spec**: does the code do what the originating requirements asked for?

Both axes run as parallel subagents with fresh contexts so neither pollutes the other; this skill pins the target, gathers the basis, aggregates the two reports without merging them, and returns the result. It never edits the reviewed code.

## 1. Pin the fixed point

Use what the user or host named: a commit SHA, branch, tag, `main`, `HEAD~5`, or a PR (its actual base and head). When nothing was named, use the merge-base of `HEAD` with the default branch if the current branch is a feature branch; ask only when that is ambiguous.

Capture the diff command once, `git diff <fixed-point>...HEAD` (three dots: against the merge-base), and the commit list, `git log <fixed-point>..HEAD --oneline`. For an explicit comparison between two commits, use their endpoint diff instead. Resolve names to SHAs so moving references cannot change the target.

For work in progress, include the agreed staged, unstaged, and untracked files (`git diff`, `git diff --cached`, `git ls-files --others --exclude-standard`), and record their hashes. Ask about changes whose ownership is unclear rather than including them silently.

Fail here, not inside two subagents, when the fixed point does not resolve (`git rev-parse`) or the diff is empty. An empty diff is not an approval.

## 2. Find the spec

Look for the originating requirements in this order:

1. Requirements the caller supplied as text or a reference it can read.
2. A path the user passed.
3. A spec file under `docs/`, `specs/`, or `.scratch/` that matches the branch or feature, or a spec section in the PR body.
4. Ask the user. If there is none, the Spec axis reports `Incomplete: no spec available`.

## 3. Find the standards

Collect every file that documents how code is written here: `AGENTS.md` or `CLAUDE.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md`, active decisions in `docs/adr/`, and directory-level instructions for the touched paths. The Standards axis also carries the [smell baseline](references/smell-baseline.md), which applies even when the repository documents nothing; a documented repository standard always overrides it.

## 4. Dispatch both axes in parallel

Start two read-only subagents together (`harness-stack:code-reviewer` or the host's generic subagent) and wait for both. Give each only the shared snapshot and its own axis; neither sees the author's conversation or the other axis's reasoning. Each brief contains:

- The working directory, the pinned diff command, the commit list, and any uncommitted files with their hashes.
- The absolute path of the [Reviewer guide](references/reviewer-guide.md), which defines the method, severities, and report format.
- **Standards**: the standards files from step 3 and the full text of the smell baseline (the subagent has no other access to it).
- **Spec**: the spec's path or content, including its acceptance criteria.
- The validation the author reports (commands, evidence files) as claims to check, not facts.
- For a re-review: the previous findings and the author's disposition of each, so the reviewer checks every one before looking at new changes.

Without a spec, run only Standards. If subagents cannot be created, report the independent review as not done; a self-review is not a substitute. If the host runs subagents only serially, still give each axis a fresh context.

## 5. Aggregate

Check that each report covers the pinned snapshot; if the code changed during review, report the coverage as invalid and review again. If one axis failed, keep the other report and mark the failed axis `Incomplete`.

Present the reports under `## Standards` and `## Spec`, verbatim or lightly cleaned. Do not merge or rerank findings across axes: a change can follow every standard and implement the wrong thing, or do exactly what was asked and break the conventions, and separate reports keep one from masking the other. End with one line per axis: finding count, worst issue, and coverage limits.

Derive the overall verdict from the two conclusions without averaging them:

| Verdict | When |
| --- | --- |
| `clean` | Both axes `No blocking findings`, or Standards clean and the user accepted that there is no spec |
| `issues` | Either axis has unresolved Critical or Important findings (`Request changes`) |
| `incomplete` | No blocker is proven, but an axis is `Incomplete` (missing spec, failed reviewer, invalid coverage) |

`clean` is a review result, not proof of tests, merge, or production behavior.

## 6. Return the result

Return the two axis reports, the per-axis summary line, the verdict, and the reviewed head SHA. Deliver them the way the caller specified (for example, a command that posts them somewhere or a delivery format), otherwise as the final message in the conversation. Publish review comments to a PR only when asked, after checking that the PR head still matches the reviewed SHA.
