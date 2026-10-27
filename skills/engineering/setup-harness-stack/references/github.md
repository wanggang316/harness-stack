# Tracker: GitHub

Use the `gh` CLI. Inside a clone, `gh` infers the repository; when `issue-tracker.md` names a different repository, add `--repo <owner>/<repo>` to `gh issue` commands and use that path in `gh api` calls. Before the first create of a session in a fork, check the target with `gh repo view --json nameWithOwner`.

## Read

```bash
gh issue view <n> --json number,title,body,state,stateReason,labels,assignees,url
gh api "repos/<owner>/<repo>/issues/<n>/comments" --paginate \
  --jq '.[] | {id, url: .html_url, author: .user.login, body}'
```

The current state is the state label on an open issue, `Done` or `Canceled` for a closed one (`stateReason` `COMPLETED` / `NOT_PLANNED`). An open issue without a state label is in `Backlog`.

## Comment

Create a comment and print its id:

```bash
gh api "repos/<owner>/<repo>/issues/<n>/comments" -F body=@- --jq .id <<'BODY'
...
BODY
```

Update a comment by id:

```bash
gh api -X PATCH "repos/<owner>/<repo>/issues/comments/<id>" -F body=@- --jq .html_url <<'BODY'
...
BODY
```

## State

```bash
gh issue edit <n> --add-label "In Review" --remove-label "In Progress"   # remove every other state label present
gh issue close <n> --reason completed       # Done
gh issue close <n> --reason "not planned"   # Canceled
gh issue reopen <n>                          # back to an open state; then set its label
```

## Link a change

Put `Closes #<n>` (or `Closes <owner>/<repo>#<n>` across repositories) in the PR body. GitHub links the PR and closes the issue when the PR merges into the default branch.

## Create

```bash
gh issue create --title "..." --label "Backlog" --body-file - <<'BODY'
...
BODY
```

- **Blockers**: `gh issue create --blocked-by <n>,<n>` or `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where the database id comes from `gh api repos/<owner>/<repo>/issues/<n> --jq .id` (not the number or `node_id`). Without dependency support, keep a `## Blocked by` section in the body.
- **Sub-issues**: `gh issue create --parent <parent>` or `gh issue edit <parent> --add-sub-issue <child>` (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`. Otherwise put `Part of #<parent>` at the top of the child body.
- **Open blockers**: `gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by` (0 means startable).

## Setup

```bash
gh label list --limit 200 --json name,color,description
gh label create "In Review" --color FBCA04 --description "Implementation delivered; waiting for code review"
```

Create only labels the user approved. Suggested colors: Backlog `EDEDED`, Todo `C5DEF5`, In Progress `1D76DB`, In Review `FBCA04`, Reviewed `0E8A16`, Merging `5319E7`. `Done` and `Canceled` need no label.
