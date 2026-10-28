# Task graph mode

Read this when the input is a spec whose work is split into tasks that declare dependencies on each other (for example, a plan's task list with "blocked by" lines, or a task graph a caller passes in). The goal is the whole spec implemented on one **integration branch**, every task done, and one delivery that covers them all.

The tasks are a **graph**, not a list of steps. At any moment the **frontier** is the set of unfinished tasks whose dependencies are all done; work the frontier, in parallel where the host allows it. If the caller gives each task its own progress record or a per-task callback (for example, a command that records progress on that task), use it for that task; otherwise keep one progress record with a section per task.

Communicate with subagents through **context pointers** (the spec, task references, research notes, commits) rather than copied text, and keep messages short.

## Steps

1. Read the spec and every task, and build the graph from the declared dependencies. Report cycles or tasks outside the spec instead of guessing an order.
2. Optional: run an exploration subagent for research the tasks need (code areas, external docs). It saves markdown notes in a directory outside the repository that every later subagent can read, so implementers can start from them.
3. Create the integration branch from the default branch. If the caller authorized a PR, open it as a draft after the first merge in step 5 (a branch with no commits cannot open one).
4. For each frontier task, run an implementer subagent in its own worktree on its own branch, based on the integration branch tip. Each one follows this skill in single-task mode for its task: it keeps the task's progress record, verifies, commits, and merges the integration branch tip into its branch before reporting done. It does not push or open a PR; the integration branch is the delivery.
5. When an implementer finishes, merge its branch into the integration branch with a merger subagent, run the affected checks there, and note the integration commit in the task's progress record.
6. Recompute the frontier and start implementers for tasks that just became unblocked. Without parallel subagents, take frontier tasks one at a time in the same order.
7. When every task is merged, run the full validation on the integration branch (step 5 of the skill) and fix integration failures in one implementer pass.
8. Mark the draft PR ready or open the PR when authorized, and deliver one handoff for the whole graph with each task's status.
9. Remove the implementer worktrees.

If a task blocks (missing information or a failed dependency), record it in that task's progress record, keep working the rest of the frontier, and list blocked tasks and everything they block in the handoff.
