---
name: review-request
description: Request independent review for nontrivial changes, prepare a complete change snapshot and requirements context, and check report coverage.
---

# review-request

Obtain independent review for the current change. The author prepares inputs and checks coverage; reviewers verify the code. Independent contexts reduce reliance on the author's assumptions.

Use `harness-stack:code-review` to pin the target and review basis. The brief includes the working directory, base/head, agreed uncommitted files and snapshot, expected behavior, project constraints, validation records, and concerns. Supply facts and necessary pointers, or file contents when paths cannot be shared. Reviewers must not depend on the current conversation history.

Pass the brief to `harness-stack:code-review`, which dispatches independent Standards and Spec reviewers. Freeze reviewed files or use an isolated snapshot. This entry point does not dispatch duplicate reviewers.

Add specialist security or test reviews according to risk. Give each additional reviewer a clear scope and retain its evidence and coverage limits. Keep Standards and Spec reports separate.

If `code-review` is unavailable, report the missing review entry point. If subagents are unavailable, report that independent review cannot be obtained. Label author self-review as such; the independent review condition remains incomplete.

Check returned reports for complete scope, version identity, finding locations, and evidence. Request additional review for omissions and reverify affected parts after version changes. A reviewer's success status alone does not prove completion. Preserve unresolved findings and their original basis, and return the complete findings to the author. This skill does not implement fixes or publish reports.
