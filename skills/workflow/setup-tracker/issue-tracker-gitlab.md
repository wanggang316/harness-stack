# Issue tracker: GitLab

Tickets for this project live as GitLab issues in `<group/project>`. Use the [`glab`](https://gitlab.com/gitlab-org/cli) CLI for all operations. Inside a clone of that project `glab` infers it; elsewhere, add `-R <group/project>` to `glab issue` commands and use the URL-encoded path (`group%2Fproject`) in place of `:id` in `glab api` paths. GitLab calls comments "notes" and pull requests "merge requests".

Pass multi-line bodies through a heredoc into a variable, never through a shared temporary file. Run each write as its own command and check its output.

## When a skill says "fetch the ticket"

```bash
glab issue view <n> -F json
glab api "projects/:id/issues/<n>/notes?sort=asc&per_page=100" \
  | jq '.[] | select(.system | not) | {id, author: .author.username, body}'
```

## When a skill says "comment on the ticket"

Prints the new note's id:

```bash
body=$(cat <<'BODY'
...
BODY
)
glab api -X POST "projects/:id/issues/<n>/notes" -f body="$body" | jq .id
```

## When a skill says "update the comment"

```bash
glab api -X PUT "projects/:id/issues/<n>/notes/<id>" -f body="$body" | jq .id
```

## When a skill says "link the PR to the ticket"

Put `Closes #<n>` in the merge request description. GitLab closes the issue when the merge request merges into the default branch.

## When a skill says "publish a ticket"

```bash
glab issue create --title "..." --assignee <username> --label "<state label>,<type label>" --description "$body"
```

Add the labels on every ticket to `--label`.

- **Blocking edge**: native blocking links (Premium/Ultimate) through a quick action: `glab issue note <child> --message "/blocked_by #<blocker>"`. On the free tier, keep a `## Blocked by` section in the description.
- **Sub-ticket**: link the child to the parent (`glab issue create --linked-issues <parent> --link-type relates_to`) and put `Part of #<parent>` at the top of its description.

## When a skill says "search tickets"

```bash
glab issue list --all --search "<terms>" -F json | jq '.[] | {iid, title, state, web_url}'
```

## When a skill says "list the sub-tickets and their blockers"

```bash
glab api "projects/:id/issues/<parent>/links" | jq '.[] | {iid, title, state, link_type}'
glab api "projects/:id/issues/<n>/links" | jq '[.[] | select(.link_type == "is_blocked_by" and .state == "opened") | .iid]'
```

Fall back to `Part of #<parent>` and `## Blocked by` lines in descriptions when links are absent.

## When a skill says "set the state"

Read the issue's labels first, then swap its state label. Remove only the state labels it carries:

```bash
glab issue view <n> -F json | jq '.labels'
glab issue update <n> --label "<new state label>" --unlabel "<old state label>"
```

For done, close the issue and remove its state label: `glab issue close <n>`, then `glab issue update <n> --unlabel "<old state label>"`. To take a closed issue back into the workflow, `glab issue reopen <n>` first.

## When a skill says "set the assignee and labels"

```bash
glab issue update <n> --assignee <username> --label "<label>,<label>" --unlabel "<label>"
```

## When a skill says "list the states and labels"

```bash
glab api "projects/:id/labels?per_page=100" | jq '.[] | {name, color, description}'
glab api user | jq -r .username
```

## When setup creates, renames, or deletes a label

One change per command. A new label uses the color and description in the table below, with the name `workflow.md` gives it. GitLab addresses a label by its URL-encoded name:

```bash
glab api -X POST "projects/:id/labels" -f name="<name>" -f color="#<color>" -f description="<description>" | jq .name
glab api -X PUT "projects/:id/labels/<url-encoded name>" -f new_name="<new name>" | jq .name   # issues keep the label
glab issue list --label "<name>" -F json | jq length
glab api -X DELETE "projects/:id/labels/<url-encoded name>"                                   # only when no open issue carries it
```

| Label | Color | Description |
| --- | --- | --- |
| `backlog` | `ededed` | Workflow state: published, not to start yet |
| `todo` | `c5def5` | Workflow state: ready to start |
| `in-progress` | `1d76db` | Workflow state: being implemented |
| `in-review` | `fbca04` | Workflow state: under review |
| `reviewed` | `0e8a16` | Workflow state: review clean, waits for a merge decision |
| `merging` | `5319e7` | Workflow state: approved to merge |
| `blocked` | `b60205` | Workflow state: needs a person |
| `bug` | `d73a4a` | Something isn't working |
| `enhancement` | `a2eeef` | New feature or request |
| `documentation` | `0075ca` | Improvements or additions to documentation |

## Check access

```bash
glab auth status
glab repo view <group/project>
```
