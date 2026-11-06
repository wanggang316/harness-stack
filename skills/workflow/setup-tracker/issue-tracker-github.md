# Issue tracker: GitHub

Tickets for this project live as GitHub issues in `<owner>/<repo>`. Use the `gh` CLI for all operations. Inside a clone of that repository `gh` infers it; elsewhere, add `--repo <owner>/<repo>` to `gh issue` commands. Before the first create of a session in a fork, check the target with `gh repo view --json nameWithOwner`.

Feed multi-line bodies through a heredoc on stdin, never through a shared temporary file: if an earlier step failed, a stale file would be published. Run each write as its own command and check its output.

## Workflow

| State | Label |
| --- | --- |
| backlog | `Backlog` |
| todo | `Todo` |
| in-progress | `In Progress` |
| in-review | `In Review` |
| reviewed | `Reviewed` |
| merging | `Merging` |
| needs-human | `agent-blocked` |
| done | the issue is closed |

An open issue carries exactly one state label; without one it has no state.

- **Assignee**: `<login>`
- **Type labels** (one per ticket, the one that fits): `bug`, `enhancement`, `documentation`
- **Labels on every ticket**: none

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

## When a skill says "link the PR to the ticket"

Put `Closes #<n>` (or `Closes <owner>/<repo>#<n>` across repositories) in the PR body. GitHub links them and closes the issue when the PR merges into the default branch.

## When a skill says "publish a ticket"

```bash
gh issue create --title "..." --assignee <login> --label "<state label>,<type label>" --body-file - <<'BODY'
...
BODY
```

Add the labels on every ticket to `--label`.

- **Blocking edge**: `gh issue create --blocked-by <n>,<n>` or `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where the database id comes from `gh api repos/<owner>/<repo>/issues/<n> --jq .id`. Without dependency support, keep a `## Blocked by` section in the body.
- **Sub-ticket**: `gh issue create --parent <parent>` or `gh issue edit <parent> --add-sub-issue <child>` (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`. Otherwise put `Part of #<parent>` at the top of the child body.

## When a skill says "search tickets"

```bash
gh issue list --state all --search "<terms>" --limit 50 --json number,title,state,stateReason,url
```

## When a skill says "list the sub-tickets and their blockers"

```bash
gh api "repos/<owner>/<repo>/issues/<parent>/sub_issues" --jq '.[] | {number, title, state}'
gh issue view <n> --json blockedBy --jq '[.blockedBy.nodes[] | select(.state == "OPEN") | .number]'
```

Fall back to `Part of #<parent>` and `## Blocked by` lines in issue bodies when native relationships are absent.

## When a skill says "set the state"

Read the issue's labels first, then swap its state label in one command. Remove only the state labels it carries:

```bash
gh issue view <n> --json labels --jq '[.labels[].name]'
gh issue edit <n> --add-label "<new state label>" --remove-label "<old state label>"
```

For done, close the issue and remove its state label: `gh issue close <n> --reason completed`, then `gh issue edit <n> --remove-label "<old state label>"`. To take a closed issue back into the workflow, `gh issue reopen <n>` first.

## When a skill says "set the assignee and labels"

```bash
gh issue edit <n> --add-assignee <login> --add-label "<label>,<label>" --remove-label "<label>"
```

## When a skill says "list the states and labels"

```bash
gh label list --limit 500 --json name,color,description
gh api user --jq .login
```

## When a skill says "create a missing state or label"

One label per command. State labels use the color in this table; type labels use GitHub's default color and description:

```bash
gh label create "<name>" --color <color> --description "<description>"
```

| Label | Color | Description |
| --- | --- | --- |
| `Backlog` | `ededed` | Workflow state: published, not to start yet |
| `Todo` | `c5def5` | Workflow state: ready to start |
| `In Progress` | `1d76db` | Workflow state: being implemented |
| `In Review` | `fbca04` | Workflow state: under review |
| `Reviewed` | `0e8a16` | Workflow state: review clean, waits for a merge decision |
| `Merging` | `5319e7` | Workflow state: approved to merge |
| `agent-blocked` | `b60205` | Workflow state: needs a person |
| `bug` | `d73a4a` | Something isn't working |
| `enhancement` | `a2eeef` | New feature or request |
| `documentation` | `0075ca` | Improvements or additions to documentation |

## Check access

```bash
gh auth status
gh repo view <owner>/<repo> --json nameWithOwner
```
