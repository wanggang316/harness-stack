# Issue tracker: GitHub

Tickets for this project live as GitHub issues in `<owner>/<repo>`. Use the `gh` CLI for all operations. Inside a clone of that repository `gh` infers it; elsewhere, add `--repo <owner>/<repo>` to `gh issue` commands. Before the first create of a session in a fork, check the target with `gh repo view --json nameWithOwner`.

States are labels on open issues (see the state labels file). An open issue carries at most one state label; an open issue without one is in `Backlog`. `Done` is a closed issue (completed), `Canceled` a closed issue (not planned).

Feed multi-line bodies through a heredoc on stdin, never through a shared temporary file: if an earlier step failed, a stale file would be published. Run each write as its own command and check its output.

## When a skill says "fetch the ticket"

```bash
gh issue view <n> --json number,title,body,state,stateReason,labels,assignees,url
gh api "repos/<owner>/<repo>/issues/<n>/comments" --paginate \
  --jq '.[] | {id, url: .html_url, author: .user.login, body}'
```

## When a skill says "comment on the ticket"

Prints the new comment's id:

```bash
gh api "repos/<owner>/<repo>/issues/<n>/comments" -F body=@- --jq .id <<'BODY'
...
BODY
```

## When a skill says "update the comment"

```bash
gh api -X PATCH "repos/<owner>/<repo>/issues/comments/<id>" -F body=@- --jq .html_url <<'BODY'
...
BODY
```

## When a skill says "move the ticket to a state"

```bash
gh issue edit <n> --add-label "<new>" --remove-label "<old>"   # remove every other state label present
gh issue close <n> --reason completed                           # Done
gh issue close <n> --reason "not planned"                       # Canceled
gh issue reopen <n>                                             # from Done or Canceled; then add the state label
```

## When a skill says "link the PR to the ticket"

Put `Closes #<n>` (or `Closes <owner>/<repo>#<n>` across repositories) in the PR body. GitHub links them and closes the issue when the PR merges into the default branch.

## When a skill says "publish a ticket"

```bash
gh issue create --title "..." --label "<state label>" --body-file - <<'BODY'
...
BODY
```

- **Blocking edge**: `gh issue create --blocked-by <n>,<n>` or `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where the database id comes from `gh api repos/<owner>/<repo>/issues/<n> --jq .id`. Without dependency support, keep a `## Blocked by` section in the body.
- **Sub-ticket**: `gh issue create --parent <parent>` or `gh issue edit <parent> --add-sub-issue <child>` (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`. Otherwise put `Part of #<parent>` at the top of the child body.

## When a skill says "list the sub-tickets and their blockers"

```bash
gh api "repos/<owner>/<repo>/issues/<parent>/sub_issues" --jq '.[] | {number, title, state}'
gh issue view <n> --json blockedBy --jq '[.blockedBy.nodes[] | select(.state == "OPEN") | .number]'
```

Fall back to `Part of #<parent>` and `## Blocked by` lines in issue bodies when native relationships are absent.

## Setup

```bash
gh label list --limit 200 --json name,color,description
gh label create "<name>" --color <hex> --description "<meaning>"
```

Suggested colors: Backlog `EDEDED`, Todo `C5DEF5`, In Progress `1D76DB`, In Review `FBCA04`, Reviewed `0E8A16`, Merging `5319E7`. `Done` and `Canceled` need no label.
