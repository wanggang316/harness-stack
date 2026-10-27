# Spec mode

Read this when the input is a spec whose work is split into tickets with blocking relationships (the output of `harness-stack:to-spec` plus `harness-stack:to-tickets`, or a parent ticket with sub-tickets). The goal is the whole spec implemented on one **integration branch**, every ticket resolved, and one PR that closes the spec and its tickets.

The tickets are a **task graph**, not a list of steps. At any moment the **frontier** is the set of open tickets whose blockers are all done; work the frontier, in parallel where the host allows it. Read [Working with tickets](../../setup-harness-stack/references/tickets.md) for how to read tickets and their blockers on the configured tracker. If the tickets cannot be read, report it and stop; do not reconstruct them from the spec.

Communicate with subagents through **context pointers** (the spec, ticket references, research notes, commits) rather than copied text, and keep messages short.

## Steps

1. Read the spec and every ticket with its comments, and build the graph from the blocking relationships. Report cycles or tickets outside the spec instead of guessing an order.
2. Optional: run an exploration subagent for research the tickets need (code areas, external docs). It writes markdown notes outside the repository, for example under `~/.harness-stack/<project>/notes/<spec>/`, so implementers can start from them.
3. Create the integration branch from the default branch. If PRs are how the tracker closes work, or the user asks for one, open a draft PR after the first merge in step 5 (a branch with no commits cannot open one); its body closes the spec and each ticket.
4. For each frontier ticket, run an implementer subagent in its own worktree on its own branch, based on the integration branch tip. Each one runs `harness-stack:implement` in single-task mode for its ticket: it moves the ticket to `In Progress`, keeps its workpad, verifies, commits, and merges the integration branch tip into its branch before reporting done. It does not push or open a PR; the integration branch is the delivery.
5. When an implementer finishes, merge its branch into the integration branch with a merger subagent, run the affected checks there, and add a Notes line to the ticket's workpad naming the integration commit.
6. Recompute the frontier and start implementers for tickets that just became unblocked. Without parallel subagents, take frontier tickets one at a time in the same order.
7. When every ticket is merged, run the full validation on the integration branch (step 5 of the skill) and fix integration failures in one implementer pass.
8. Mark the draft PR ready, or open the PR if none exists, with `Closes` lines for the spec and every ticket. Move the spec ticket and each child ticket to `In Review` unless a host owns the transitions. Report the integration branch, the PR, and each ticket's status.
9. Remove the implementer worktrees.

Independent review is not part of this mode: request `harness-stack:code-review` on the integration branch as a separate step.

If a ticket blocks (missing information or a failed dependency), record it in that ticket's workpad, keep working the rest of the frontier, and list blocked tickets and everything they block in the final report.
