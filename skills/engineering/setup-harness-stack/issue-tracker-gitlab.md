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
glab issue create --title "..." --description "$body"
```

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

## Check access

```bash
glab auth status
glab repo view <group/project>
```
